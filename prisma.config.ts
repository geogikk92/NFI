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

// Prisma казва само „datasource.url property is required", което не
// подсказва КЪДЕ липсва. Това съобщение казва и двата случая.
if (!url) {
  throw new Error(
    "Липсва DATABASE_URL.\n" +
      "  • Локално: копирай .env.example като .env.local и го попълни.\n" +
      "  • На Vercel: Settings → Environment Variables → добави DATABASE_URL\n" +
      "    (pooled connection низът, не директният) за Production, Preview\n" +
      "    и Development. Виж docs/ДЕПЛОЙ.md.",
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
  datasource: { url },
});
