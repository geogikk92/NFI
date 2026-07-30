// Многоезичие · три езика.
//
// ЧИСТ модул: без база и без next/headers, за да се ползва и от middleware,
// и от клиентски компоненти.
//
// Кой език за кого:
//   bg — ОСНОВНИЯТ. Мокъпът, одобрен от клиентката, е целият на български:
//        целевата група са българи, които живеят и работят в Германия и
//        търсят курс по немски на своя език. Немският е ПРЕДМЕТЪТ, не
//        езикът на сайта.
//   de — за немскоговорящи: институции, партньори, немци, търсещи
//        български.
//   en — за всички останали.
//
// АДМИНЪТ е само на български и НЕ минава през тази машинария — виж
// app/admin/. Причината: Василена работи на български, а превеждането на
// админ интерфейс е чиста загуба.

export const LOCALES = ["de", "bg", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Езикът, когато не можем да разпознаем нищо. */
export const DEFAULT_LOCALE: Locale = "bg";

/** Пълните BCP 47 тагове — за <html lang> и за Intl. */
export const LOCALE_TAGS: Record<Locale, string> = {
  de: "de-DE",
  bg: "bg-BG",
  en: "en-GB",
};

/** Как езикът се нарича на СВОЯ език — така се изписва в превключвателя. */
export const LOCALE_NAMES: Record<Locale, string> = {
  de: "Deutsch",
  bg: "Български",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Непознатото пада към езика по подразбиране, вместо да гърми. */
export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Избира стойност според езика с ВЕРИГА от резервни варианти.
 *
 * Редът е нарочен: искания език → български (основният; в него въвежда
 * админът, значи винаги е попълнен) → немски → английски.
 * Така липсващ превод дава смислен текст, а не празно място.
 */
export function pick(
  locale: Locale,
  values: Partial<Record<Locale, string | null | undefined>>,
): string {
  // Редът е нарочен: искан език → български (основният, в него въвежда
  // админът, значи винаги е попълнен) → немски → английски.
  const chain: Locale[] = [locale, "bg", "de", "en"];

  for (const candidate of chain) {
    const value = values[candidate];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return "";
}

/**
 * Разчита предпочитания език от Accept-Language.
 *
 * Ползва се САМО когато адресът не носи език — тоест при първото
 * попадане на голия домейн. След това езикът е в адреса и главата не се
 * гледа, за да не пренасочваме човек, който изрично е избрал друг език.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.split("=")[1]) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const entry of ranked) {
    // „de-AT" също е немски.
    const base = entry.tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return DEFAULT_LOCALE;
}

/** Адрес със сменен език, при запазен път. */
export function switchLocalePath(
  pathname: string,
  next: Locale,
): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = next;
  } else {
    segments.unshift(next);
  }

  return `/${segments.join("/")}`;
}
