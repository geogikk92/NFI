// Текстовете на курсовете: списък, детайл и картата.
//
// Формата се диктува от немския, после `const bg: T` и `const en: T` не
// пускат непълен превод през tsc.
//
// Етикетите на нивата и форматите са ТУК, а не в lib/cms/courses.ts:
// там е достъпът до базата, който не бива да знае за езици. Немските
// LEVEL_LABELS/FORMAT_LABELS остават там като основа и се ползват от
// админа и от тестовете.

import type { Locale } from "@/lib/i18n/config";
import type { CourseFormat, CourseLevel } from "@/lib/cms/courses";

const de = {
  levels: {
    A1: "A1 · Anfänger",
    A2: "A2 · Grundlagen",
    B1: "B1 · Mittelstufe",
    B2: "B2 · Fortgeschritten",
    C1: "C1 · Kompetent",
    C2: "C2 · Muttersprachlich",
  } as Record<CourseLevel, string>,
  formats: {
    ONLINE: "Online",
    PRESENCE: "Präsenz",
    HYBRID: "Hybrid",
    INDIVIDUAL: "Einzelunterricht",
  } as Record<CourseFormat, string>,

  /** Продължителност: „12 Wochen · 4 Std./Woche". */
  weeks: (count: number) => `${count} ${count === 1 ? "Woche" : "Wochen"}`,
  hoursPerWeek: (count: number) => `${count} Std./Woche`,

  list: {
    metaTitle: "Kurse",
    metaDescription:
      "Deutschkurse von A1 bis C2 — Präsenz, Online und Hybrid. Kleine Gruppen, Prüfungsvorbereitung.",
    kicker: "Kurse",
    title: "Deutsch lernen in Nürnberg",
    lead:
      "Von den ersten Wörtern bis zur Prüfung — in kleinen Gruppen, mit Lehrkräften, die beide Sprachen kennen.",
    filterLabel: "Nach Niveau filtern",
    all: "Alle",
    found: (count: number) =>
      count === 1 ? "1 Kurs gefunden" : `${count} Kurse gefunden`,
    emptyTitle: "Für dieses Niveau ist gerade kein Kurs geplant",
    emptyBody:
      "Melden Sie sich — wir informieren Sie, sobald ein passender Kurs startet, oder finden eine andere Lösung.",
    emptyContact: "Beratung anfragen",
    emptyShowAll: "Alle Kurse zeigen",
    testTitle: "Sie wissen nicht, welches Niveau passt?",
    testLead:
      "Der Einstufungstest dauert etwa zehn Minuten und sagt Ihnen, wo Sie stehen.",
    testCta: "Zum Einstufungstest",
  },

  detail: {
    notFound: "Kurs nicht gefunden",
    breadcrumb: "Brotkrumen",
    coursesLink: "Kurse",
    reviewsHeading: "Bewertungen",
    reviews: (rating: string, count: number) =>
      `${rating} von 5 · ${count} ${count === 1 ? "Bewertung" : "Bewertungen"}`,
    priceNote: "inkl. MwSt. · gesamter Kurs",
    priceOnRequest: "Preis auf Anfrage",
    level: "Niveau",
    format: "Format",
    scope: "Umfang",
    start: "Start",
    groupSize: "Gruppengröße",
    maxParticipants: (count: number) => `max. ${count}`,
    cta: "Beratung anfragen",
    ctaNote:
      "Wir rufen Sie zurück, klären Ihr Niveau und reservieren Ihren Platz. Keine Zahlung an dieser Stelle.",
    related: (level: string) => `Weitere Kurse auf ${level}`,
  },

  card: {
    scope: "Umfang:",
    start: "Start:",
    group: "Gruppe:",
    groupValue: (count: number) => `max. ${count} Teilnehmende`,
    priceNote: "inkl. MwSt. · gesamter Kurs",
    priceOnRequest: "Preis auf Anfrage",
  },
};

type CoursesCopy = typeof de;

const bg: CoursesCopy = {
  levels: {
    A1: "A1 · Начинаещи",
    A2: "A2 · Основи",
    B1: "B1 · Средно ниво",
    B2: "B2 · Над средно ниво",
    C1: "C1 · Компетентно",
    C2: "C2 · Като роден език",
  },
  formats: {
    ONLINE: "Онлайн",
    PRESENCE: "Присъствено",
    HYBRID: "Хибридно",
    INDIVIDUAL: "Индивидуално",
  },

  weeks: (count: number) => `${count} ${count === 1 ? "седмица" : "седмици"}`,
  hoursPerWeek: (count: number) => `${count} ч/седмица`,

  list: {
    metaTitle: "Курсове",
    metaDescription:
      "Курсове по немски от A1 до C2 — присъствено, онлайн и хибридно. Малки групи, подготовка за изпит.",
    kicker: "Курсове",
    title: "Немски език в Нюрнберг",
    lead:
      "От първите думи до изпита — в малки групи, с преподаватели, които знаят и двата езика.",
    filterLabel: "Филтриране по ниво",
    all: "Всички",
    found: (count: number) =>
      count === 1 ? "1 намерен курс" : `${count} намерени курса`,
    emptyTitle: "За това ниво в момента няма насрочен курс",
    emptyBody:
      "Обади ни се — ще те известим веднага щом стартира подходящ курс, или ще намерим друго решение.",
    emptyContact: "Заяви консултация",
    emptyShowAll: "Покажи всички курсове",
    testTitle: "Не знаеш кое ниво е за теб?",
    testLead:
      "Тестът за ниво отнема около десет минути и ти казва откъде да започнеш.",
    testCta: "Към теста за ниво",
  },

  detail: {
    notFound: "Курсът не е намерен",
    breadcrumb: "Път до страницата",
    coursesLink: "Курсове",
    reviewsHeading: "Оценки",
    reviews: (rating: string, count: number) =>
      `${rating} от 5 · ${count} ${count === 1 ? "оценка" : "оценки"}`,
    priceNote: "с ДДС · за целия курс",
    priceOnRequest: "Цена по запитване",
    level: "Ниво",
    format: "Формат",
    scope: "Обем",
    start: "Начало",
    groupSize: "Големина на групата",
    maxParticipants: (count: number) => `най-много ${count}`,
    cta: "Заяви консултация",
    ctaNote:
      "Обаждаме се, изясняваме нивото и пазим мястото ти. Тук не се плаща нищо.",
    related: (level: string) => `Още курсове на ${level}`,
  },

  card: {
    scope: "Обем:",
    start: "Начало:",
    group: "Група:",
    groupValue: (count: number) => `най-много ${count} участници`,
    priceNote: "с ДДС · за целия курс",
    priceOnRequest: "Цена по запитване",
  },
};

const en: CoursesCopy = {
  levels: {
    A1: "A1 · Beginner",
    A2: "A2 · Elementary",
    B1: "B1 · Intermediate",
    B2: "B2 · Upper intermediate",
    C1: "C1 · Advanced",
    C2: "C2 · Near-native",
  },
  formats: {
    ONLINE: "Online",
    PRESENCE: "In person",
    HYBRID: "Hybrid",
    INDIVIDUAL: "One-to-one",
  },

  weeks: (count: number) => `${count} ${count === 1 ? "week" : "weeks"}`,
  hoursPerWeek: (count: number) => `${count} hrs/week`,

  list: {
    metaTitle: "Courses",
    metaDescription:
      "German courses from A1 to C2 — in person, online and hybrid. Small groups, exam preparation.",
    kicker: "Courses",
    title: "Learning German in Nuremberg",
    lead:
      "From your first words to the exam — in small groups, with teachers who know both languages.",
    filterLabel: "Filter by level",
    all: "All",
    found: (count: number) =>
      count === 1 ? "1 course found" : `${count} courses found`,
    emptyTitle: "No course is scheduled for this level right now",
    emptyBody:
      "Get in touch — we'll let you know as soon as a suitable course starts, or find another way.",
    emptyContact: "Request advice",
    emptyShowAll: "Show all courses",
    testTitle: "Not sure which level fits?",
    testLead:
      "The placement test takes about ten minutes and tells you where you stand.",
    testCta: "Take the placement test",
  },

  detail: {
    notFound: "Course not found",
    breadcrumb: "Breadcrumb",
    coursesLink: "Courses",
    reviewsHeading: "Reviews",
    reviews: (rating: string, count: number) =>
      `${rating} out of 5 · ${count} ${count === 1 ? "review" : "reviews"}`,
    priceNote: "incl. VAT · whole course",
    priceOnRequest: "Price on request",
    level: "Level",
    format: "Format",
    scope: "Scope",
    start: "Start",
    groupSize: "Group size",
    maxParticipants: (count: number) => `max. ${count}`,
    cta: "Request advice",
    ctaNote:
      "We call you back, work out your level and hold your place. No payment at this point.",
    related: (level: string) => `More courses at ${level}`,
  },

  card: {
    scope: "Scope:",
    start: "Start:",
    group: "Group:",
    groupValue: (count: number) => `max. ${count} participants`,
    priceNote: "incl. VAT · whole course",
    priceOnRequest: "Price on request",
  },
};

const COPY: Record<Locale, CoursesCopy> = { de, bg, en };

export function coursesCopy(locale: Locale): CoursesCopy {
  return COPY[locale] ?? COPY.de;
}

export function levelLabel(locale: Locale, level: CourseLevel): string {
  return coursesCopy(locale).levels[level];
}

export function formatLabel(locale: Locale, format: CourseFormat): string {
  return coursesCopy(locale).formats[format];
}

/**
 * „12 Wochen · 4 Std./Woche" на езика на посетителя.
 *
 * Не се ползва formatCourseDuration от lib/intl.ts: тя знае думите само
 * на два езика, а те са ТЕКСТ и мястото им е при останалите преводи.
 */
export function courseDuration(
  locale: Locale,
  weeks: number | null,
  hoursPerWeek: number | null,
): string | null {
  const t = coursesCopy(locale);
  const parts: string[] = [];

  if (weeks) parts.push(t.weeks(weeks));
  if (hoursPerWeek) parts.push(t.hoursPerWeek(hoursPerWeek));

  return parts.length > 0 ? parts.join(" · ") : null;
}
