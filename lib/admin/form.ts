// АДМИН · основа — състоянието на формите и събирането на грешките.
//
// ЧИСТ модул: без база и без "server-only". Внася се и от клиентските
// компоненти на формите (заради типа на състоянието), и от server actions.
//
// Идиомът следва app/[locale]/(public)/kontakt/actions.ts: действието
// връща `{ status, fieldErrors, values }`, а формата ги показва без
// презареждане през useActionState. Разликата е една — там съобщенията са
// КОДОВЕ, защото формата е на три езика. Тук са готов български текст:
// админът нарочно е извън многоезичието (виж lib/i18n/config.ts).

import type { ParseResult } from "./input";

export interface AdminFormState {
  status: "idle" | "error" | "success";
  /** Общо съобщение над формата. */
  message?: string;
  /** По едно съобщение на поле — показва се до самото поле. */
  fieldErrors?: Record<string, string>;
  /**
   * Написаното се връща, за да не се губи при грешка.
   *
   * Без това всяка сгрешена запетая в цената изтрива двайсет попълнени
   * полета и човекът почва отначало.
   */
  values?: Record<string, string>;
}

export const IDLE: AdminFormState = { status: "idle" };

/** Разопакова `{ a: ParseResult<X> }` до `{ a: X }`. */
type Unwrap<T> = {
  [K in keyof T]: T[K] extends ParseResult<infer U> ? U : never;
};

/**
 * Проверява ВСИЧКИ полета и събира всички грешки наведнъж.
 *
 * Нарочно не спира на първата: човек, който вижда една грешка, я поправя,
 * натиска „Запази" и вижда следващата. Три пъти подред това е достатъчно,
 * за да си затвори раздела.
 *
 * Типът се извежда сам — `collect({ title: requiredText(...) })` дава
 * `{ title: string }`, така че забравено поле не може да се промъкне до
 * заявката към базата.
 */
export function collect<T extends Record<string, ParseResult<unknown>>>(
  fields: T,
):
  | { ok: true; value: Unwrap<T> }
  | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const value: Record<string, unknown> = {};

  for (const [name, result] of Object.entries(fields)) {
    if (result.ok) {
      value[name] = result.value;
    } else {
      fieldErrors[name] = result.error;
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return { ok: true, value: value as Unwrap<T> };
}

/**
 * Написаното, за да се върне при грешка.
 *
 * Само низовете: FormData носи и File обекти, а `String(file)` дава
 * „[object File]" — низ, който после се показва в полето като стойност.
 */
export function formValues(data: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, value] of data.entries()) {
    if (typeof value === "string") values[key] = value;
  }

  return values;
}

/** Провал с общо съобщение и запазено съдържание на полетата. */
export function invalid(
  data: FormData,
  message: string,
  fieldErrors: Record<string, string> = {},
): AdminFormState {
  return {
    status: "error",
    message,
    fieldErrors,
    values: formValues(data),
  };
}

/** Стандартното съобщение, когато има грешки по полета. */
export const CHECK_FIELDS = "Провери отбелязаните полета.";

/**
 * Кои колони е засегнало нарушението на уникалност.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  ВНИМАНИЕ: формата на грешката НЕ е това, което пише в повечето примери.
 * ─────────────────────────────────────────────────────────────────────────
 * Обичайното `error.meta.target` идва от Rust engine-а. Prisma 7 в този
 * проект работи през driver adapter (виж lib/db.ts) и тогава `meta.target`
 * ПРОСТО ГО НЯМА. Истинската форма, снета от живата база:
 *
 *   meta: {
 *     modelName: "Course",
 *     driverAdapterError: {
 *       cause: {
 *         originalCode: "23505",
 *         kind: "UniqueConstraintViolation",
 *         constraint: { fields: ["slug"] }
 *       }
 *     }
 *   }
 *
 * Кодът четеше само `meta.target`, връщаше `null` и зает адрес излизаше
 * като „грешка в базата, опитай пак" — съвет, който не помага, защото
 * повторният опит дава същото. Затова се четат И ТРИТЕ известни форми.
 */
function conflictColumns(error: unknown): string[] {
  if (typeof error !== "object" || error === null) return [];

  const meta = (error as { meta?: Record<string, unknown> }).meta;
  if (!meta) return [];

  // 1. Driver adapter (този проект).
  const constraint = (
    meta.driverAdapterError as
      | { cause?: { constraint?: { fields?: unknown; index?: unknown } } }
      | undefined
  )?.cause?.constraint;

  if (Array.isArray(constraint?.fields)) {
    return constraint.fields.map(String);
  }

  // 2. Някои драйвери дават само името на индекса („Course_slug_key").
  if (typeof constraint?.index === "string") {
    return [constraint.index];
  }

  // 3. Класическата форма от Rust engine-а.
  const target = meta.target;
  if (Array.isArray(target)) return target.map(String);
  if (typeof target === "string") return [target];

  return [];
}

/**
 * Prisma грешка за нарушена уникалност → съобщение до правилното поле.
 *
 * Без това два курса с един адрес дават „Записът не мина заради грешка в
 * базата" в средата на екрана — съобщение, което не казва нито кое поле, нито
 * какво да се направи, а подканва към повторен опит със същия резултат.
 *
 * Проверката е по ФОРМА, а не по `instanceof PrismaClientKnownRequestError`:
 * този клас идва от генерирания клиент и внасянето му тук би вкарало
 * Prisma в модул, който се чете и от браузъра.
 */
export function uniqueConflict(
  error: unknown,
  fields: Record<string, string>,
): Record<string, string> | null {
  if (typeof error !== "object" || error === null) return null;

  if ((error as { code?: unknown }).code !== "P2002") return null;

  for (const column of conflictColumns(error)) {
    // Пряко съвпадение: „slug".
    const direct = fields[column];
    if (direct) return { [column]: direct };

    // Име на индекс: „Course_slug_key" носи „slug" вътре в себе си.
    // Търси се с ограждащи долни черти, за да не съвпадне „code" вътре в
    // „discountCode" и да залепи съобщението за грешното поле.
    for (const [field, message] of Object.entries(fields)) {
      if (column.includes(`_${field}_`) || column.endsWith(`_${field}`)) {
        return { [field]: message };
      }
    }
  }

  return null;
}
