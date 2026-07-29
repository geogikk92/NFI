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

/** "NFI-B-2026-000042" — за документи, които НЕ са данъчни. */
export function formatSequential(
  prefix: string,
  year: number,
  value: number,
  padding = 6,
): string {
  return `${prefix}-${year}-${String(value).padStart(padding, "0")}`;
}

/**
 * Счетоводната година по БЪЛГАРСКО време, не по UTC.
 *
 * България е UTC+2/+3. Поръчка на 1 януари в 01:00 местно време е още
 * 31 декември в UTC — `getUTCFullYear()` би върнал изтеклата година и би
 * увеличил нейния брояч, след като тя вече е приключена и подадена.
 */
export function accountingYear(now: Date = new Date()): number {
  return Number.parseInt(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Sofia",
      year: "numeric",
    }).format(now),
    10,
  );
}

/**
 * Номер на ДАНЪЧЕН документ по ЗДДС чл. 114, ал. 1, т. 2:
 * „пореден десетразряден номер, съдържащ само арабски цифри".
 *
 * Само цифри — без представка, без тире, без година. И без нулиране на
 * 1 януари: поредицата е непрекъсната през целия живот на дружеството.
 */
export function formatTaxDocumentNumber(value: number): string {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Невалиден номер на данъчен документ: ${value}`);
  }
  if (value > 9_999_999_999) {
    throw new Error("Изчерпана е десетразрядната поредица.");
  }
  return String(value).padStart(10, "0");
}

/**
 * Фактурите и кредитните известия делят ЕДНА поредица.
 *
 * ЗДДС допуска и повече серии, но общата поредица прави номера уникален
 * сам по себе си и премахва цял клас грешки при сверяване. Ако
 * счетоводителят настоява за отделни серии, това е мястото — но решението
 * се взема ПРЕДИ първата издадена фактура, защото после не се преномерира.
 */
const TAX_DOCUMENT_SERIES = "taxdoc";

/** Пореден десетразряден номер на фактура: "0000000042". */
export async function nextInvoiceNumber(executor: Executor = db): Promise<string> {
  const value = await nextCounterValue(TAX_DOCUMENT_SERIES, executor);
  return formatTaxDocumentNumber(value);
}

/** Кредитно известие — от същата поредица, същия формат. */
export async function nextCreditNoteNumber(
  executor: Executor = db,
): Promise<string> {
  const value = await nextCounterValue(TAX_DOCUMENT_SERIES, executor);
  return formatTaxDocumentNumber(value);
}

/**
 * Номер на поръчка. НЕ е данъчен документ — форматът е свободен и е
 * избран да е четим на телефон при обаждане от клиент.
 */
export async function nextOrderNumber(
  executor: Executor = db,
  now: Date = new Date(),
): Promise<string> {
  const year = accountingYear(now);
  const value = await nextCounterValue(`order:${year}`, executor);
  return formatSequential("NFI-B", year, value);
}

/** Номер на сертификат (Боби, задача 16). Също не е данъчен документ. */
export async function nextCertificateNumber(
  executor: Executor = db,
  now: Date = new Date(),
): Promise<string> {
  const year = accountingYear(now);
  const value = await nextCounterValue(`certificate:${year}`, executor);
  return formatSequential("NFI-Z", year, value, 5);
}
