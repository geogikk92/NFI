// ТЕРИТОРИЯ НА ЖОРО · задача M9.
//
// Сметката на количката. Чиста функция — не чете от базата, за да може
// да се тества до последния цент.
//
// ЖЕЛЯЗНО ПРАВИЛО: цената НИКОГА не идва от клиента. Браузърът праща само
// `productId` и `quantity`; всичко останало се вади от базата и се смята
// тук. Иначе всеки може да си поръча курс за 0,01 €.

import {
  applyDiscount,
  distributeDiscount,
  vatFromGross,
  type Cents,
} from "@/lib/money";
import { isSupportedCountry, resolveVatRate, type VatCategory } from "@/lib/legal";

export type ProductKind = "DIGITAL" | "PHYSICAL";

/** Каквото клиентът има право да каже. Само това. */
export interface CartItemInput {
  productId: string;
  quantity: number;
}

/** Каквото сървърът знае за продукта. Идва от базата. */
export interface CatalogProduct {
  id: string;
  title: string;
  kind: ProductKind;
  /** Цена с ВКЛЮЧЕНО ДДС, в центове (PAngV иска бруто към потребител). */
  priceCents: Cents;
  vatCategory: VatCategory;
  weightGrams: number | null;
  stock: number | null;
  published: boolean;
}

export interface ShippingRule {
  name: string;
  countries: string[];
  priceCents: Cents;
  freeAboveCents: Cents | null;
  maxWeightGrams: number | null;
  active: boolean;
}

export interface DiscountRule {
  code: string;
  kind: "PERCENT" | "FIXED";
  value: number;
  minOrderCents: Cents | null;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

export interface PriceCartOptions {
  countryCode: string;
  /** Минат ли е прагът от 10 000 € за трансгранични B2C доставки. */
  ossThresholdExceeded: boolean;
  shippingRules?: ShippingRule[];
  discount?: DiscountRule | null;
  now?: Date;
}

export interface PricedLine {
  productId: string;
  title: string;
  kind: ProductKind;
  quantity: number;
  unitPriceCents: Cents;
  /** Бруто преди отстъпка. */
  grossCents: Cents;
  discountCents: Cents;
  /** Бруто след отстъпка — това влиза във фактурата. */
  netOfDiscountCents: Cents;
  vatRate: number;
  vatCents: Cents;
}

export type CartProblem =
  | { code: "EMPTY"; message: string }
  | { code: "UNKNOWN_PRODUCT"; message: string; productId: string }
  | { code: "UNPUBLISHED"; message: string; productId: string }
  | { code: "INVALID_QUANTITY"; message: string; productId: string }
  | { code: "OUT_OF_STOCK"; message: string; productId: string }
  | { code: "UNSUPPORTED_COUNTRY"; message: string }
  | { code: "NO_SHIPPING_ZONE"; message: string }
  | { code: "TOO_HEAVY"; message: string }
  | { code: "DISCOUNT_INVALID"; message: string };

export interface PricedCart {
  lines: PricedLine[];
  /** Бруто на редовете, преди отстъпка и доставка. */
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  /** ДДС, съдържащо се в общата сума (цените са бруто). */
  vatCents: Cents;
  totalCents: Cents;
  currency: string;
  requiresShipping: boolean;
  totalWeightGrams: number;
  appliedDiscountCode: string | null;
  problems: CartProblem[];
}

const EMPTY_CART: PricedCart = {
  lines: [],
  subtotalCents: 0,
  discountCents: 0,
  shippingCents: 0,
  vatCents: 0,
  totalCents: 0,
  currency: "EUR",
  requiresShipping: false,
  totalWeightGrams: 0,
  appliedDiscountCode: null,
  problems: [],
};

/**
 * Проверява дали промокодът важи СЕГА. Отделена е, за да може админът да
 * показва причината, вместо глухо „невалиден код".
 */
export function checkDiscount(
  discount: DiscountRule,
  subtotalCents: Cents,
  now: Date,
): string | null {
  if (!discount.active) return "Кодът е деактивиран.";
  if (discount.startsAt && now < discount.startsAt) return "Кодът още не важи.";
  if (discount.endsAt && now > discount.endsAt) return "Кодът е изтекъл.";
  if (
    discount.maxRedemptions !== null &&
    discount.redemptions >= discount.maxRedemptions
  ) {
    return "Кодът е изчерпан.";
  }
  if (discount.minOrderCents !== null && subtotalCents < discount.minOrderCents) {
    return "Поръчката е под минималната сума за този код.";
  }
  return null;
}

/** Зоната за държавата, или null. */
export function findShippingZone(
  rules: ShippingRule[],
  countryCode: string,
): ShippingRule | null {
  const country = countryCode.toUpperCase();
  return (
    rules.find(
      (rule) => rule.active && rule.countries.includes(country),
    ) ?? null
  );
}

/**
 * Смята количката. Не хвърля — връща `problems`, за да може UI-ят да
 * покаже всички наведнъж, вместо да ги открива едно по едно.
 */
export function priceCart(
  catalog: readonly CatalogProduct[],
  items: readonly CartItemInput[],
  options: PriceCartOptions,
): PricedCart {
  const now = options.now ?? new Date();
  const problems: CartProblem[] = [];
  const byId = new Map(catalog.map((product) => [product.id, product]));

  if (items.length === 0) {
    return { ...EMPTY_CART, problems: [{ code: "EMPTY", message: "Количката е празна." }] };
  }

  if (!isSupportedCountry(options.countryCode)) {
    problems.push({
      code: "UNSUPPORTED_COUNTRY",
      message: `Не доставяме до ${options.countryCode}.`,
    });
  }

  // ── Редове ────────────────────────────────────────────────────────────
  // Един и същ продукт, добавен два пъти, се слива — иначе се появяват
  // два реда с еднакво заглавие във фактурата.
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      problems.push({
        code: "INVALID_QUANTITY",
        message: "Количеството трябва да е цяло положително число.",
        productId: item.productId,
      });
      continue;
    }
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }

  const draft: Array<{ product: CatalogProduct; quantity: number; gross: Cents }> =
    [];

  for (const [productId, quantity] of merged) {
    const product = byId.get(productId);

    if (!product) {
      problems.push({
        code: "UNKNOWN_PRODUCT",
        message: "Продуктът не съществува.",
        productId,
      });
      continue;
    }
    if (!product.published) {
      problems.push({
        code: "UNPUBLISHED",
        message: `„${product.title}" вече не се продава.`,
        productId,
      });
      continue;
    }
    if (product.stock !== null && quantity > product.stock) {
      problems.push({
        code: "OUT_OF_STOCK",
        message: `От „${product.title}" са налични ${product.stock} бр.`,
        productId,
      });
      continue;
    }

    draft.push({
      product,
      quantity,
      gross: product.priceCents * quantity,
    });
  }

  if (draft.length === 0) {
    return { ...EMPTY_CART, problems: problems.length ? problems : [{ code: "EMPTY", message: "Количката е празна." }] };
  }

  const subtotalCents = draft.reduce((sum, line) => sum + line.gross, 0);

  // ── Отстъпка ──────────────────────────────────────────────────────────
  let discountCents = 0;
  let appliedDiscountCode: string | null = null;

  if (options.discount) {
    const reason = checkDiscount(options.discount, subtotalCents, now);
    if (reason) {
      problems.push({ code: "DISCOUNT_INVALID", message: reason });
    } else {
      const applied = applyDiscount(
        subtotalCents,
        options.discount.kind,
        options.discount.value,
      );
      discountCents = applied.discountCents;
      appliedDiscountCode = options.discount.code;
    }
  }

  // Разпределя се по редове, за да може всеки ред да носи собствена
  // данъчна основа — при смесени ставки общата отстъпка не стига.
  const perLineDiscount = distributeDiscount(
    draft.map((line) => line.gross),
    discountCents,
  );

  const lines: PricedLine[] = draft.map((line, index) => {
    const lineDiscount = perLineDiscount[index];
    const afterDiscount = line.gross - lineDiscount;
    const vatRate = resolveVatRate({
      category: line.product.vatCategory,
      countryCode: options.countryCode,
      ossThresholdExceeded: options.ossThresholdExceeded,
    });

    return {
      productId: line.product.id,
      title: line.product.title,
      kind: line.product.kind,
      quantity: line.quantity,
      unitPriceCents: line.product.priceCents,
      grossCents: line.gross,
      discountCents: lineDiscount,
      netOfDiscountCents: afterDiscount,
      vatRate,
      vatCents: vatFromGross(afterDiscount, vatRate),
    };
  });

  // ── Доставка ──────────────────────────────────────────────────────────
  const physical = lines.filter((line) => line.kind === "PHYSICAL");
  const requiresShipping = physical.length > 0;
  const totalWeightGrams = draft.reduce(
    (sum, line) =>
      line.product.kind === "PHYSICAL"
        ? sum + (line.product.weightGrams ?? 0) * line.quantity
        : sum,
    0,
  );

  let shippingCents = 0;
  let shippingVatCents = 0;

  if (requiresShipping) {
    const zone = findShippingZone(options.shippingRules ?? [], options.countryCode);

    if (!zone) {
      problems.push({
        code: "NO_SHIPPING_ZONE",
        message: `Няма зона за доставка до ${options.countryCode.toUpperCase()}.`,
      });
    } else if (
      zone.maxWeightGrams !== null &&
      totalWeightGrams > zone.maxWeightGrams
    ) {
      problems.push({
        code: "TOO_HEAVY",
        message: "Пратката е над допустимото тегло за онлайн поръчка.",
      });
    } else {
      const goodsAfterDiscount = lines
        .filter((line) => line.kind === "PHYSICAL")
        .reduce((sum, line) => sum + line.netOfDiscountCents, 0);

      const free =
        zone.freeAboveCents !== null && goodsAfterDiscount >= zone.freeAboveCents;
      shippingCents = free ? 0 : zone.priceCents;

      // Доставката следва ставката на стоките, които превозва. При
      // смесени ставки се ползва най-високата — консервативният избор,
      // защото занижено ДДС се плаща от фирмата при проверка.
      const goodsRates = lines
        .filter((line) => line.kind === "PHYSICAL")
        .map((line) => line.vatRate);
      const shippingRate = goodsRates.length ? Math.max(...goodsRates) : 0;
      shippingVatCents = vatFromGross(shippingCents, shippingRate);
    }
  }

  const vatCents =
    lines.reduce((sum, line) => sum + line.vatCents, 0) + shippingVatCents;
  const totalCents =
    lines.reduce((sum, line) => sum + line.netOfDiscountCents, 0) + shippingCents;

  return {
    lines,
    subtotalCents,
    discountCents,
    shippingCents,
    vatCents,
    totalCents,
    currency: "EUR",
    requiresShipping,
    totalWeightGrams,
    appliedDiscountCode,
    problems,
  };
}

/** Може ли количката да продължи към плащане. */
export function isCheckoutable(cart: PricedCart): boolean {
  return cart.lines.length > 0 && cart.problems.length === 0;
}
