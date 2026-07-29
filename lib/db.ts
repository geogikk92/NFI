// ОБЩ ФАЙЛ. Единственият Prisma клиент в проекта — не си правете втори.
//
// Prisma 7 работи през driver adapter, не през Rust engine. Затова тук
// е PrismaPg, а не голо `new PrismaClient()`.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Липсва DATABASE_URL. Копирай .env.example като .env.local и го попълни.",
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
