// Текстовете на страница „За нас".
//
// Съдържанието на разделите чака Василена — тук са само заглавията и
// призивът за действие.

import type { Locale } from "@/lib/i18n/config";

const de = {
  metaTitle: "Über uns",
  metaDescription:
    "Das Nürnberger Fremdsprachen Institut — Sprachunterricht von Lehrkräften, die beide Sprachen kennen.",
  kicker: "Über uns",
  title: "Zwei Sprachen, ein Institut",
  whoHeading: "Wer wir sind",
  teachersHeading: "Unsere Lehrkräfte",
  methodHeading: "Wie wir unterrichten",
  ctaTitle: "Lernen Sie uns kennen",
  ctaBody:
    "Der schnellste Weg ist ein Gespräch. Wir klären Ihr Niveau und sagen offen, ob wir die Richtigen für Sie sind.",
  ctaContact: "Beratung anfragen",
  ctaTest: "Niveau testen",
};

type AboutCopy = typeof de;

const bg: AboutCopy = {
  metaTitle: "За нас",
  metaDescription:
    "Нюрнбергският институт за чужди езици — обучение от преподаватели, които знаят и двата езика.",
  kicker: "За нас",
  title: "Два езика, един институт",
  whoHeading: "Кои сме ние",
  teachersHeading: "Нашите преподаватели",
  methodHeading: "Как преподаваме",
  ctaTitle: "Запознай се с нас",
  ctaBody:
    "Най-бързият път е разговор. Изясняваме нивото и казваме честно дали сме подходящите за теб.",
  ctaContact: "Заяви консултация",
  ctaTest: "Провери нивото си",
};

const en: AboutCopy = {
  metaTitle: "About us",
  metaDescription:
    "The Nuremberg Institute of Foreign Languages — taught by people who know both languages.",
  kicker: "About us",
  title: "Two languages, one institute",
  whoHeading: "Who we are",
  teachersHeading: "Our teachers",
  methodHeading: "How we teach",
  ctaTitle: "Get to know us",
  ctaBody:
    "The quickest way is a conversation. We'll work out your level and say honestly whether we're right for you.",
  ctaContact: "Request advice",
  ctaTest: "Test your level",
};

const COPY: Record<Locale, AboutCopy> = { de, bg, en };

export function aboutCopy(locale: Locale): AboutCopy {
  return COPY[locale] ?? COPY.de;
}
