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
  const rounded = value < 0 ? -Math.round(-value) : Math.round(value);
  // Нормализира -0. При сравнение -0 === 0, но Intl го изписва като
  // „-0,00 €", а JSON.stringify го дава като "-0" — и двете стигат до
  // клиента, ако не се хване тук.
  return rounded === 0 ? 0 : rounded;
}

/**
 * 12.34 € → 1234 ct.
 *
 * Хвърля при повече от два знака, вместо да закръгли тихо. Цена 19.999,
 * дошла от импорт или от невнимателно поле в админа, иначе влиза в базата
 * като 20.00 € без никакъв сигнал и разликата излиза чак пред
 * счетоводителя.
 */
export function toCents(euros: number): Cents {
  if (!Number.isFinite(euros)) {
    throw new Error(`Невалидна сума: ${euros}`);
  }

  const scaled = euros * 100;
  const cents = roundHalfUp(scaled);

  // Допускът поема само шума на IEEE 754 при две десетични (1.005 * 100
  // дава 100.49999999999999). Трети знак отклонява поне с 0.1 в центове —
  // три порядъка над допуска, така че не може да се промъкне.
  const tolerance = Math.max(1e-6, Math.abs(scaled) * Number.EPSILON * 4);
  if (Math.abs(scaled - cents) > tolerance) {
    throw new Error(
      `Сума с повече от два знака след запетаята: ${euros}. ` +
        "Закръгли явно, преди да я подадеш.",
    );
  }

  if (!Number.isSafeInteger(cents)) {
    throw new Error(`Сума извън безопасния диапазон: ${euros}`);
  }

  return cents;
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
 * Разпределя обща отстъпка между редовете на поръчката, без да губи и без
 * да измисля центове.
 *
 * Гарантира три неща едновременно:
 *   1. сборът на дяловете е точно `discountCents` (клампнат до базата);
 *   2. никой дял не надхвърля собствения си ред и никой не е отрицателен —
 *      иначе се появява ред с отрицателна данъчна основа, който не минава
 *      пред счетоводителя (ЗДДС чл. 114, т. 10);
 *   3. резултатът е един и същ при всяко извикване — фактурата трябва да
 *      се възпроизвежда еднакво при повторно генериране и при сверяване.
 *
 * Метод на най-големия остатък: първо цели центове надолу, после
 * остатъкът се раздава по един цент на редовете, които са загубили
 * най-много от закръглянето.
 */
export function distributeDiscount(
  lineTotals: readonly Cents[],
  discountCents: Cents,
): Cents[] {
  const shares = lineTotals.map(() => 0);

  // Базата са само положителните редове. Ако отрицателен ред участваше в
  // нея, пропорциите на останалите щяха да се раздуят.
  const base = lineTotals.reduce((sum, line) => sum + Math.max(line, 0), 0);
  if (base <= 0 || discountCents <= 0) {
    return shares;
  }

  const budget = Math.min(discountCents, base);

  // floor((line * budget) / base) <= line за всяко budget <= base, така че
  // дялът не може да надскочи реда си още преди раздаването на остатъка.
  const remainders: Array<{ index: number; remainder: number; line: Cents }> =
    [];
  let assigned = 0;

  lineTotals.forEach((line, index) => {
    if (line <= 0) return;
    const exact = (line * budget) / base;
    const floored = Math.floor(exact);
    shares[index] = floored;
    assigned += floored;
    remainders.push({ index, remainder: exact - floored, line });
  });

  // Детерминиран ред: по-голям остатък, после по-голям ред, после индекс.
  // Без третия критерий резултатът зависи от стабилността на sort, която
  // спецификацията не гарантира за произволен компаратор.
  remainders.sort(
    (a, b) =>
      b.remainder - a.remainder || b.line - a.line || a.index - b.index,
  );

  let leftover = budget - assigned;
  for (const entry of remainders) {
    if (leftover <= 0) break;
    if (shares[entry.index] < entry.line) {
      shares[entry.index] += 1;
      leftover -= 1;
    }
  }

  return shares;
}
