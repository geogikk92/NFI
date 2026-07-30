// Текстовете на теста за ниво и на резултата.

import type { Locale } from "@/lib/i18n/config";
import { resultCopy as resultCopyDe, type CourseLevel } from "@/lib/cms/level-test";

const de = {
  quiz: {
    progress: (n: number, total: number) => `Frage ${n} von ${total}`,
    back: "Zurück",
    next: "Weiter",
    skip: "Überspringen",
    submit: "Ergebnis anzeigen",
    answered: (n: number, total: number) => `${n} von ${total} beantwortet`,
    hint: "Du kannst Fragen überspringen — das Ergebnis wird dann grober. Acht Fragen, etwa fünf Minuten, kostenlos.",
    unavailable: "Der Test ist gerade nicht verfügbar. Bitte versuche es später.",
  },

  test: {
    metaTitle: "Einstufungstest",
    metaDescription:
      "Acht Fragen, etwa fünf Minuten — und du weißt, wo du stehst. Ohne E-Mail, ohne Anmeldung.",
    kicker: "Einstufungstest",
    title: "Wo stehen Sie im Deutschen?",
    lead:
      "Acht Fragen, keine Tricks. Am Ende sagen wir dir dein Niveau und welcher Kurs passt. Ohne E-Mail und ohne Anmeldung; das Ergebnis speichern wir anonym, um dir den richtigen Kurs zu zeigen.",
    unavailableTitle: "Der Test ist gerade nicht verfügbar",
    unavailableBody:
      "Wir stellen die Fragen zusammen. Melden Sie sich — wir schätzen Ihr Niveau auch im Gespräch ein.",
  },

  result: {
    metaTitle: "Ihr Ergebnis",
    kicker: "Ihr Ergebnis",
    estimatedLevel: "Eingeschätztes Niveau",
    score: (score: number, maxScore: number) =>
      `${score} / ${maxScore} Punkte`,
    byLevelHeading: "Nach Niveau",
    outOf: (earned: number, possible: number) => `${earned} von ${possible}`,
    disclaimer:
      "Das Ergebnis ist eine Einschätzung, keine Prüfung. Im Gespräch schauen wir gemeinsam, welcher Kurs wirklich passt.",
    matchingCourses: "Passende Kurse",
    noCourseTitle: (level: string) =>
      `Für ${level} ist gerade kein Kurs geplant`,
    noCourseBody:
      "Melden Sie sich — wir finden eine Lösung, auch als Einzelunterricht.",
    allCourses: "Alle Kurse ansehen",
    callbackTitle: "Sollen wir Sie zurückrufen?",
    callbackBody:
      "Wir gehen Ihr Ergebnis durch, klären offene Fragen und reservieren Ihren Platz. Unverbindlich und ohne Zahlung.",
  },
};

type LevelTestCopy = typeof de;

const bg: LevelTestCopy = {
  quiz: {
    progress: (n: number, total: number) => `Въпрос ${n} от ${total}`,
    back: "Назад",
    next: "Напред",
    skip: "Пропусни",
    submit: "Виж резултата",
    answered: (n: number, total: number) => `${n} от ${total} отговорени`,
    hint: "Можеш да пропускаш въпроси — тогава резултатът е по-груб. Осем въпроса, около пет минути, безплатно.",
    unavailable: "Тестът не е достъпен в момента. Опитай по-късно.",
  },

  test: {
    metaTitle: "Тест за ниво",
    metaDescription:
      "Осем въпроса, около пет минути — и знаеш къде си. Без имейл, без регистрация.",
    kicker: "Тест за ниво",
    title: "На какво ниво си по немски?",
    lead:
      "Осем въпроса, без хитрини. Накрая ти казваме нивото и кой курс ти пасва. Без имейл и без регистрация; резултатът се пази анонимно, за да ти покажем подходящия курс.",
    unavailableTitle: "Тестът в момента не е достъпен",
    unavailableBody:
      "Подготвяме въпросите. Обади ни се — преценяваме нивото и в разговор.",
  },

  result: {
    metaTitle: "Твоят резултат",
    kicker: "Твоят резултат",
    estimatedLevel: "Преценено ниво",
    score: (score: number, maxScore: number) =>
      `${score} / ${maxScore} точки`,
    byLevelHeading: "По нива",
    outOf: (earned: number, possible: number) => `${earned} от ${possible}`,
    disclaimer:
      "Резултатът е преценка, не изпит. В разговора заедно ще видим кой курс наистина е подходящ.",
    matchingCourses: "Подходящи курсове",
    noCourseTitle: (level: string) =>
      `За ${level} в момента няма насрочен курс`,
    noCourseBody:
      "Обади ни се — ще намерим решение, включително индивидуални уроци.",
    allCourses: "Всички курсове",
    callbackTitle: "Да ти се обадим ли?",
    callbackBody:
      "Ще минем през резултата, ще отговорим на въпросите и ще запазим мястото ти. Без обвързване и без плащане.",
  },
};

const en: LevelTestCopy = {
  quiz: {
    progress: (n: number, total: number) => `Question ${n} of ${total}`,
    back: "Back",
    next: "Next",
    skip: "Skip",
    submit: "See result",
    answered: (n: number, total: number) => `${n} of ${total} answered`,
    hint: "You can skip questions — the result will just be rougher. Eight questions, about five minutes, free.",
    unavailable: "The test is unavailable right now. Please try again later.",
  },

  test: {
    metaTitle: "Placement test",
    metaDescription:
      "Eight questions, about five minutes — and you'll know where you stand. No email, no sign-up.",
    kicker: "Placement test",
    title: "Where do you stand in German?",
    lead:
      "Eight questions, no tricks. At the end we tell you your level and which course fits. No email and no sign-up; we store the result anonymously to show you the right course.",
    unavailableTitle: "The test is not available right now",
    unavailableBody:
      "We're putting the questions together. Get in touch — we can also assess your level in conversation.",
  },

  result: {
    metaTitle: "Your result",
    kicker: "Your result",
    estimatedLevel: "Estimated level",
    score: (score: number, maxScore: number) =>
      `${score} / ${maxScore} points`,
    byLevelHeading: "By level",
    outOf: (earned: number, possible: number) => `${earned} of ${possible}`,
    disclaimer:
      "The result is an estimate, not an exam. We'll look together at which course really fits.",
    matchingCourses: "Courses that fit",
    noCourseTitle: (level: string) =>
      `No course is scheduled for ${level} right now`,
    noCourseBody:
      "Get in touch — we'll find a way, one-to-one lessons included.",
    allCourses: "See all courses",
    callbackTitle: "Shall we call you back?",
    callbackBody:
      "We'll go through your result, answer open questions and hold your place. No strings, no payment.",
  },
};

const COPY: Record<Locale, LevelTestCopy> = { de, bg, en };

export function levelTestCopy(locale: Locale): LevelTestCopy {
  return COPY[locale] ?? COPY.de;
}

// ─────────────────────────────────────────────────────────────────────────
//  Обяснението на резултата
// ─────────────────────────────────────────────────────────────────────────
//
// Немският НЕ се преписва тук: той си остава в lib/cms/level-test.ts,
// където има и тест. Два немски текста на две места се разминават при
// първата редакция. Тук се добавят само липсващите два езика.

type ResultCopy = { headline: string; body: string };

const resultBg: Record<CourseLevel, ResultCopy> = {
  A1: {
    headline: "Започваш от A1",
    body: "Добро начало — на A1 учиш основите за всекидневието. Ще ти покажем подходящия курс.",
  },
  A2: {
    headline: "Нивото ти е A2",
    body: "Вече имаш основи. На A2 надграждаш и се справяш с ежедневните разговори.",
  },
  B1: {
    headline: "Нивото ти е B1",
    body: "Справяш се в ежедневието. На B1 немският ти става по-уверен — и за работа, и пред институции.",
  },
  B2: {
    headline: "Нивото ти е B2",
    body: "Говориш напреднало. B2 е нивото, което искат много работодатели и университети.",
  },
  C1: {
    headline: "Нивото ти е C1",
    body: "Много силно. На C1 се работи по нюансите, специализирания език и подготовката за изпит.",
  },
  C2: {
    headline: "Нивото ти е C2",
    body: "Впечатляващо — почти като роден език. Ще те посъветваме за изпити и специализирани курсове.",
  },
};

const resultEn: Record<CourseLevel, ResultCopy> = {
  A1: {
    headline: "You start at A1",
    body: "A good beginning — at A1 you learn the basics for everyday life. We'll show you the course that fits.",
  },
  A2: {
    headline: "Your level is A2",
    body: "You already have the basics. At A2 you build on them and handle everyday conversations.",
  },
  B1: {
    headline: "Your level is B1",
    body: "You get by in daily life. At B1 your German becomes surer — at work and with the authorities too.",
  },
  B2: {
    headline: "Your level is B2",
    body: "You speak at an advanced level. B2 is what many employers and universities ask for.",
  },
  C1: {
    headline: "Your level is C1",
    body: "Very strong. C1 is about nuance, specialist language and exam preparation.",
  },
  C2: {
    headline: "Your level is C2",
    body: "Impressive — close to native. We'll advise you on exams and specialist courses.",
  },
};

export function testResultCopy(locale: Locale, level: CourseLevel): ResultCopy {
  if (locale === "bg") return resultBg[level];
  if (locale === "en") return resultEn[level];
  return resultCopyDe(level);
}
