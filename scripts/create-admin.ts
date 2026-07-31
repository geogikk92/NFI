// Създава администратор в ЖИВАТА база — или повишава съществуващ профил.
//
// Защо съществува: ролята ADMIN се задава на точно две места в проекта —
// в сийда (prisma/seed.ts:55), който ОТКАЗВА да пише в нелокална база, и в
// проверката на пазача (lib/admin/guard.ts:74), която само чете. Тоест до
// днес в продукция нямаше как да се появи втори администратор освен през
// ръчна заявка към базата.
//
// Употреба:
//
//   # нов админ с генерирана парола — показва се ВЕДНЪЖ
//   DATABASE_URL="…" ADMIN_CREATE=da npx tsx scripts/create-admin.ts vasilena@example.com
//
//   # с име
//   DATABASE_URL="…" ADMIN_CREATE=da ADMIN_NAME="Василена" npx tsx scripts/create-admin.ts …
//
//   # със своя парола (през среда, НЕ като аргумент)
//   DATABASE_URL="…" ADMIN_CREATE=da ADMIN_PASSWORD="…" npx tsx scripts/create-admin.ts …
//
// ПАРОЛАТА НЕ СЕ ПРИЕМА КАТО АРГУМЕНТ — аргументите влизат в историята на
// терминала и се четат от `ps` от всеки друг процес на машината. Същото
// правило като в scripts/set-admin-password.ts.
//
// ADMIN_CREATE=da е нарочна спирачка. Тази команда раздава достъп до ЛИЧНИ
// ДАННИ — имена, телефони и документи за превод. Такова нещо не бива да се
// случва от подранил Enter или от копнат ред.

import { randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth/password";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../lib/auth/register";

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/** 24 знака base64url ≈ 143 бита. */
function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    fail(
      "Липсва имейл.\n" +
        '  DATABASE_URL="…" ADMIN_CREATE=da npx tsx scripts/create-admin.ts kum@example.com',
    );
  }

  // Проста проверка за форма, не за съществуване. Пази от очевидна
  // печатна грешка, която иначе създава недостъпен профил с права.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(`„${email}" не прилича на имейл. Провери за печатна грешка.`);
  }

  if (!process.env.DATABASE_URL) {
    fail("Липсва DATABASE_URL. Подай го пред командата.");
  }

  if (process.env.ADMIN_CREATE !== "da") {
    fail(
      "Липсва потвърждение.\n" +
        "  Тази команда дава достъп до личните данни на клиентите.\n" +
        "  Добави ADMIN_CREATE=da пред нея, ако наистина това искаш.",
    );
  }

  const supplied = process.env.ADMIN_PASSWORD;
  const password = supplied ?? generatePassword();

  if (supplied) {
    if (supplied.length < MIN_PASSWORD_LENGTH) {
      fail(`Паролата е под ${MIN_PASSWORD_LENGTH} знака.`);
    }
    if (supplied.length > MAX_PASSWORD_LENGTH) {
      fail(`Паролата е над ${MAX_PASSWORD_LENGTH} знака.`);
    }
  }

  const passwordHash = await hashPassword(password);
  const name = process.env.ADMIN_NAME?.trim() || null;

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true, name: true, deletedAt: true },
  });

  if (existing?.deletedAt) {
    fail(
      `Профилът ${existing.email} е МЕКО ИЗТРИТ.\n` +
        "  Възстановяването му е решение за човек, не за скрипт: изтритият\n" +
        "  профил може да е бил закрит по искане на самия клиент (GDPR).",
    );
  }

  // Транзакция заедно със следата: правата не бива да се раздават без
  // запис кой ги е раздал. Същото правило като в целия админ панел.
  const result = await db.$transaction(async (tx) => {
    if (existing) {
      const before = { role: existing.role, name: existing.name };

      const user = await tx.user.update({
        where: { id: existing.id },
        data: {
          role: "ADMIN",
          passwordHash,
          ...(name ? { name } : {}),
          // Профилът е създаден на ръка от оператора, тоест адресът е
          // потвърден извън сайта. Без това полето остава празно и всяка
          // бъдеща проверка за потвърден имейл го спъва.
          emailVerified: new Date(),
        },
        select: { id: true, email: true, role: true, name: true },
      });

      await tx.auditLog.create({
        data: {
          action: "admin.promote",
          entity: "User",
          entityId: user.id,
          actorEmail: "scripts/create-admin.ts",
          before,
          after: { role: user.role, name: user.name },
        },
      });

      return { user, created: false };
    }

    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "ADMIN",
        // Езикът на панела е български независимо от това поле — то важи
        // за публичната част и за писмата.
        locale: "bg",
        emailVerified: new Date(),
      },
      select: { id: true, email: true, role: true, name: true },
    });

    await tx.auditLog.create({
      data: {
        action: "admin.create",
        entity: "User",
        entityId: user.id,
        actorEmail: "scripts/create-admin.ts",
        after: { email: user.email, role: user.role },
      },
    });

    return { user, created: true };
  });

  // Старите сесии падат: повишен профил не бива да продължи с права,
  // получени преди повишаването, а сменената парола не бива да остави
  // влезли сесии.
  const { count } = await db.session.deleteMany({
    where: { userId: result.user.id },
  });

  console.log(
    `\n✓ ${result.created ? "Създаден" : "Повишен"} администратор: ${result.user.email}`,
  );
  if (count > 0) console.log(`  Прекратени стари сесии: ${count}.`);

  if (!supplied) {
    console.log(
      "\n  Паролата се показва ВЕДНЪЖ и не се пази никъде:\n\n" +
        `      ${password}\n\n` +
        "  Дай я на човека по сигурен път и го помоли да я смени.\n" +
        "  Загубиш ли я: npm run admin:password -- " +
        `${result.user.email}\n`,
    );
  }

  // ADMIN_EMAIL е ОГРАНИЧИТЕЛ, не право за достъп (виж коментара в
  // lib/admin/guard.ts). Зададен на друг адрес, той затваря панела за
  // новия админ — и това е най-объркващият възможен резултат: профилът
  // съществува, паролата работи, а /admin дава 404.
  const restrictTo = process.env.ADMIN_EMAIL?.trim();
  if (restrictTo && restrictTo.toLowerCase() !== result.user.email) {
    console.warn(
      `\n  ⚠ ВНИМАНИЕ: ADMIN_EMAIL е зададен на ${restrictTo}.\n` +
        `    Докато е така, ${result.user.email} НЯМА да влезе в панела —\n` +
        "    ще получи 404, все едно го няма. Махни променливата от\n" +
        "    средата на сайта (Vercel), за да важи ролята.\n",
    );
  } else {
    console.log(
      "\n  Провери и в средата на сайта: ако ADMIN_EMAIL е зададен там на\n" +
        "  друг адрес, този профил ще получава 404 въпреки ролята.\n",
    );
  }
}

main()
  .catch((error) => {
    console.error("\n✗ Неуспех:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
