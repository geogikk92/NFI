// hreflang за метаданните.
//
// Без това търсачката вижда /de/kurse, /bg/kurse и /en/kurse като три
// почти еднакви страници и решава сама коя да покаже — обикновено грешната.
// С alternates всяка версия сочи останалите и казва „това е същото
// съдържание на друг език".
//
// `x-default` е версията за посетител, чийто език не поддържаме — немската,
// защото тя е основната.

import type { Metadata } from "next";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Сглобява alternates за даден път БЕЗ езиковия сегмент.
 *
 * Пътят се подава без език и без водеща наклонена черта:
 *   localeAlternates("de", "kurse")     → /de/kurse, /bg/kurse, /en/kurse
 *   localeAlternates("bg", "")          → началните страници
 */
export function localeAlternates(
  locale: Locale,
  pathWithoutLocale: string = "",
): Metadata["alternates"] {
  const suffix = pathWithoutLocale
    ? `/${pathWithoutLocale.replace(/^\/+/, "")}`
    : "";

  const languages: Record<string, string> = {};
  for (const item of LOCALES) {
    languages[item] = `/${item}${suffix}`;
  }
  languages["x-default"] = `/${DEFAULT_LOCALE}${suffix}`;

  return {
    canonical: `/${locale}${suffix}`,
    languages,
  };
}
