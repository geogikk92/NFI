// Текстовете на страницата за бисквитки.
//
// Съгласието важи за ТЕКСТА, който човекът е видял (Art. 7 GDPR), а
// версията се пази в ConsentLog. Затова преводите тук описват точно
// същите категории като немския — превод, който обещава друго, прави
// съгласието невалидно.

import type { Locale } from "@/lib/i18n/config";

const de = {
  metaTitle: "Cookie-Einstellungen",
  title: "Cookie-Einstellungen",
  lead:
    "Sie können Ihre Entscheidung jederzeit ändern. Externe Inhalte werden ohne Ihre Einwilligung nicht geladen — nicht nur ausgeblendet.",
  currentPrefix: "Ihre aktuelle Auswahl vom",
  textVersion: (version: string) => `Textfassung ${version}`,
  noSelection:
    "Sie haben noch keine Auswahl getroffen. Es sind nur technisch notwendige Cookies aktiv.",
  legend: "Cookie-Kategorien",
  necessaryLabel: "Notwendig · immer aktiv",
  necessaryBody:
    "Sitzung, Warenkorb und diese Auswahl selbst. Ohne sie funktioniert die Seite nicht, deshalb sind sie nicht abwählbar.",
  functionalLabel: "Externe Inhalte",
  functionalBody:
    "Videos von Vimeo und GoTo. Beim Laden erhalten diese Dienste Ihre IP-Adresse.",
  analyticsLabel: "Statistik",
  analyticsBody: "Anonyme Auswertung, welche Seiten gelesen werden.",
  save: "Auswahl speichern",
  rejectAll: "Alles ablehnen",
  footnote: (version: string) =>
    `Wenn wir den Text dieser Einwilligung ändern, fragen wir erneut — Ihre Zustimmung gilt immer für die Fassung, die Sie gesehen haben. Aktuelle Fassung: ${version}.`,
};

type CookiesCopy = typeof de;

const bg: CookiesCopy = {
  metaTitle: "Настройки за бисквитки",
  title: "Настройки за бисквитки",
  lead:
    "Можеш да промениш решението си по всяко време. Външно съдържание не се зарежда без твоето съгласие — не просто се скрива.",
  currentPrefix: "Текущият ти избор от",
  textVersion: (version: string) => `редакция на текста ${version}`,
  noSelection:
    "Още не си избрал. Активни са само технически необходимите бисквитки.",
  legend: "Категории бисквитки",
  necessaryLabel: "Необходими · винаги активни",
  necessaryBody:
    "Сесията, количката и самият този избор. Без тях сайтът не работи, затова не могат да се изключат.",
  functionalLabel: "Външно съдържание",
  functionalBody:
    "Видеа от Vimeo и GoTo. При зареждане тези услуги получават твоя IP адрес.",
  analyticsLabel: "Статистика",
  analyticsBody: "Анонимна обработка кои страници се четат.",
  save: "Запази избора",
  rejectAll: "Откажи всичко",
  footnote: (version: string) =>
    `Ако променим текста на това съгласие, ще попитаме отново — съгласието ти важи винаги за редакцията, която си видял. Текуща редакция: ${version}.`,
};

const en: CookiesCopy = {
  metaTitle: "Cookie settings",
  title: "Cookie settings",
  lead:
    "You can change your decision at any time. External content is not loaded without your consent — not merely hidden.",
  currentPrefix: "Your current choice from",
  textVersion: (version: string) => `text version ${version}`,
  noSelection:
    "You haven't made a choice yet. Only technically necessary cookies are active.",
  legend: "Cookie categories",
  necessaryLabel: "Necessary · always on",
  necessaryBody:
    "Session, cart and this choice itself. The site does not work without them, so they cannot be switched off.",
  functionalLabel: "External content",
  functionalBody:
    "Videos from Vimeo and GoTo. On loading, those services receive your IP address.",
  analyticsLabel: "Statistics",
  analyticsBody: "Anonymous analysis of which pages are read.",
  save: "Save choice",
  rejectAll: "Reject all",
  footnote: (version: string) =>
    `If we change the wording of this consent, we ask again — your consent always applies to the version you saw. Current version: ${version}.`,
};

const COPY: Record<Locale, CookiesCopy> = { de, bg, en };

export function cookiesCopy(locale: Locale): CookiesCopy {
  return COPY[locale] ?? COPY.de;
}
