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
