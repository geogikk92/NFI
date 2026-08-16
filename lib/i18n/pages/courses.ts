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
    mockupTitle: "Von A1 bis B2 — mit lebendiger Verbindung, keine Aufzeichnungen.",
    mockupLede:
      "Alle Gruppen starten im September 2026. Der Unterricht ist live über Zoom, morgens oder abends, abgestimmt auf Menschen im Schichtdienst. Den Preis erfährst du im kostenlosen Gespräch, in dem wir zusammen auch dein Niveau einschätzen.",
    factsHeading: "Kurz gefasst",
    facts: [
      { label: "Start", value: "September 2026" },
      { label: "Format", value: "live · Zoom" },
      { label: "Betreuung", value: "individuell" },
      { label: "Wann", value: "morgens oder abends" },
    ],
    pickHeading: "Wähle, wo du anfängst",
    pickLede: "Vier Niveaus, ein Faden: vom Alphabet bis zum sicheren Gespräch.",
    schedule: "morgens oder abends · live über Zoom",
    mostWanted: "am gefragtesten",
    details: "Details",
    metaTitle: "Kurse",
    metaDescription:
      "Deutschkurse von A1 bis B2 — live online über Zoom. Individuelle Betreuung, Deutsch für den Alltag in Deutschland.",
    kicker: "Kurse",
    title: "Deutsch lernen in Nürnberg",
    lead:
      "Von den ersten Wörtern bis B2 — live, mit individueller Betreuung und einer Lehrerin, die beide Sprachen kennt.",
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
      "Der Einstufungstest dauert etwa fünf Minuten und sagt dir, wo du stehst.",
    testCta: "Zum Einstufungstest",
  },

  detail: {
    notFound: "Kurs nicht gefunden",
    breadcrumb: "Brotkrumen",
    coursesLink: "Kurse",
    reviewsHeading: "Bewertungen",
    reviews: (rating: string, count: number) =>
      `${rating} von 5 · ${count} ${count === 1 ? "Bewertung" : "Bewertungen"}`,
    priceInTalk: "Den Preis erfährst du im kostenlosen Gespräch",
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
    priceInTalk: "Den Preis erfährst du im kostenlosen Gespräch",
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
    mockupTitle: "От A1 до B2 — с жива връзка, не записи.",
    mockupLede:
      "Всички групи стартират през септември 2026. Занятията са на живо през Zoom, сутрин или вечер, съобразени с хора на смени. Цената научаваш в безплатния разговор, където заедно преценяваме и нивото ти.",
    factsHeading: "Накратко",
    facts: [
      { label: "Старт", value: "септември 2026" },
      { label: "Формат", value: "на живо · Zoom" },
      { label: "Отношение", value: "индивидуално" },
      { label: "Кога", value: "сутрин или вечер" },
    ],
    pickHeading: "Избери откъде тръгваш",
    pickLede: "Четири нива, една нишка: от азбуката до уверения разговор.",
    schedule: "сутрин или вечер · на живо през Zoom",
    mostWanted: "най-търсен",
    details: "Детайли",
    metaTitle: "Курсове",
    metaDescription:
      "Курсове по немски от A1 до B2 — на живо онлайн през Zoom. Индивидуално отношение, немски за живота в Германия.",
    kicker: "Курсове",
    title: "Немски език в Нюрнберг",
    lead:
      "От първите думи до B2 — на живо, с индивидуално отношение и преподавател, който знае и двата езика.",
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
      "Тестът за ниво отнема около пет минути и ти казва откъде да започнеш.",
    testCta: "Към теста за ниво",
  },

  detail: {
    notFound: "Курсът не е намерен",
    breadcrumb: "Път до страницата",
    coursesLink: "Курсове",
    reviewsHeading: "Оценки",
    reviews: (rating: string, count: number) =>
      `${rating} от 5 · ${count} ${count === 1 ? "оценка" : "оценки"}`,
    priceInTalk: "Цената научаваш в безплатния разговор",
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
    priceInTalk: "Цената научаваш в безплатния разговор",
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
    mockupTitle: "From A1 to B2 — live, not recordings.",
    mockupLede:
      "All groups start in September 2026. Lessons are live on Zoom, morning or evening, built around people working shifts. You get the price in the free call, where we also assess your level together.",
    factsHeading: "In short",
    facts: [
      { label: "Starts", value: "September 2026" },
      { label: "Format", value: "live · Zoom" },
      { label: "Attention", value: "individual" },
      { label: "When", value: "morning or evening" },
    ],
    pickHeading: "Choose where you start",
    pickLede: "Four levels, one thread: from the alphabet to confident conversation.",
    schedule: "morning or evening · live on Zoom",
    mostWanted: "most requested",
    details: "Details",
    metaTitle: "Courses",
    metaDescription:
      "German courses from A1 to B2 — live online on Zoom. Individual attention, German for daily life in Germany.",
    kicker: "Courses",
    title: "Learning German in Nuremberg",
    lead:
      "From your first words to B2 — live, with individual attention and a teacher who knows both languages.",
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
      "The placement test takes about five minutes and tells you where you stand.",
    testCta: "Take the placement test",
  },

  detail: {
    notFound: "Course not found",
    breadcrumb: "Breadcrumb",
    coursesLink: "Courses",
    reviewsHeading: "Reviews",
    reviews: (rating: string, count: number) =>
      `${rating} out of 5 · ${count} ${count === 1 ? "review" : "reviews"}`,
    priceInTalk: "You get the price in the free call",
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
    priceInTalk: "You get the price in the free call",
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

/**
 * Немските имена на нивата — от мокъпа: „A1 Anfänger", „B1 Mittelstufe".
 * НЕ се превеждат: те са самите официални названия по CEFR в немската
 * образователна система и точно така ги вижда клиентът в институция.
 */
export const LEVEL_GERMAN_NAMES: Record<string, string> = {
  A1: "Anfänger",
  A2: "Grundstufe",
  B1: "Mittelstufe",
  B2: "Aufbaustufe",
  C1: "Oberstufe",
  C2: "Oberstufe",
};
