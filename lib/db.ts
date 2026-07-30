// ОБЩ ФАЙЛ. Единственият Prisma клиент в проекта — не си правете втори.
//
// Prisma 7 работи през driver adapter, не през Rust engine. Затова тук
// е PrismaPg, а не голо `new PrismaClient()`.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Съобщението назовава И ДВАТА случая. Първата му версия казваше само
    // „копирай .env.example като .env.local" — съвет, безполезен точно
    // когато най-много трябва: в лога на Vercel, където .env.local няма и
    // не може да има. Същата поправка вече беше направена в
    // prisma.config.ts, а тук остана.
    throw new Error(
      [
        "Липсва DATABASE_URL.",
        "  • Локално: копирай .env.example като .env.local и го попълни.",
        "  • На Vercel: Settings → Environment Variables → добави DATABASE_URL",
        "    (pooled низът, със sslmode=verify-full) за Production, Preview и",
        "    Development, ПОСЛЕ Deployments → ⋯ → Redeploy. Добавянето на",
        "    променлива не пуска нов деплой само по себе си, а старият",
        "    продължава да работи със старата среда.",
        "  • Внимавай за представка: интеграцията с Neon създава",
        "    NFI_DATABASE_URL, а кодът чете DATABASE_URL.",
      ].join("\n"),
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

type Client = ReturnType<typeof createClient>;

// В dev режим Next презарежда модулите при всяка промяна. Без този кеш
// всяко презареждане отваря нов пул от връзки и Postgres се задавя.
const globalForPrisma = globalThis as unknown as { prisma?: Client };

function getClient(): Client {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Клиентът се създава при ПЪРВА УПОТРЕБА, не при импорт.
 *
 * Иначе всеки модул, който само споменава `db` в стойност по подразбиране
 * (виж lib/counter.ts), изисква жива база само за да бъде зареден — и
 * чистите функции в него стават нетестваеми без Postgres.
 */
export const db = new Proxy({} as Client, {
  get(_target, property, receiver) {
    const client = getClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as Client;
