// ОБЩ ФАЙЛ. Единственият Prisma клиент в проекта — не си правете втори.
//
// Prisma 7 работи през driver adapter, не през Rust engine. Затова тук
// е PrismaPg, а не голо `new PrismaClient()`.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Липсва DATABASE_URL. Копирай .env.example като .env.local и го попълни.",
  );
}

function createClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

// В dev режим Next презарежда модулите при всяка промяна. Без този кеш
// всяко презареждане отваря нов пул от връзки и Postgres се задавя.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
