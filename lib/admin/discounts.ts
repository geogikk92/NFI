import "server-only";

// АДМИН · промоционалните кодове — четене за формата и ПИСАНЕ в базата.
//
// Устроен като lib/admin/products.ts. Четири неща тук са различни и всяко
// от тях е тихо счупване, ако се пропусне:
//
//   1. КОДЪТ СЕ ЗАПИСВА С ГЛАВНИ БУКВИ. Не е разкрасяване. Търсенето при
//      плащане прави `.toUpperCase()` върху въведеното от клиента (виж
//      lib/commerce/catalog.ts, priceCartFromDb). Код, записан като
//      „leto2026", НЕ МОЖЕ да бъде намерен никога — нито грешка, нито
//      следа, просто „невалиден код" пред всеки клиент.
//
//   2. „VALUE" ЗНАЧИ РАЗЛИЧНО НЕЩО СПОРЕД „KIND". При PERCENT е процент
//      (10 = 10%), при FIXED е ЦЕНТОВЕ. Едно поле, две единици — затова
//      формата пита различно и разборът тук е различен.
//
//   3. КРАЯТ Е КРАЯТ НА ДЕНЯ. „Важи до 31.12" значи до 23:59 на 31-ви в
//      Берлин, не до полунощ по Гринуич. Виж parseDateEnd в input.ts.
//
//   4. БРОЯЧЪТ НА ИЗПОЛЗВАНИЯТА НЕ СЕ ПИПА ОТ ФОРМАТА. `redemptions` се
//      вдига при плащане. Приемеше ли се от формата, един невнимателен
//      запис нулира изразходването и кодът тръгва отначало.

import { db } from "@/lib/db";
import {
  type AuditMeta,
  type AuditTx,
  recordChange,
} from "@/lib/admin/audit";
import { collect } from "@/lib/admin/form";
import {
  oneOf,
  parseDateEnd,
  parseDateStart,
  parseMoneyToCents,
  parseOptionalMoneyToCents,
  parseOptionalWholeNumber,
  parseWholeNumber,
} from "@/lib/admin/input";
import {
  DISCOUNT_KINDS,
  type DiscountKind,
} from "@/lib/admin/queries";
import { codeProblem, normalizeCode } from "@/lib/admin/discount-code";

export interface DiscountInput {
  code: string;
  kind: DiscountKind;
  value: number;
  minOrderCents: number | null;
  maxRedemptions: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

/**
 * Формата → проверена стойност или грешки по полета.
 *
 * Стойността се разбира според ВИДА, затова се чете от две различни полета:
 * „percent" (число) и „amount" (сума). Едно общо поле би значело едно нещо
 * при процент и съвсем друго при сума — и при смяна на вида старата
 * стойност би влязла с новото значение: 10 € отстъпка става 10%.
 */
export function parseDiscountForm(
  data: FormData,
):
  | { ok: true; value: DiscountInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const code = normalizeCode(String(data.get("code") ?? ""));
  const codeIssue = codeProblem(code);

  const kindResult = oneOf(data.get("kind"), DISCOUNT_KINDS, "Вид отстъпка");

  const collected = collect({
    code: codeIssue
      ? ({ ok: false, error: codeIssue } as const)
      : ({ ok: true, value: code } as const),

    kind: kindResult,

    value: !kindResult.ok
      ? // Без вид няма как да се разбере стойността. Съобщението е за
        // полето на вида — тук няма какво да се каже.
        ({ ok: true, value: 0 } as const)
      : kindResult.value === "PERCENT"
        ? parseWholeNumber(data.get("percent"), {
            min: 1,
            // 100% е безплатно. Над това е сгрешено въвеждане, а не
            // по-голяма отстъпка — сметката така или иначе клампва.
            max: 100,
            label: "Процент",
          })
        : parseMoneyToCents(data.get("amount"), "Сума на отстъпката"),

    minOrderCents: parseOptionalMoneyToCents(
      data.get("minOrder"),
      "Минимална поръчка",
    ),

    maxRedemptions: parseOptionalWholeNumber(data.get("maxRedemptions"), {
      min: 1,
      max: 1_000_000,
      label: "Максимум използвания",
    }),

    startsAt: parseDateStart(data.get("startsAt"), "Важи от"),
    endsAt: parseDateEnd(data.get("endsAt"), "Важи до"),

    active: { ok: true, value: data.get("active") !== null } as const,
  });

  if (!collected.ok) return collected;

  const value = collected.value;

  // Проверка между ДВЕ полета — идва след разбора, защото по-рано няма
  // какво да се сравнява.
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    return {
      ok: false,
      fieldErrors: {
        endsAt:
          "Краят е преди началото. Кодът не би важил нито ден — провери " +
          "двете дати.",
      },
    };
  }

  return { ok: true, value };
}

// ─────────────────────────────────────────────────────────────────────────
//  Какво влиза в следата
// ─────────────────────────────────────────────────────────────────────────

const AUDITED = {
  id: true,
  code: true,
  kind: true,
  value: true,
  minOrderCents: true,
  maxRedemptions: true,
  redemptions: true,
  startsAt: true,
  endsAt: true,
  active: true,
} as const;

export interface AdminDiscountDetail {
  id: string;
  code: string;
  kind: DiscountKind;
  value: number;
  minOrderCents: number | null;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

export async function getDiscountForEdit(
  id: string,
): Promise<AdminDiscountDetail | null> {
  return db.discount.findUnique({
    where: { id },
    select: AUDITED,
  }) as Promise<AdminDiscountDetail | null>;
}

// ─────────────────────────────────────────────────────────────────────────
//  Писане
// ─────────────────────────────────────────────────────────────────────────

export class DiscountGone extends Error {
  constructor() {
    super("Промоцията вече не съществува.");
    this.name = "DiscountGone";
  }
}

export class DiscountInUse extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscountInUse";
  }
}

export async function createDiscount(
  input: DiscountInput,
  meta: AuditMeta,
): Promise<{ id: string; code: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const discount = await tx.discount.create({
      // `redemptions` НЕ се подава — базата го започва от нула и оттам
      // нататък го вдига само плащането.
      data: input,
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "discount.create",
      entity: "Discount",
      entityId: discount.id,
      after: discount,
    });

    return { id: discount.id, code: discount.code };
  });
}

export async function updateDiscount(
  id: string,
  input: DiscountInput,
  meta: AuditMeta,
): Promise<{ id: string; code: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const before = await tx.discount.findUnique({
      where: { id },
      select: AUDITED,
    });

    if (!before) throw new DiscountGone();

    const after = await tx.discount.update({
      where: { id },
      // Пак БЕЗ `redemptions`: броячът се вдига само при плащане и един
      // невнимателен запис от формата би нулирал изразходването.
      data: input,
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "discount.update",
      entity: "Discount",
      entityId: id,
      before,
      after,
    });

    return { id, code: after.code };
  });
}

/**
 * Включва и изключва кода от списъка.
 *
 * Отделно действие, а не `updateDiscount`: изключването трябва да работи
 * ВЕДНАГА, дори когато нещо друго в записа е невалидно. Кодът, който
 * изтича пари, се спира с едно натискане.
 */
export async function setDiscountActive(
  id: string,
  active: boolean,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.discount.findUnique({
      where: { id },
      select: { id: true, active: true },
    });

    if (!before) throw new DiscountGone();

    const after = await tx.discount.update({
      where: { id },
      data: { active },
      select: { id: true, active: true },
    });

    await recordChange(tx, meta, {
      action: active ? "discount.activate" : "discount.deactivate",
      entity: "Discount",
      entityId: id,
      before,
      after,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Изтриване
// ─────────────────────────────────────────────────────────────────────────

export interface DiscountUsage {
  orders: number;
}

/**
 * Обяснение защо не може, или `null`, когато може.
 *
 * `Order.discount` е `onDelete: SetNull`, тоест базата НЕ спира
 * изтриването — тя мълчаливо откача поръчките. Резултатът е фактура, за
 * която вече не се знае с какъв код е намалена, а сумата ѝ е намалена.
 * Това е дупка в одитната следа, затова проверката е тук.
 */
export function discountDeleteBlocker(usage: DiscountUsage): string | null {
  if (usage.orders === 0) return null;

  return (
    `Промоцията не може да се изтрие: ползвана е в ${usage.orders} поръчки ` +
    "и изтриването ѝ би оставило фактурите с намалена сума, но без код, " +
    "който да я обясни. Изключи я вместо това."
  );
}

export async function getDiscountUsage(
  id: string,
): Promise<DiscountUsage | null> {
  const row = await db.discount.findUnique({
    where: { id },
    select: { _count: { select: { orders: true } } },
  });

  return row ? row._count : null;
}

export async function deleteDiscount(
  id: string,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.discount.findUnique({
      where: { id },
      select: { ...AUDITED, _count: { select: { orders: true } } },
    });

    if (!before) throw new DiscountGone();

    const blocker = discountDeleteBlocker(before._count);
    if (blocker) throw new DiscountInUse(blocker);

    const { _count, ...snapshot } = before;
    void _count;

    await tx.discount.delete({ where: { id } });

    await recordChange(tx, meta, {
      action: "discount.delete",
      entity: "Discount",
      entityId: id,
      before: snapshot,
    });
  });
}
