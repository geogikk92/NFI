// ОБЩ ФАЙЛ. Единственият източник на последователни номера.
//
// Ползва се от фактури и кредитни известия (Жоро) и от сертификати
// (Боби). Ако някой някога напише `SELECT value` и после `UPDATE`,
// две едновременни плащания ще получат един и същ номер на фактура.
// Затова инкрементът е ЕДНА заявка.

import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

/** Изпълнител: клиентът или активната транзакция. */
type Executor = Pick<typeof db, "$queryRaw"> | Prisma.TransactionClient;

/**
 * Увеличава брояча и връща новата стойност. Атомарно.
 *
 * Ключът носи и годината, защото и фактурите, и сертификатите започват
 * нова поредица всяка година: "invoice:2026", "certificate:2026".
 *
 * ВАЖНО: подавай `tx`, когато номерът се дава вътре в транзакция.
 * Иначе при откат на транзакцията номерът остава изхабен и в
 * поредицата зейва дупка — а дупките са проблем пред счетоводството.
 */
export async function nextCounterValue(
  key: string,
  executor: Executor = db,
): Promise<number> {
  const rows = await executor.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value", "updatedAt")
    VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE
      SET "value" = "Counter"."value" + 1,
          "updatedAt" = now()
    RETURNING "value"
  `;

  const value = rows[0]?.value;
  if (typeof value !== "number") {
    throw new Error(`Броячът "${key}" не върна стойност.`);
  }
  return value;
}

/** "NFI-2026-000042" */
export function formatSequential(
  prefix: string,
  year: number,
  value: number,
  padding = 6,
): string {
  return `${prefix}-${year}-${String(value).padStart(padding, "0")}`;
}

/**
 * Пълният номер на фактура. Сменя поредицата на 1 януари.
 * `now` се подава явно, за да е тестваемо.
 */
export async function nextInvoiceNumber(
  executor: Executor = db,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear();
  const value = await nextCounterValue(`invoice:${year}`, executor);
  return formatSequential("NFI", year, value);
}

/** Кредитните известия имат собствена поредица по ЗДДС. */
export async function nextCreditNoteNumber(
  executor: Executor = db,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear();
  const value = await nextCounterValue(`creditnote:${year}`, executor);
  return formatSequential("NFI-KI", year, value);
}

/** Номер на поръчка. */
export async function nextOrderNumber(
  executor: Executor = db,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear();
  const value = await nextCounterValue(`order:${year}`, executor);
  return formatSequential("NFI-B", year, value);
}

/** Номер на сертификат (Боби, задача 16). */
export async function nextCertificateNumber(
  executor: Executor = db,
  now: Date = new Date(),
): Promise<string> {
  const year = now.getUTCFullYear();
  const value = await nextCounterValue(`certificate:${year}`, executor);
  return formatSequential("NFI-Z", year, value, 5);
}
