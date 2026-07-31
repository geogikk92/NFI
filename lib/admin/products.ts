import "server-only";

// АДМИН · продуктите — четене за формата и ПИСАНЕ в базата.
//
// Устроен като lib/admin/courses.ts: всяка промяна минава през
// `db.$transaction` заедно със записа в AuditLog, така че промяна без
// следа не може да се получи.
//
// Разликата с курсовете е в три неща и всяко от тях е капан:
//
//   1. ЦЕНАТА Е ЗАДЪЛЖИТЕЛНА. `Product.priceCents` е Int NOT NULL, за
//      разлика от курса, чиято цена може да липсва („по договаряне").
//      Продукт без цена не може да се сложи в количка.
//
//   2. ДДС КАТЕГОРИЯТА НЕ СЛЕДВА ВИДА. Виж коментара при
//      VAT_CATEGORY_LABELS в queries.ts и правилата в lib/legal.
//
//   3. ТЕГЛОТО И НАЛИЧНОСТТА СА САМО ЗА ФИЗИЧЕСКИТЕ. Оставени върху
//      дигитален продукт, те влизат в сметката за доставка и клиентът
//      плаща пратка за PDF.

import { db } from "@/lib/db";
import {
  type AuditMeta,
  type AuditTx,
  recordChange,
} from "@/lib/admin/audit";
import { collect } from "@/lib/admin/form";
import {
  oneOf,
  optionalText,
  parseMoneyToCents,
  parseOptionalWholeNumber,
  parseWholeNumber,
  requiredText,
} from "@/lib/admin/input";
import { PRODUCT_LIMITS } from "@/lib/admin/limits";
import { slugProblem } from "@/lib/admin/slug";
import {
  COVER_COLORS,
  PRODUCT_TYPES,
  VAT_CATEGORIES,
  type CoverColor,
  type ProductType,
  type VatCategory,
} from "@/lib/admin/queries";

export interface ProductInput {
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  type: ProductType;
  priceCents: number;
  vatCategory: VatCategory;
  weightGrams: number | null;
  stock: number | null;
  coverColor: CoverColor;
  coverBrand: string | null;
  coverEyebrow: string | null;
  coverTitle: string | null;
  coverMeta: string | null;
  sortOrder: number;
  published: boolean;
}

/**
 * Кои двойки „вид + ДДС категория" са безсмислени.
 *
 * НЕ се проверява всичко, което изглежда странно — само двете, които са
 * противоречиви по определение:
 *
 *   • физическо + електронна услуга: електронната услуга е такава именно
 *     защото се доставя без човешка намеса, а тук има пратка;
 *   • дигитално + стока: стоката е нещо материално.
 *
 * Останалите комбинации се допускат нарочно, макар да изглеждат необичайни.
 * ЗАВЕРЕН ПРЕВОД ВЪРХУ ХАРТИЯ е физически продукт с категория „превод" — и
 * това е правилно, а не грешка: човешкият труд го прави неелектронен,
 * значи не минава през OSS, но листът пътува по пощата. Забраната на тази
 * двойка би направила истински продукт невъведим.
 */
export function vatCategoryProblem(
  type: ProductType,
  category: VatCategory,
): string | null {
  if (type === "PHYSICAL" && category === "ELECTRONIC") {
    return (
      "Физически продукт не може да е електронна услуга — тя е такава, " +
      "защото се доставя автоматично, без пратка. Избери „Стока“ или " +
      "„Заверен превод“."
    );
  }

  if (type === "DIGITAL" && category === "GOODS") {
    return (
      "Дигитален продукт не е стока — стоката има тегло и се изпраща. " +
      "Избери „Електронна услуга“ за PDF и видео."
    );
  }

  return null;
}

/**
 * Формата → проверена стойност или грешки по полета.
 */
export function parseProductForm(
  data: FormData,
):
  | { ok: true; value: ProductInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const slugRaw = String(data.get("slug") ?? "").trim();
  const slugIssue = slugProblem(slugRaw);

  const collected = collect({
    slug: slugIssue
      ? ({ ok: false, error: slugIssue } as const)
      : ({ ok: true, value: slugRaw } as const),

    title: requiredText(data.get("title"), {
      min: 2,
      max: PRODUCT_LIMITS.title,
      label: "Заглавие (български)",
    }),
    titleDe: optionalText(
      data.get("titleDe"),
      PRODUCT_LIMITS.title,
      "Заглавие (немски)",
    ),
    titleEn: optionalText(
      data.get("titleEn"),
      PRODUCT_LIMITS.title,
      "Заглавие (английски)",
    ),

    description: optionalText(
      data.get("description"),
      PRODUCT_LIMITS.description,
      "Описание (български)",
    ),
    descriptionDe: optionalText(
      data.get("descriptionDe"),
      PRODUCT_LIMITS.description,
      "Описание (немски)",
    ),
    descriptionEn: optionalText(
      data.get("descriptionEn"),
      PRODUCT_LIMITS.description,
      "Описание (английски)",
    ),

    type: oneOf(data.get("type"), PRODUCT_TYPES, "Вид"),
    vatCategory: oneOf(
      data.get("vatCategory"),
      VAT_CATEGORIES,
      "ДДС категория",
    ),

    // ЗАДЪЛЖИТЕЛНА, за разлика от цената на курс: колоната е NOT NULL и
    // продукт без цена не може да влезе в количка.
    priceCents: parseMoneyToCents(data.get("price"), "Цена"),

    weightGrams: parseOptionalWholeNumber(data.get("weightGrams"), {
      min: 1,
      max: PRODUCT_LIMITS.weightGrams,
      label: "Тегло",
    }),
    stock: parseOptionalWholeNumber(data.get("stock"), {
      min: 0,
      max: PRODUCT_LIMITS.stock,
      label: "Наличност",
    }),

    coverColor: oneOf(data.get("coverColor"), COVER_COLORS, "Цвят на корицата"),
    coverBrand: optionalText(
      data.get("coverBrand"),
      PRODUCT_LIMITS.coverBrand,
      "Линия над заглавието",
    ),
    coverEyebrow: optionalText(
      data.get("coverEyebrow"),
      PRODUCT_LIMITS.coverEyebrow,
      "Надпис над заглавието",
    ),
    coverTitle: optionalText(
      data.get("coverTitle"),
      PRODUCT_LIMITS.coverTitle,
      "Заглавие на корицата",
    ),
    coverMeta: optionalText(
      data.get("coverMeta"),
      PRODUCT_LIMITS.coverMeta,
      "Ред под заглавието",
    ),

    sortOrder: parseWholeNumber(data.get("sortOrder") || "0", {
      min: -PRODUCT_LIMITS.sortOrder,
      max: PRODUCT_LIMITS.sortOrder,
      label: "Подредба",
    }),

    published: { ok: true, value: data.get("published") !== null } as const,
  });

  if (!collected.ok) return collected;

  const value = collected.value;

  // Проверката между ДВЕ полета идва СЛЕД разбора: докато някое от тях е
  // невалидно, няма какво да се сравнява.
  const mismatch = vatCategoryProblem(value.type, value.vatCategory);
  if (mismatch) {
    return { ok: false, fieldErrors: { vatCategory: mismatch } };
  }

  return {
    ok: true,
    value: {
      ...value,
      // Дигиталният продукт НЯМА тегло и наличност, каквото и да е
      // останало в полетата. Иначе сметката за доставка ги намира и
      // клиентът плаща пратка за файл.
      weightGrams: value.type === "PHYSICAL" ? value.weightGrams : null,
      stock: value.type === "PHYSICAL" ? value.stock : null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  Какво влиза в следата
// ─────────────────────────────────────────────────────────────────────────

const AUDITED = {
  id: true,
  slug: true,
  title: true,
  titleDe: true,
  titleEn: true,
  description: true,
  descriptionDe: true,
  descriptionEn: true,
  type: true,
  priceCents: true,
  currency: true,
  vatCategory: true,
  weightGrams: true,
  stock: true,
  coverColor: true,
  coverBrand: true,
  coverEyebrow: true,
  coverTitle: true,
  coverMeta: true,
  published: true,
  publishedAt: true,
  sortOrder: true,
} as const;

/** Продуктът, както го чете формата за редакция. Огледало на `AUDITED`. */
export interface AdminProductDetail {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  type: ProductType;
  priceCents: number;
  currency: string;
  vatCategory: VatCategory;
  weightGrams: number | null;
  stock: number | null;
  coverColor: CoverColor;
  coverBrand: string | null;
  coverEyebrow: string | null;
  coverTitle: string | null;
  coverMeta: string | null;
  published: boolean;
  publishedAt: Date | null;
  sortOrder: number;
}

export async function getProductForEdit(
  id: string,
): Promise<AdminProductDetail | null> {
  return db.product.findUnique({
    where: { id },
    select: AUDITED,
  }) as Promise<AdminProductDetail | null>;
}

// ─────────────────────────────────────────────────────────────────────────
//  Писане
// ─────────────────────────────────────────────────────────────────────────

/** Като при курсовете: слага се веднъж, при първото публикуване. */
function publishedAtFor(published: boolean, current: Date | null): Date | null {
  if (!published) return current;
  return current ?? new Date();
}

export class ProductGone extends Error {
  constructor() {
    super("Продуктът вече не съществува.");
    this.name = "ProductGone";
  }
}

export class ProductInUse extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductInUse";
  }
}

export async function createProduct(
  input: ProductInput,
  meta: AuditMeta,
): Promise<{ id: string; slug: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const product = await tx.product.create({
      data: {
        ...input,
        publishedAt: publishedAtFor(input.published, null),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "product.create",
      entity: "Product",
      entityId: product.id,
      after: product,
    });

    return { id: product.id, slug: product.slug };
  });
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  meta: AuditMeta,
): Promise<{ id: string; slug: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const before = await tx.product.findUnique({
      where: { id },
      select: AUDITED,
    });

    if (!before) throw new ProductGone();

    const after = await tx.product.update({
      where: { id },
      data: {
        ...input,
        publishedAt: publishedAtFor(
          input.published,
          before.publishedAt as Date | null,
        ),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "product.update",
      entity: "Product",
      entityId: id,
      before,
      after,
    });

    return { id, slug: after.slug };
  });
}

export async function setProductPublished(
  id: string,
  published: boolean,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.product.findUnique({
      where: { id },
      select: { id: true, published: true, publishedAt: true },
    });

    if (!before) throw new ProductGone();

    const after = await tx.product.update({
      where: { id },
      data: {
        published,
        publishedAt: publishedAtFor(published, before.publishedAt),
      },
      select: { id: true, published: true, publishedAt: true },
    });

    await recordChange(tx, meta, {
      action: published ? "product.publish" : "product.unpublish",
      entity: "Product",
      entityId: id,
      before,
      after,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Изтриване
// ─────────────────────────────────────────────────────────────────────────

export interface ProductUsage {
  orderItems: number;
  files: number;
}

/**
 * Обяснение защо не може, или `null`, когато може.
 *
 * Поръчаният продукт НЕ се трие и това е решено от самата база
 * (`OrderItem.product` е `onDelete: Restrict`). Проверката тук съществува,
 * за да го каже на български ПРЕДИ опита, вместо да остави драйвера да
 * върне „Foreign key constraint failed".
 *
 * Причината е счетоводна, не техническа: редът в поръчката пази снимка на
 * цената към момента на продажбата, а фактурата към нея се пази по закон
 * (ЗДДС чл. 121). Изтрит продукт с останала фактура е дупка в одитната
 * следа.
 */
export function productDeleteBlocker(usage: ProductUsage): string | null {
  if (usage.orderItems === 0) return null;

  return (
    `Продуктът не може да се изтрие: продаван е ${usage.orderItems} пъти и ` +
    "фактурите към тези поръчки се пазят по закон. Спри го от продажба " +
    "вместо това — историята остава вярна."
  );
}

export async function getProductUsage(
  id: string,
): Promise<ProductUsage | null> {
  const row = await db.product.findUnique({
    where: { id },
    select: { _count: { select: { orderItems: true, files: true } } },
  });

  return row ? row._count : null;
}

export async function deleteProduct(
  id: string,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.product.findUnique({
      where: { id },
      select: {
        ...AUDITED,
        _count: { select: { orderItems: true, files: true } },
      },
    });

    if (!before) throw new ProductGone();

    const blocker = productDeleteBlocker(before._count);
    if (blocker) throw new ProductInUse(blocker);

    const { _count, ...snapshot } = before;
    void _count;

    // Файловете на продукта падат с него (`ProductFile` е `onDelete:
    // Cascade`). Това е нарочно — те са негови и нямат смисъл без него.
    await tx.product.delete({ where: { id } });

    await recordChange(tx, meta, {
      action: "product.delete",
      entity: "Product",
      entityId: id,
      before: snapshot,
    });
  });
}
