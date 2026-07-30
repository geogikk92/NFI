// ОБЩ ФАЙЛ · задача 2b.
// Писано от Жоро, докато Боби е в отпуск.
//
// Форматиране за de-DE и bg-BG. Съществува, защото немските формати са
// различни от българските НАВСЯКЪДЕ — точка вместо наклонена черта в
// датата, точка за хиляди, запетая за десетични, „und" вместо „и". Ръчното
// им сглобяване с шаблонни низове е сигурен път към „15/03/2026" на
// немска страница.
//
// Паричните суми са в lib/money.ts (formatMoney) — там са, защото са
// неразделни от Cents.

export type Locale = "de" | "bg";

const LOCALE_TAGS: Record<Locale, string> = {
  de: "de-DE",
  bg: "bg-BG",
};

/**
 * Часовата зона на института. Не се разчита на тази на сървъра.
 *
 * ВНИМАНИЕ: нарочно е различна от зоната в lib/counter.ts
 * (`Europe/Sofia`). Не е недоглеждане:
 *   • ТУК се показват часове на КЛИЕНТА — той е в Германия, курсът е в
 *     Нюрнберг, „начало 18:00" значи 18:00 нюрнбергско време;
 *   • ТАМ се определя счетоводната година по седалището на ДРУЖЕСТВОТО —
 *     то е българско и годината се приключва по българско време.
 * Двете съвпадат по часова разлика днес, но са различни решения и не
 * бива да се обединяват.
 */
export const TIME_ZONE = "Europe/Berlin";

function tag(locale: Locale): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.de;
}

// Intl конструкторите не са безплатни, а се викат в цикли по списъци.
const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function dateFormatter(
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `d:${locale}:${JSON.stringify(options)}`;
  let formatter = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag(locale), {
      timeZone: TIME_ZONE,
      ...options,
    });
    cache.set(key, formatter);
  }
  return formatter;
}

function numberFormatter(
  locale: Locale,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `n:${locale}:${JSON.stringify(options)}`;
  let formatter = cache.get(key) as Intl.NumberFormat | undefined;
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag(locale), options);
    cache.set(key, formatter);
  }
  return formatter;
}

/** 15.03.2026 */
export function formatDate(date: Date, locale: Locale = "de"): string {
  return dateFormatter(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/** 15. März 2026 */
export function formatDateLong(date: Date, locale: Locale = "de"): string {
  return dateFormatter(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** 15.03.2026, 14:30 */
export function formatDateTime(date: Date, locale: Locale = "de"): string {
  return dateFormatter(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** 14:30 */
export function formatTime(date: Date, locale: Locale = "de"): string {
  return dateFormatter(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Машинно четимата дата за атрибута `dateTime` на <time>.
 * ЗАДЪЛЖИТЕЛНА е при показана дата — екранните четци и търсачките четат
 * нея, не текста.
 */
export function toDateTimeAttribute(date: Date): string {
  return date.toISOString();
}

/** 1.234,56 на немски; 1 234,56 на български */
export function formatNumber(
  value: number,
  locale: Locale = "de",
  options: Intl.NumberFormatOptions = {},
): string {
  return numberFormatter(locale, options).format(value);
}

/** 45 % — с непрекъсваем интервал преди знака, както е в немския. */
export function formatPercent(
  fraction: number,
  locale: Locale = "de",
  fractionDigits = 0,
): string {
  return numberFormatter(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction);
}

/**
 * „A, B und C" на немски; „A, B и C" на български.
 * Ръчното сглобяване с „, " дава оксфордска запетая, която в немския е грешна.
 */
export function formatList(
  items: readonly string[],
  locale: Locale = "de",
  type: "conjunction" | "disjunction" = "conjunction",
): string {
  return new Intl.ListFormat(tag(locale), { style: "long", type }).format(items);
}

/**
 * „vor 3 Tagen" / „in 2 Wochen"
 *
 * `numeric: "always"` е нарочно, не пропуск. С `"auto"` форматерът връща
 * КАЛЕНДАРНИ думи („gestern", „letzte Woche") за ±1, а тук се смята
 * ИЗТЕКЛО време по фиксирани константи. Двете не си съответстват:
 * 30 часа са 1.25 дни → закръглят се на 1 → „gestern", макар денят да е
 * завчерашен. Затова се изписва „vor 1 Tag", което е винаги вярно.
 *
 * Ако някога трябват истински календарни думи, те се смятат от разликата
 * в КАЛЕНДАРНИ дни в TIME_ZONE, а не от продължителност.
 */
export function formatRelative(
  date: Date,
  locale: Locale = "de",
  now: Date = new Date(),
): string {
  const formatter = new Intl.RelativeTimeFormat(tag(locale), {
    numeric: "always",
  });

  const diffMs = date.getTime() - now.getTime();
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 1000 * 60 * 60 * 24 * 365],
    ["month", 1000 * 60 * 60 * 24 * 30],
    ["week", 1000 * 60 * 60 * 24 * 7],
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60],
  ];

  for (const [unit, ms] of units) {
    const value = diffMs / ms;
    if (Math.abs(value) >= 1) {
      return formatter.format(Math.round(value), unit);
    }
  }

  return formatter.format(0, "second");
}

/**
 * Продължителност на курс: „12 Wochen · 4 Std./Woche".
 * Немското съкращение е „Std.", не „h" — институтът пише на немски.
 */
export function formatCourseDuration(
  weeks: number | null,
  hoursPerWeek: number | null,
  locale: Locale = "de",
): string | null {
  const parts: string[] = [];

  if (weeks) {
    parts.push(
      locale === "de"
        ? `${weeks} ${weeks === 1 ? "Woche" : "Wochen"}`
        : `${weeks} ${weeks === 1 ? "седмица" : "седмици"}`,
    );
  }

  if (hoursPerWeek) {
    parts.push(
      locale === "de"
        ? `${hoursPerWeek} Std./Woche`
        : `${hoursPerWeek} ч/седмица`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
