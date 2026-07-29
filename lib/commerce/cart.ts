// ТЕРИТОРИЯ НА ЖОРО · задача M9 — състояние на количката.
//
// Количката живее в бисквитка и съдържа САМО productId и количество.
// Никаква цена, никакво заглавие — иначе клиентът диктува какво плаща.
// Сметката се прави наново при всяко зареждане (виж pricing.ts).
//
// Защо бисквитка, а не ред в базата: гостите пазаруват, без да се
// регистрират, а количка в базата за анонимен посетител означава запис,
// който после трябва да се чисти с cron. Бисквитката изтича сама.
//
// Тук са ЧИСТИТЕ функции. Достъпът до бисквитката е в cart-cookie.ts,
// за да остане този файл тестваем без Next контекст.

export const CART_COOKIE = "nfi_cart";

/** 30 дни. Достатъчно да се върне човек, недостатъчно да остарее цената. */
export const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Бисквитките са до 4 KB. Границите пазят от препълване. */
export const MAX_CART_LINES = 40;
export const MAX_QUANTITY_PER_LINE = 99;

export interface CartLine {
  productId: string;
  quantity: number;
}

/**
 * Компактен запис: [["id", 2], ["id2", 1]].
 * Обектната форма изяжда двойно повече място в бисквитката.
 */
type SerializedLine = [string, number];

export function serializeCart(lines: readonly CartLine[]): string {
  const payload: SerializedLine[] = lines.map((line) => [
    line.productId,
    line.quantity,
  ]);
  return JSON.stringify(payload);
}

/**
 * Разчита бисквитката. НИКОГА не хвърля — повредена бисквитка означава
 * празна количка, не счупена страница. Клиентът може да е сложил в нея
 * какво ли не.
 */
export function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const lines: CartLine[] = [];

  for (const entry of parsed) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;

    const [productId, quantity] = entry;
    if (typeof productId !== "string" || productId.length === 0) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity)) continue;
    if (quantity <= 0) continue;

    lines.push({
      productId,
      quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE),
    });

    if (lines.length >= MAX_CART_LINES) break;
  }

  return mergeLines(lines);
}

/** Слива дублирани редове. Един продукт — един ред. */
export function mergeLines(lines: readonly CartLine[]): CartLine[] {
  const merged = new Map<string, number>();

  for (const line of lines) {
    const next = (merged.get(line.productId) ?? 0) + line.quantity;
    merged.set(line.productId, Math.min(next, MAX_QUANTITY_PER_LINE));
  }

  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

export function addLine(
  lines: readonly CartLine[],
  productId: string,
  quantity = 1,
): CartLine[] {
  if (!Number.isInteger(quantity) || quantity <= 0) return [...lines];

  const existing = lines.find((line) => line.productId === productId);

  if (!existing && lines.length >= MAX_CART_LINES) {
    // Мълчаливото отрязване би изглеждало като изчезнал продукт.
    throw new Error("Количката е пълна.");
  }

  return mergeLines([...lines, { productId, quantity }]);
}

export function removeLine(
  lines: readonly CartLine[],
  productId: string,
): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

/** Количество 0 или по-малко маха реда — така „минус" в UI-я е достатъчен. */
export function setQuantity(
  lines: readonly CartLine[],
  productId: string,
  quantity: number,
): CartLine[] {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return removeLine(lines, productId);
  }

  const capped = Math.min(quantity, MAX_QUANTITY_PER_LINE);

  return lines.map((line) =>
    line.productId === productId ? { ...line, quantity: capped } : line,
  );
}

/** Общият брой артикули — за значката до иконата на количката. */
export function countItems(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
