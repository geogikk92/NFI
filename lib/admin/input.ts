// АДМИН · основа — разбор на това, което човек е написал в поле.
//
// ЧИСТ модул: без база, без "server-only". Ползва се и от server actions, и
// от тестове.
//
// Съществува, защото три неща се чупят тихо, ако всяко поле се разбира на
// място:
//
//   1. ПАРИТЕ. Числата в базата са ЦЕЛИ ЦЕНТОВЕ (виж lib/money.ts). Пътят
//      „текст → parseFloat → * 100" дава 12949 вместо 12950 за „129,50" при
//      определени стойности и разликата излиза чак пред счетоводителя.
//      Затова тук НЯМА нито едно число с плаваща запетая — цялото и
//      дробното се събират като цели числа.
//
//   2. РАЗДЕЛИТЕЛЯТ ЗА ХИЛЯДИ. „1.299" е 1299 евро на немски и 1,299 евро
//      на английски. Няма как да се познае, затова НЕ СЕ ГАДАЕ — въвеждане
//      с разделител за хиляди се отхвърля с изрично съобщение.
//
//   3. ДАТИТЕ. `<input type="date">` дава „2026-12-31" без час и без зона.
//      Поемем ли го наивно като UTC полунощ, „валидно до 31.12" се показва
//      в списъка като 01.01 — сайтът форматира в Europe/Berlin, а 31.12
//      23:59 UTC вече е 1 януари в Берлин.

import { TIME_ZONE } from "@/lib/intl";

/**
 * Разборът или успява със стойност, или се проваля с ГОТОВО СЪОБЩЕНИЕ.
 *
 * Съобщението е на български и е за човек, не код за превод: админът е
 * само на български (виж коментара в lib/admin/queries.ts).
 */
export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

function fail<T>(error: string): ParseResult<T> {
  return { ok: false, error };
}

// ─────────────────────────────────────────────────────────────────────────
//  Текст
// ─────────────────────────────────────────────────────────────────────────

/**
 * Незадължително текстово поле.
 *
 * Празното става `null`, а НЕ празен низ: в базата "" и NULL се държат
 * различно — `descriptionDe: ""` минава за налично описание и публичната
 * страница показва празен абзац вместо да падне на резервния език.
 */
export function optionalText(
  raw: unknown,
  max: number,
  label: string,
): ParseResult<string | null> {
  const text = String(raw ?? "").trim();
  if (text === "") return ok(null);

  if (text.length > max) {
    return fail(`${label}: най-много ${max} знака (сега са ${text.length}).`);
  }

  return ok(text);
}

/** Задължително текстово поле. */
export function requiredText(
  raw: unknown,
  { min = 1, max, label }: { min?: number; max: number; label: string },
): ParseResult<string> {
  const text = String(raw ?? "").trim();

  if (text.length === 0) return fail(`${label}: полето е задължително.`);

  if (text.length < min) {
    return fail(`${label}: най-малко ${min} знака.`);
  }

  if (text.length > max) {
    return fail(`${label}: най-много ${max} знака (сега са ${text.length}).`);
  }

  return ok(text);
}

/**
 * Стойност от падащо меню.
 *
 * `includes` върху изрично изброените стойности, не `in` върху обект:
 * операторът `in` обхожда и прототипната верига, заради което „toString"
 * минава за валиден избор. Същият капан вече е поправян в
 * lib/admin/queries.ts и в lib/cms/courses.ts.
 */
export function oneOf<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  label: string,
): ParseResult<T> {
  const value = String(raw ?? "").trim();

  if (value === "") return fail(`${label}: не е избрано нищо.`);

  if (!allowed.includes(value as T)) {
    return fail(`${label}: „${value}“ не е сред допустимите стойности.`);
  }

  return ok(value as T);
}

// ─────────────────────────────────────────────────────────────────────────
//  Пари
// ─────────────────────────────────────────────────────────────────────────

/**
 * Горна граница: 999 999,99 €.
 *
 * Не е произволна — колоната е Int, тоест 32 бита, и се препълва на
 * 21 474 836,47 €. Препълването в Postgres не закръгля, а хвърля, и
 * админът вижда сурова грешка от драйвера вместо съобщение. Границата тук
 * е два порядъка под опасната и пак е абсурдно висока за езиков курс.
 */
export const MAX_MONEY_CENTS = 99_999_999;

/** Празни знаци, които хората ползват за разделяне на хилядите. */
const SPACES = /[\s  ]/g;

/**
 * „129,50" → 12950 цента.
 *
 * Приема запетая и точка за десетичен знак — човек пише и двете. Не приема
 * разделител за хиляди, защото „1.299" е двусмислено (виж главата на
 * файла). Интервалите се махат, така че „1 299,50" минава.
 */
export function parseMoneyToCents(
  raw: unknown,
  label: string,
): ParseResult<number> {
  const text = String(raw ?? "").replace(SPACES, "");

  if (text === "") return fail(`${label}: полето е задължително.`);

  if (text.startsWith("-")) {
    return fail(`${label}: сумата не може да е отрицателна.`);
  }

  // Два разделителя означават разделител за хиляди — не се гадае.
  const separators = (text.match(/[.,]/g) ?? []).length;
  if (separators > 1) {
    return fail(
      `${label}: напиши сумата без разделител за хиляди — „1299,50“, ` +
        "не „1.299,50“.",
    );
  }

  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text);

  if (!match) {
    // Три знака след запетаята се хващат тук и НЕ се закръглят тихо:
    // „19,999" би влязло като 20,00 € без никакъв сигнал.
    if (/^\d+[.,]\d{3,}$/.test(text)) {
      return fail(`${label}: най-много два знака след запетаята.`);
    }
    return fail(`${label}: „${text}“ не е сума. Пример: 129,50`);
  }

  const whole = match[1];
  // „129,5" са 50 цента, не 5 — дробната част се допълва отдясно.
  const fraction = (match[2] ?? "").padEnd(2, "0");

  // Цяла аритметика от начало до край. Никакво умножение по 100 на число
  // с плаваща запетая.
  const cents = Number(whole) * 100 + Number(fraction);

  if (!Number.isSafeInteger(cents)) {
    return fail(`${label}: сумата е прекалено голяма.`);
  }

  if (cents > MAX_MONEY_CENTS) {
    return fail(
      `${label}: сумата надхвърля ${MAX_MONEY_CENTS / 100} €. Провери дали ` +
        "не си сложил един нолев знак повече.",
    );
  }

  return ok(cents);
}

/** Като горното, но празното е позволено и дава `null`. */
export function parseOptionalMoneyToCents(
  raw: unknown,
  label: string,
): ParseResult<number | null> {
  if (String(raw ?? "").replace(SPACES, "") === "") return ok(null);
  return parseMoneyToCents(raw, label);
}

// ─────────────────────────────────────────────────────────────────────────
//  Цели числа
// ─────────────────────────────────────────────────────────────────────────

/**
 * Брой седмици, часове, места, грамове, подредба.
 *
 * `Number.parseInt` НЕ се ползва: той чете „12 броя" като 12 и „12.9" като
 * 12, тоест мълчаливо приема сгрешено въвеждане. Тук низът трябва да е
 * само цифри.
 */
export function parseWholeNumber(
  raw: unknown,
  {
    min = 0,
    max,
    label,
  }: { min?: number; max: number; label: string },
): ParseResult<number> {
  const text = String(raw ?? "").replace(SPACES, "");

  if (text === "") return fail(`${label}: полето е задължително.`);

  const negative = text.startsWith("-");
  const digits = negative ? text.slice(1) : text;

  if (!/^\d+$/.test(digits)) {
    return fail(`${label}: „${text}“ не е цяло число.`);
  }

  const value = (negative ? -1 : 1) * Number(digits);

  if (!Number.isSafeInteger(value)) {
    return fail(`${label}: числото е прекалено голямо.`);
  }

  if (value < min) return fail(`${label}: не може да е под ${min}.`);
  if (value > max) return fail(`${label}: не може да е над ${max}.`);

  return ok(value);
}

/** Като горното, но празното дава `null`. */
export function parseOptionalWholeNumber(
  raw: unknown,
  options: { min?: number; max: number; label: string },
): ParseResult<number | null> {
  if (String(raw ?? "").replace(SPACES, "") === "") return ok(null);
  return parseWholeNumber(raw, options);
}

// ─────────────────────────────────────────────────────────────────────────
//  Дати
// ─────────────────────────────────────────────────────────────────────────

/**
 * Отместването на часовата зона в милисекунди за даден МОМЕНТ.
 *
 * Начинът е заобиколен, защото JavaScript няма пряк въпрос „колко е
 * отместването на Europe/Berlin на 1 септември": форматираме момента в
 * зоната, разчитаме частите и ги сглобяваме обратно все едно са UTC.
 * Разликата между двете е точно отместването.
 */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    // Полунощ идва като „24" в някои среди — стандартът позволява и двете.
    get("hour") % 24,
    get("minute"),
    get("second"),
    // Милисекундите се пренасят от самия момент, а НЕ се нулират:
    // `formatToParts` не ги дава и нулата тук прави отместването с точно
    // толкова милисекунди по-малко. За края на деня (…59.999) това връщаше
    // 31.12 23:00:00.997Z вместо 22:59:59.999Z, тоест пак 1 януари в Берлин
    // — точно дефектът, който функцията трябваше да предотврати.
    instant.getUTCMilliseconds(),
  );

  return asUtc - instant.getTime();
}

/**
 * Местен час в Europe/Berlin → моментът, който отговаря на него.
 *
 * Две минавания, не едно: първото гади отместването по UTC стойността,
 * второто го сверява на вече поправения момент. Разликата има значение
 * само в двата часа около смяната на времето, но тогава едно минаване
 * бърка с цял час.
 */
function berlinInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, ms);

  let instant = new Date(naive - zoneOffsetMs(new Date(naive), TIME_ZONE));
  instant = new Date(naive - zoneOffsetMs(instant, TIME_ZONE));

  return instant;
}

/** Разчита „2026-12-31" от `<input type="date">`. */
function parseDateParts(
  text: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // 31 февруари минава проверката горе, но не съществува. Date го „поправя"
  // на 3 март — затова се сверява, че сглобената дата е същата.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/**
 * Дата → НАЧАЛОТО на този ден в Берлин.
 *
 * За „курсът започва на 1 септември". Върнатият момент е 31.08 22:00 UTC
 * през лятото — точно затова функцията съществува: наивното UTC полунощ
 * се показва вярно само по случайност и се разминава при първата дата,
 * форматирана в друга зона.
 */
export function parseDateStart(
  raw: unknown,
  label: string,
): ParseResult<Date | null> {
  const text = String(raw ?? "").trim();
  if (text === "") return ok(null);

  const parts = parseDateParts(text);
  if (!parts) return fail(`${label}: „${text}“ не е валидна дата.`);

  return ok(berlinInstant(parts.year, parts.month, parts.day, 0, 0, 0, 0));
}

/**
 * Дата → КРАЯ на този ден в Берлин.
 *
 * За „промоцията важи до 31 декември". Без това „до 31.12" изтича по обяд
 * на 31-ви (при UTC полунощ) или се показва в списъка като 01.01 (при
 * UTC 23:59) — първото ощетява клиента, второто обърква админа.
 */
export function parseDateEnd(
  raw: unknown,
  label: string,
): ParseResult<Date | null> {
  const text = String(raw ?? "").trim();
  if (text === "") return ok(null);

  const parts = parseDateParts(text);
  if (!parts) return fail(`${label}: „${text}“ не е валидна дата.`);

  return ok(
    berlinInstant(parts.year, parts.month, parts.day, 23, 59, 59, 999),
  );
}

/**
 * Обратното: момент → „2026-12-31" за `defaultValue` на полето.
 *
 * ЗАДЪЛЖИТЕЛНО минава през часовата зона на сайта. `toISOString().slice(0, 10)`
 * е грешното решение и е капан: за край на деня в Берлин (31.12 22:59 UTC)
 * то дава верния ден, но за начало на деня (31.12 23:00 UTC на 30-ти) дава
 * предишния — тоест админът отваря курс за 1 септември и вижда 31 август.
 */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  // en-CA дава точно „2026-12-31" — същият ред, който полето очаква.
  return parts;
}
