// Форматиране на дати и числа за ТРИТЕ езика.
//
// Съществува по една причина: lib/intl.ts още познава само `de` и `bg`.
// Тя е общ файл и не е наша територия — разширяването на нейния `Locale`
// би се блъснало с работата по нея. Затова тук de и bg се ПРЕПРАЩАТ към
// нея (нула дублирана логика), а en се форматира с en-GB направо през
// Intl — но със същата TIME_ZONE, внесена оттам, за да няма два източника
// на истина за часовата зона.
//
// Когато lib/intl.ts приеме трети език, целият файл се изтрива и
// извикванията се пренасочват обратно към нея.

import {
  TIME_ZONE,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatNumber,
  formatPercent,
  type Locale as IntlLocale,
} from "@/lib/intl";
import { LOCALE_TAGS, type Locale } from "@/lib/i18n/config";

/** Английският е единственият, който lib/intl.ts не покрива. */
function isCoveredByIntl(locale: Locale): locale is IntlLocale {
  return locale !== "en";
}

// Intl конструкторите не са безплатни, а се викат в цикли по списъци.
const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function enDate(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d:${JSON.stringify(options)}`;
  let formatter = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE_TAGS.en, {
      timeZone: TIME_ZONE,
      ...options,
    });
    cache.set(key, formatter);
  }
  return formatter;
}

function enNumber(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `n:${JSON.stringify(options)}`;
  let formatter = cache.get(key) as Intl.NumberFormat | undefined;
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE_TAGS.en, options);
    cache.set(key, formatter);
  }
  return formatter;
}

/** 15.03.2026 · 15/03/2026 */
export function dateShort(locale: Locale, date: Date): string {
  return isCoveredByIntl(locale)
    ? formatDate(date, locale)
    : enDate({ day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** 15. März 2026 · 15 March 2026 */
export function dateLong(locale: Locale, date: Date): string {
  return isCoveredByIntl(locale)
    ? formatDateLong(date, locale)
    : enDate({ day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** 15.03.2026, 14:30 */
export function dateTime(locale: Locale, date: Date): string {
  return isCoveredByIntl(locale)
    ? formatDateTime(date, locale)
    : enDate({
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}

export function decimal(
  locale: Locale,
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return isCoveredByIntl(locale)
    ? formatNumber(value, locale, options)
    : enNumber(options).format(value);
}

/** 45 % */
export function percent(
  locale: Locale,
  fraction: number,
  fractionDigits = 0,
): string {
  return isCoveredByIntl(locale)
    ? formatPercent(fraction, locale, fractionDigits)
    : enNumber({
        style: "percent",
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(fraction);
}

/**
 * Тагът за formatMoney от lib/money.ts — тя приема пълен BCP 47 таг, не
 * нашия кратък код, и затова покрива и трите езика без промяна.
 */
export function moneyTag(locale: Locale): string {
  return LOCALE_TAGS[locale];
}
