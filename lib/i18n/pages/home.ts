// Задача 3a — допълнителните текстове на НАЧАЛНАТА страница.
//
// Тялото на страницата живее в речника (`dictionaries.ts`, ключ `home`) и
// НЕ се дублира тук. Тук са само нещата, които речникът не покрива:
// заглавието за търсачките, етикетът на стъпката за екранния четец и
// текстът, когато в базата няма нито един публикуван курс.
//
// Отделен файл, защото по dictionaries.ts работят и други — виж
// CLAUDE.md, правило 2. Формата се диктува от немския, а `const bg:
// HomeCopy` не пуска непълен превод през tsc.

import type { Locale } from "../config";

const de = {
  /** Влиза в шаблона „%s · NFI" от app/layout.tsx, затова е без „NFI". */
  metaTitle: "Sprachkurse und beglaubigte Übersetzungen in Nürnberg",

  /** Чете се само от екранния четец: „Schritt 2: Kurs finden". */
  stepLabel: "Schritt",

  coursesEmptyTitle: "Gerade ist kein Kurs veröffentlicht",
  coursesEmptyBody:
    "Wir planen die nächsten Termine. Melden Sie sich — wir sagen Ihnen, was als Nächstes startet.",
  coursesEmptyCta: "Beratung anfragen",

  duoTitle: "Zwei Sprachen, ein Unterricht",
  duoLead:
    "Deutsch lernt man auf Deutsch. Aber wenn eine Erklärung nicht ankommt, wechseln wir die Sprache statt die Hände zu benutzen.",
};

/**
 * Формата идва от немския. БЕЗ `as const` — иначе стойностите стават
 * литерални типове и българският превод не се приема на мястото на
 * немския. Строгостта, която ни трябва, е върху КЛЮЧОВЕТЕ.
 */
export type HomeCopy = typeof de;

const bg: HomeCopy = {
  metaTitle: "Езикови курсове и заверени преводи в Нюрнберг",

  stepLabel: "Стъпка",

  coursesEmptyTitle: "В момента няма публикуван курс",
  coursesEmptyBody:
    "Подготвяме следващите дати. Обади се — ще ти кажем какво започва наскоро.",
  coursesEmptyCta: "Заяви консултация",

  duoTitle: "Два езика, едно занятие",
  duoLead:
    "Немският се учи на немски. Но когато обяснението не стига до теб, сменяме езика, вместо да ръкомахаме.",
};

const en: HomeCopy = {
  metaTitle: "Language courses and certified translations in Nuremberg",

  stepLabel: "Step",

  coursesEmptyTitle: "No course is published right now",
  coursesEmptyBody:
    "We are setting the next dates. Get in touch — we will tell you what starts next.",
  coursesEmptyCta: "Ask for advice",

  duoTitle: "Two languages, one lesson",
  duoLead:
    "German is learned in German. But when an explanation does not land, we switch language instead of waving our hands.",
};

const COPY: Record<Locale, HomeCopy> = { de, bg, en };

export function getHomeCopy(locale: Locale): HomeCopy {
  return COPY[locale] ?? COPY.de;
}

/**
 * Двуезичната двойка от секцията за двуезичността.
 *
 * НЕ се превежда по locale и това е нарочно: двойката ПОКАЗВА обещанието
 * на марката — едно и също изречение на немски и на български, едно под
 * друго. Ако се превеждаше, англоговорящият щеше да види две английски
 * изречения и обещанието нямаше да значи нищо.
 */
export const DUO_PAIR = {
  de: "Wir erklären Deutsch auf Deutsch — und wenn es klemmt, auf Bulgarisch.",
  bg: "Обясняваме немския на немски — а когато заклещи, на български.",
} as const;
