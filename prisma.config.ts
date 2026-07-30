import { existsSync } from "node:fs";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Локално тайните са в .env.local (Next го чете сам, Prisma CLI — не).
// На Vercel такъв файл НЯМА — променливите идват от средата. Затова
// зареждането е условно: dotenv няма да презапише вече зададена
// стойност, но проверката прави поведението явно вместо случайно.
if (existsSync(".env.local")) {
  config({ path: ".env.local" });
}

const url = process.env.DATABASE_URL;

// ПРЕДУПРЕЖДАВА, но НЕ хвърля. Причината е конкретна и я платих с един
// провален деплой: `prisma generate` се вика от postinstall и НЕ се
// нуждае от datasource. Ако тук се хвърли, пада целият `npm install` —
// тоест деплоят умира преди билда, а значи и преди пазача в
// scripts/migrate-if-configured.mjs да може да свърши работата си.
//
// Съобщението стои, защото Prisma казва само „datasource.url property is
// required", което не подсказва КЪДЕ липсва.
if (!url) {
  console.warn(
    "Липсва DATABASE_URL.\n" +
      "  • Локално: копирай .env.example като .env.local и го попълни.\n" +
      "  • На Vercel: Settings → Environment Variables → добави DATABASE_URL\n" +
      "    (pooled connection низът, не директният) за Production, Preview\n" +
      "    и Development. Виж docs/ДЕПЛОЙ.md.\n" +
      "  `prisma generate` работи и без него; migrate/studio — не.",
  );
}

export default defineConfig({
  // Многофайлова схема: base.prisma е замразен, другите два са лични.
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    // Пуска се и сам след `prisma migrate reset`. Ползва --env-file,
    // защото сийдът е отделен процес и не вижда заредените тук
    // променливи. На Vercel не се вика — сийдването е ръчно решение.
    seed: "tsx --env-file=.env.local prisma/seed.ts",
  },
  // Подава се само когато го има. Празен низ е по-лош от липсваща
  // стойност: Prisma го приема като валиден и гърми по-навътре, с
  // грешка за протокол вместо за липсваща променлива.
  ...(url ? { datasource: { url } } : {}),
});
