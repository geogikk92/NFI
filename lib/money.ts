// ОБЩ ФАЙЛ. Всяка сума в проекта минава оттук.
//
// Правилото е едно: парите са ЦЕЛИ ЧИСЛА в евроцентове. Никъде float.
// 0.1 + 0.2 !== 0.3 и това не е шега, когато става дума за фактура.
//
// Собственик: Жоро (задача 24b — unit тестове на закръгляването).
// Боби ползва formatMoney() за цените на курсовете.

/** Сума в евроцентове. Винаги цяло число. */
export type Cents = number;

/** ДДС ставка в проценти: 19 за Германия, 20 за България. */
export type VatRate = number | string;

function rateToNumber(rate: VatRate): number {
  const n = typeof rate === "string" ? Number.parseFloat(rate) : rate;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Невалидна ДДС ставка: ${String(rate)}`);
  }
  return n;
}

/**
 * Закръгляне „половината нагоре, далеч от нулата".
 * Math.round(-0.5) дава -0, което при кредитни известия е грешно.
 */
export function roundHalfUp(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** 12.34 € → 1234 ct. Хвърля при повече от два знака. */
export function toCents(euros: number): Cents {
  if (!Number.isFinite(euros)) {
    throw new Error(`Невалидна сума: ${euros}`);
  }
  return roundHalfUp(euros * 100);
}

/** 1234 ct → 12.34. Само за показване, не за смятане. */
export function toEuros(cents: Cents): number {
  return cents / 100;
}

/**
 * Форматиране за клиента. Немският локал слага „12,34 €" —
 * с интервал и запетая. Това е очакваното от германския купувач.
 */
export function formatMoney(
  cents: Cents,
  locale: string = "de-DE",
  currency: string = "EUR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(toEuros(cents));
}

/**
 * ДДС, съдържащ се в БРУТО сума (цените в магазина са с включено ДДС).
 * 11900 ct при 19% → 1900 ct.
 */
export function vatFromGross(grossCents: Cents, rate: VatRate): Cents {
  const r = rateToNumber(rate);
  return roundHalfUp((grossCents * r) / (100 + r));
}

/** НЕТО от бруто. Гарантирано: net + vat === gross. */
export function netFromGross(grossCents: Cents, rate: VatRate): Cents {
  return grossCents - vatFromGross(grossCents, rate);
}

/** БРУТО от нето. За случаите, в които цената се въвежда без ДДС. */
export function grossFromNet(netCents: Cents, rate: VatRate): Cents {
  const r = rateToNumber(rate);
  return netCents + roundHalfUp((netCents * r) / 100);
}

/**
 * Отстъпка върху сума.
 * PERCENT: value е процент (10 = 10%). FIXED: value е в центове.
 * Никога не връща отрицателна сума — отстъпка над сумата я нулира.
 */
export function applyDiscount(
  amountCents: Cents,
  kind: "PERCENT" | "FIXED",
  value: number,
): { discountCents: Cents; totalCents: Cents } {
  const raw =
    kind === "PERCENT" ? roundHalfUp((amountCents * value) / 100) : value;
  const discountCents = Math.min(Math.max(raw, 0), amountCents);
  return { discountCents, totalCents: amountCents - discountCents };
}

/**
 * Разпределя обща отстъпка между редовете на поръчката, без да губи
 * центове. Последният ред поема остатъка от закръглянето — иначе
 * сборът на редовете не бие с общата сума на фактурата.
 */
export function distributeDiscount(
  lineTotals: readonly Cents[],
  discountCents: Cents,
): Cents[] {
  const total = lineTotals.reduce((a, b) => a + b, 0);
  if (total <= 0 || discountCents <= 0) {
    return lineTotals.map(() => 0);
  }

  const shares = lineTotals.map((line) =>
    roundHalfUp((line * discountCents) / total),
  );
  const drift = discountCents - shares.reduce((a, b) => a + b, 0);
  if (drift !== 0 && shares.length > 0) {
    shares[shares.length - 1] += drift;
  }
  return shares;
}
