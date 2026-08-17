// Изчиства следите от предишни end-to-end пускания.
//
//   npm run e2e:clean        (вика се и сам от e2e/run.mjs)
//
// ─────────────────────────────────────────────────────────────────────────
//  ЗАЩО Е НУЖНО
// ─────────────────────────────────────────────────────────────────────────
// Проверките СЪЗДАВАТ записи: сертификат, заявка за материал, абонат. Част
// от тях се блъскат в уникални ограничения при второто пускане — например
// `unique(userId, courseId)` при сертификатите значи, че един курсист може
// да има само един сертификат за курс. Второто пускане пада с
// „вече има сертификат", което ИЗГЛЕЖДА като дефект в кода, а е остатък от
// първото.
//
// Затова преди всяко пускане базата се връща в познато състояние. Тук се
// трие САМО създаденото от тестове — разпознава се по маркера „e2e".
//
// ВНИМАНИЕ: скриптът отказва да работи срещу нелокална база. Изтриване по
// шаблон върху продукционни данни е точно видът инцидент, срещу който
// съществува assertLocalDatabase.

import { db } from "../lib/db";
import { assertLocalDatabase } from "../lib/db-target";
import { hashPassword } from "../lib/auth/password";
import { RATE_ACTIONS } from "../lib/rate-limit";
import { DEV_PASSWORD, SEEDED_ACCOUNTS } from "../lib/auth/dev-password";

/** Маркерът, който харнията слага на всичко създадено от тестове. */
const MARK = "e2e";
const TEST_EMAIL_DOMAIN = "@e2e.local";

async function main() {
  assertLocalDatabase({
    what: "Чистенето на остатъци от end-to-end проверки",
    why:
      "трие записи ПО ШАБЛОН (име съдържа „e2e“, имейл на @e2e.local). " +
      "Върху жива база това е точно видът изтриване, което не се връща.",
  });

  const removed: Record<string, number> = {};

  // Сертификати — по името на притежателя (unique(userId, courseId) е
  // причината изобщо да се чисти).
  removed["сертификати"] = (
    await db.certificate.deleteMany({
      where: { holderName: { contains: MARK } },
    })
  ).count;

  // Заявки за материали и абонати — по имейл домейна на тестовете.
  removed["заявки за материали"] = (
    await db.downloadGrant.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    })
  ).count;

  removed["абонати"] = (
    await db.newsletterSubscriber.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    })
  ).count;

  removed["съгласия"] = (
    await db.consentLog.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    })
  ).count;

  // Отзиви, ако някой тест ги създава.
  removed["отзиви"] = (
    await db.review.deleteMany({
      where: { authorName: { contains: MARK } },
    })
  ).count;

  // Медия от проверката на библиотеката (mediya.mjs). Първо се откачат
  // кориците: coverMediaId няма foreign key и изтритата медия би оставила
  // висящ идентификатор върху СИЙДНАТ курс.
  const testMedia = await db.media.findMany({
    where: { key: { contains: MARK } },
    select: { id: true },
  });
  if (testMedia.length > 0) {
    const ids = testMedia.map((row) => row.id);
    await db.course.updateMany({
      where: { coverMediaId: { in: ids } },
      data: { coverMediaId: null },
    });
    removed["медия"] = (
      await db.media.deleteMany({ where: { id: { in: ids } } })
    ).count;
  }

  // Материали, ако проверката е паднала преди собственото си чистене.
  removed["материали"] = (
    await db.freeMaterial.deleteMany({
      where: { slug: { contains: MARK } },
    })
  ).count;

  // Профили, създадени от проверката за регистрация.
  removed["профили"] = (
    await db.user.deleteMany({
      where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
    })
  ).count;

  // Одитната следа от изтритото вече сочи в нищото.
  removed["записи в дневника"] = (
    await db.auditLog.deleteMany({
      where: { actorEmail: { endsWith: TEST_EMAIL_DOMAIN } },
    })
  ).count;

  // ─────────────────────────────────────────────────────────────────────
  //  БРОЯЧИТЕ НА ОГРАНИЧИТЕЛЯ — най-коварният остатък
  // ─────────────────────────────────────────────────────────────────────
  // vhod.mjs НАРОЧНО опитва вход с грешна парола, за да провери, че не
  // минава. Всеки такъв опит е ред в AuditLog, а входът се заключва при
  // 10 неуспеха в прозореца (LOGIN_MAX_FAILURES в lib/auth/login-db.ts).
  //
  // Тоест след няколко пробега ВСИЧКИ проверки почват да падат — вярната
  // парола спира да работи и провалът изглежда точно като счупен вход.
  // Веднъж се натрупаха 375 такива реда и осем от единайсетте проверки
  // паднаха, без нито един ред код да е сгрешен. (05.08.2026.)
  //
  // Тези редове са БРОЯЧИ, не история: дневникът в админа и без това ги
  // изключва (TECHNICAL_ACTIONS в lib/admin/audit-log.ts). Затова се
  // трият изцяло, а не по маркер — иначе неуспехите, записани с истински
  // имейл, остават.
  removed["броячи на ограничителя"] = (
    await db.auditLog.deleteMany({
      where: { action: { in: Object.values(RATE_ACTIONS) } },
    })
  ).count;

  // ─────────────────────────────────────────────────────────────────────
  //  ПАРОЛАТА НА ТЕСТОВИТЕ ПРОФИЛИ
  // ─────────────────────────────────────────────────────────────────────
  // Сийдът НАРОЧНО не пипа съществуваща парола (prisma/seed.ts:37-48):
  // повторен сийд върху база, в която Василена вече си е задала истинска
  // парола, би я върнал на стойността от онзи файл — а тя е публикувана
  // в хранилището. Решението е вярно и не се пипа.
  //
  // Но следствието е, че НИЩО не гарантира паролата, с която десетте
  // проверки влизат. Разминае ли се веднъж — например защото някой е
  // пробвал `npm run admin:password`, докато е гледал админа — всичките
  // почват да падат с „вярна парола не праща към /admin", което изглежда
  // точно като счупен вход. Точно това стана на 17.08.2026 и отне час.
  //
  // Затова тук се ВЪЗСТАНОВЯВА познатото състояние. Безопасно е само
  // защото assertLocalDatabase по-горе вече е отказал нелокална база —
  // без нея това би било връщане на публична парола върху жив профил.
  const hash = await hashPassword(DEV_PASSWORD);
  const reset = await db.user.updateMany({
    where: { email: { in: [...SEEDED_ACCOUNTS] } },
    data: { passwordHash: hash },
  });
  if (reset.count > 0) {
    console.log(
      `· Паролата на тестовите профили е върната на познатата (${reset.count} профила).`,
    );
  }

  await db.$disconnect();

  const total = Object.values(removed).reduce((sum, n) => sum + n, 0);
  if (total === 0) {
    console.log("· Няма остатъци от предишни пускания.");
    return;
  }

  const parts = Object.entries(removed)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label}: ${count}`);
  console.log(`· Изчистени остатъци — ${parts.join(", ")}.`);
}

main().catch(async (error) => {
  console.error("Чистенето се провали:", error);
  await db.$disconnect();
  process.exit(1);
});
