// Next чете .env.local — Prisma CLI не го прави сам, затова е изрично тук.
// Така двамата държим само един файл с тайни.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  // Многофайлова схема: base.prisma е замразен, другите два са лични.
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
    // Пуска се и сам след `prisma migrate reset`.
    seed: "tsx --env-file=.env.local prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
