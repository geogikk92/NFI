// Задава или сменя паролата на потребител. Единственият път до първия вход
// в админа на живия сайт.
//
// Защо съществува: сийдът не се пуска в продукция (отказва при
// NODE_ENV=production и създава примерни данни), а човек без парола не може
// да влезе никога. Тази разлика остана скрита, докато /admin се отваряше без
// проверка.
//
// Употреба:
//
//   # с генерирана парола — показва се ВЕДНЪЖ и не се пази никъде
//   DATABASE_URL="…" npx tsx scripts/set-admin-password.ts admin@nfi.local
//
//   # със своя парола — през среда, НЕ като аргумент
//   DATABASE_URL="…" ADMIN_PASSWORD="…" npx tsx scripts/set-admin-password.ts admin@nfi.local
//
// Паролата НЕ се приема като аргумент нарочно: аргументите влизат в
// историята на терминала и се виждат в `ps` от всеки друг процес на машината.

import { randomBytes } from "node:crypto";
import { db } from "../lib/db";
import { hashPassword } from "../lib/auth/password";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../lib/auth/register";

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/**
 * Генерирана парола: 24 знака от base64url ≈ 143 бита.
 *
 * Без двусмислените знаци не се чисти — паролата се копира, не се преписва
 * на ръка, а всяко махнато множество знаци намалява ентропията.
 */
function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    fail(
      "Липсва имейл.\n" +
        "  npx tsx scripts/set-admin-password.ts admin@nfi.local",
    );
  }

  if (!process.env.DATABASE_URL) {
    fail("Липсва DATABASE_URL. Подай го пред командата.");
  }

  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true, deletedAt: true },
  });

  if (!user) {
    fail(
      `Няма потребител с имейл ${email}.\n` +
        "  Създай го първо (регистрация през сайта или сийд).",
    );
  }

  if (user.deletedAt) {
    fail(
      `Профилът ${user.email} е изтрит (deletedAt е зададено).\n` +
        "  Парола на изтрит профил не влиза никого — възстанови го първо.",
    );
  }

  const supplied = process.env.ADMIN_PASSWORD;
  const password = supplied ?? generatePassword();

  // Своята парола минава през същите граници като при регистрация. Иначе
  // точно админският профил — този с достъп до личните данни — се оказва
  // единственият с „123456".
  if (supplied) {
    if (supplied.length < MIN_PASSWORD_LENGTH) {
      fail(`Паролата е под ${MIN_PASSWORD_LENGTH} знака.`);
    }
    if (supplied.length > MAX_PASSWORD_LENGTH) {
      fail(`Паролата е над ${MAX_PASSWORD_LENGTH} знака.`);
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) },
  });

  // Всички стари сесии падат. Смяната на парола, която оставя влезли
  // сесии, не спира човека, заради когото я сменяш.
  const { count } = await db.session.deleteMany({ where: { userId: user.id } });

  console.log(`\n✓ Паролата на ${user.email} е зададена (роля: ${user.role}).`);
  if (count > 0) {
    console.log(`  Прекратени сесии: ${count}.`);
  }

  if (!supplied) {
    console.log(
      "\n  Паролата се показва ВЕДНЪЖ и не се пази никъде:\n\n" +
        `      ${password}\n\n` +
        "  Запиши я в мениджър за пароли сега. Загубиш ли я, пусни\n" +
        "  командата пак — старата става невалидна.\n",
    );
  }

  if (user.role !== "ADMIN") {
    console.warn(
      `  ⚠ ${user.email} е с роля ${user.role}, не ADMIN — в панела няма да влезе.\n`,
    );
  }
}

main()
  .catch((error) => {
    console.error("\n✗ Неуспех:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
