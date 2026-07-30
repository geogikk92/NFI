// ТЕРИТОРИЯ НА ЖОРО · задача M9.
//
// Мостът между базата и чистата сметка в pricing.ts. Тук е ЕДИНСТВЕНОТО
// място, което чете цени — така „клиентът не диктува цена" е свойство на
// архитектурата, а не на дисциплината.

import { db } from "@/lib/db";
import type { VatCategory } from "@/lib/legal";
import { DEFAULT_LOCALE, pick, type Locale } from "@/lib/i18n/config";
import {
  priceCart,
  type CartItemInput,
  type CatalogProduct,
  type DiscountRule,
  type PricedCart,
  type ShippingRule,
} from "./pricing";

/** Prisma enum → домейн тип. Явно, за да гърми при добавяне на нова стойност. */
function toVatCategory(value: string): VatCategory {
  switch (value) {
    case "EDUCATION":
      return "education";
    case "ELECTRONIC":
      return "electronic";
    case "GOODS":
      return "goods";
    case "TRANSLATION":
      return "translation";
    default:
      throw new Error(`Непозната ДДС категория: ${value}`);
  }
}

const PRODUCT_CARD_FIELDS = {
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
  vatCategory: true,
  weightGrams: true,
  stock: true,
  published: true,
  coverMediaId: true,
  coverColor: true,
  coverBrand: true,
  coverEyebrow: true,
  coverTitle: true,
  coverMeta: true,
  sortOrder: true,
} as const;

export type ProductCard = {
  id: string;
  slug: string;
  /** БЪЛГАРСКИ — админът въвежда на него, затова е последният резервен. */
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  type: "DIGITAL" | "PHYSICAL";
  priceCents: number;
  weightGrams: number | null;
  stock: number | null;
  coverMediaId: string | null;
  /** Типографската корица — материалите нямат снимки (мокъп: magazin.html). */
  coverColor: "INK" | "RED" | "GREEN" | "GOLD";
  coverBrand: string | null;
  coverEyebrow: string | null;
  coverTitle: string | null;
  coverMeta: string | null;
};

/** Публичният каталог — само публикуваните. */
export async function listProducts(): Promise<ProductCard[]> {
  const rows = await db.product.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: PRODUCT_CARD_FIELDS,
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleDe: row.titleDe,
    titleEn: row.titleEn,
    description: row.description,
    descriptionDe: row.descriptionDe,
    descriptionEn: row.descriptionEn,
    type: row.type,
    priceCents: row.priceCents,
    weightGrams: row.weightGrams,
    stock: row.stock,
    coverMediaId: row.coverMediaId,
    coverColor: row.coverColor,
    coverBrand: row.coverBrand,
    coverEyebrow: row.coverEyebrow,
    coverTitle: row.coverTitle,
    coverMeta: row.coverMeta,
  }));
}

export async function getProductBySlug(
  slug: string,
): Promise<(ProductCard & { files: { label: string }[] }) | null> {
  const row = await db.product.findFirst({
    where: { slug, published: true },
    select: {
      ...PRODUCT_CARD_FIELDS,
      files: { select: { label: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    titleDe: row.titleDe,
    titleEn: row.titleEn,
    description: row.description,
    descriptionDe: row.descriptionDe,
    descriptionEn: row.descriptionEn,
    type: row.type,
    priceCents: row.priceCents,
    weightGrams: row.weightGrams,
    stock: row.stock,
    coverMediaId: row.coverMediaId,
    coverColor: row.coverColor,
    coverBrand: row.coverBrand,
    coverEyebrow: row.coverEyebrow,
    coverTitle: row.coverTitle,
    coverMeta: row.coverMeta,
    files: row.files,
  };
}

export interface PriceCartFromDbInput {
  items: readonly CartItemInput[];
  countryCode: string;
  discountCode?: string | null;
  ossThresholdExceeded?: boolean;
  now?: Date;
  /**
   * Езикът на КЛИЕНТА. Определя на кой език излиза заглавието на реда —
   * а то отива в OrderItem.titleSnapshot и накрая във фактурата.
   * По подразбиране немски: клиентите са в Германия и всяко извикване
   * отпреди многоезичието трябва да дава същия резултат.
   */
  locale?: Locale;
}

/**
 * Смята количката с данни от базата.
 *
 * Чете САМО продуктите, които са в количката — не целия каталог. При
 * празна количка не пипа базата изобщо.
 */
export async function priceCartFromDb(
  input: PriceCartFromDbInput,
): Promise<PricedCart> {
  const ids = [...new Set(input.items.map((item) => item.productId))];

  if (ids.length === 0) {
    return priceCart([], [], {
      countryCode: input.countryCode,
      ossThresholdExceeded: input.ossThresholdExceeded ?? false,
      now: input.now,
    });
  }

  const [products, zones, discount] = await Promise.all([
    db.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        titleDe: true,
        titleEn: true,
        type: true,
        priceCents: true,
        vatCategory: true,
        weightGrams: true,
        stock: true,
        published: true,
      },
    }),
    db.shippingZone.findMany({ where: { active: true } }),
    input.discountCode
      ? db.discount.findUnique({
          where: { code: input.discountCode.trim().toUpperCase() },
        })
      : Promise.resolve(null),
  ]);

  const locale = input.locale ?? DEFAULT_LOCALE;

  const catalog: CatalogProduct[] = products.map((product) => ({
    id: product.id,
    // Заглавието следва езика на КЛИЕНТА, защото оттук минава в
    // OrderItem.titleSnapshot и накрая във фактурата — фактура на език,
    // който купувачът не чете, е негодна. При липсващ превод pick() пада
    // на немското, после на българското (админът го въвежда винаги).
    title: pick(locale, {
      bg: product.title,
      de: product.titleDe,
      en: product.titleEn,
    }),
    kind: product.type,
    priceCents: product.priceCents,
    vatCategory: toVatCategory(product.vatCategory),
    weightGrams: product.weightGrams,
    stock: product.stock,
    published: product.published,
  }));

  const shippingRules: ShippingRule[] = zones.map((zone) => ({
    name: zone.name,
    countries: zone.countries,
    priceCents: zone.priceCents,
    freeAboveCents: zone.freeAboveCents,
    maxWeightGrams: zone.maxWeightGrams,
    active: zone.active,
  }));

  const discountRule: DiscountRule | null = discount
    ? {
        code: discount.code,
        kind: discount.kind,
        value: discount.value,
        minOrderCents: discount.minOrderCents,
        maxRedemptions: discount.maxRedemptions,
        redemptions: discount.redemptions,
        startsAt: discount.startsAt,
        endsAt: discount.endsAt,
        active: discount.active,
      }
    : null;

  // Подаден код, който не съществува, не бива да мине за „няма отстъпка" —
  // клиентът трябва да разбере, че кодът е грешен.
  const cart = priceCart(catalog, input.items, {
    countryCode: input.countryCode,
    ossThresholdExceeded: input.ossThresholdExceeded ?? false,
    shippingRules,
    discount: discountRule,
    now: input.now,
  });

  if (input.discountCode && !discount) {
    cart.problems.push({
      code: "DISCOUNT_INVALID",
      message: "Такъв промокод няма.",
    });
  }

  return cart;
}
