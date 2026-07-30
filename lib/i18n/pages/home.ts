// НАЧАЛНАТА СТРАНИЦА · задача 3a — ПРЕНОС ОТ МОКЪПА.
// Източник: https://borisgudev.github.io/nfi-website-mockup/index.html
//
// Тук БЪЛГАРСКИЯТ е ИЗТОЧНИКЪТ, не преводът: мокъпът е на български и е
// одобрен от клиентката. Немският и английският са преводи от него — при
// разминаване печели българският.
//
// Тонът е на „ти" и е нарочен: курсът е личен (една преподавателка, малки
// групи), не институционален. Формалното „Вие" би прозвучало като школа,
// каквато NFI не е.
//
// Заменя предишния файл, който покриваше речниковия ключ `home` —
// текстовете там бяха мои, а не на клиентката.

import type { Locale } from "../config";

const bg = {
  /** Влиза в шаблона „%s · NFI" от app/layout.tsx, затова е без „NFI". */
  metaTitle: "Курсове по немски за българи в Германия",

  hero: {
    kicker: "Курсове по немски · A1–C1 · за българи в Германия",
    titleLead: "Немски, който",
    titleAccent: "остава",
    lede: "Курсове на живо с Василена Нюрнбергер за българи, които живеят и работят в Германия. Започваш от правилното ниво, учиш в малка група и вървиш по ясен път от A1 до C1.",
    ctaPrimary: "Заяви безплатно обаждане",
    ctaSecondary: "Направи теста за ниво",
    badgeLive: "живо онлайн",
    badgeLevels: "A1–C1 за българи в Германия",
    startLabel: "старт",
    startValue: "01.09.2026",
    portraitAlt: "Василена Нюрнбергер, преподавател по немски",
  },

  why: {
    kicker: "Защо при нас",
    title: "Не просто немски — немски за живота ти тук.",
    lede: "Стотици българи в Германия са тръгвали оттук: от първия имейл до институция на немски до разговора, който отваря по-добрата работа. Ето кое ги задържа.",
    items: [
      {
        tag: "Живо",
        title: "Занятия на живо, не записи",
        body: "Виждаш учителя, чуваш другите и питаш точно когато въпросът ти дойде. Никакви самотни видеа, гледани вкъщи след работа.",
      },
      {
        tag: "Лично",
        title: "Учител, който живее твоя живот",
        body: "Василена е българка в Германия. Знае какво е Anmeldung, Arbeitsamt и интервю на немски, защото сама е минала през тях.",
      },
      {
        tag: "Малко",
        title: "Малки групи, в които говориш",
        body: "По 8–10 души на група. Всеки час стигаш до думата и я казваш, вместо да се криеш зад изключена камера, докато времето изтече.",
      },
    ],
  },

  courses: {
    kicker: "Нива на курсовете",
    title: "От първите думи до свободния разговор.",
    all: "Виж всички курсове",
    // A1–C1, БЕЗ C2 — така е в мокъпа. Курсът стига до свободно ниво,
    // не до майчин език.
    levels: [
      { level: "A1", name: "Начинаещи", body: "Първи думи, представяне, числа и всекидневието.", note: "живо онлайн · вечер" },
      { level: "A2", name: "Основи", body: "Минало време, пазаруване, разговор при лекаря.", note: "живо онлайн · вечер" },
      { level: "B1", name: "Самостоятелност", body: "Работа, Anmeldung, писма до институции.", note: "най-търсеното ниво" },
      { level: "B2", name: "Увереност", body: "Дискусии, интервю за работа, професионален немски.", note: "живо онлайн · вечер" },
      { level: "C1", name: "Свободно ниво", body: "Нюанси, академичен и делови немски без спъване.", note: "живо онлайн · вечер" },
    ],
    emptyTitle: "Точно сега няма публикуван курс",
    emptyBody: "Подготвяме следващите дати. Обади се — ще ти кажем какво тръгва наскоро.",
    emptyCta: "Заяви обаждане",
  },

  rules: {
    kicker: "Не само език",
    title: "5 стъпки към живота в Германия.",
    lede: "В курса Василена не спира на граматиката. Работим върху всичко, което кара интеграцията наистина да се получи.",
    /** Чете се само от екранния четец: „Стъпка 2: Закони и права". */
    stepLabel: "Стъпка",
    steps: [
      { n: "01", title: "Език", body: "Основата: да те разбират и ти да разбираш." },
      { n: "02", title: "Закони и права", body: "Правата и задълженията ти като жител на Германия." },
      { n: "03", title: "Немскоговорящи приятели", body: "Кръг, в който упражняваш и се чувстваш свой." },
      { n: "04", title: "Работа и квартира", body: "Как да ги намериш и задържиш на немски." },
      { n: "05", title: "Контакти", body: "Мрежата, която отваря следващата врата." },
    ],
  },

  translation: {
    stampTitle: "beglaubigt",
    stampSub: "превод на документи",
    title: "Документи, преведени както трябва.",
    lede: "Дипломи, актове, свидетелства и трудови договори. Заверен превод, който институциите в Германия приемат без въпроси. Качваш документа, получаваш оферта и срок още същия ден.",
    cta: "Качи документ за оферта",
  },

  reviews: {
    kicker: "Какво казват курсистите",
    title: "Историите, заради които правя това.",
    rating: "4.9",
    ratingLabel: "от 5",
    community: "Facebook общност от 22 000+ българи в немскоговорящи държави",
    items: [
      { quote: "След 6 години в Германия проговорих истински за 4 месеца.", author: "Мария К.", city: "Мюнхен" },
      { quote: "Взех B2 от първия път. Василена не ти дава да се откажеш.", author: "Стоян Д.", city: "Нюрнберг" },
      { quote: "Groß/klein, der/die/das: най-после ми светна как работи.", author: "Ани П.", city: "Щутгарт" },
      { quote: "Записах се плахо. Днес водя срещите с клиенти на немски.", author: "Ивайло Т.", city: "Франкфурт" },
    ],
  },

  callback: {
    kicker: "Безплатно обаждане",
    title: "Един разговор, и знаеш откъде да започнеш.",
    lede: "Кажи ни само име и телефон. Ще те попитаме къде си сега с немския и ще ти кажем честно от кое ниво да тръгнеш, без да плащаш нищо.",
  },

  community: {
    title: "22 000+ българи учат немски заедно",
    cta: "Влез в групата",
    imageAlt: "Общността на NFI",
  },
};

export type HomeCopy = typeof bg;

const de: HomeCopy = {
  metaTitle: "Deutschkurse für Bulgaren in Deutschland",

  hero: {
    kicker: "Deutschkurse · A1–C1 · für Bulgaren in Deutschland",
    titleLead: "Deutsch, das",
    titleAccent: "bleibt",
    lede: "Live-Kurse mit Vasilena Nürnberger für Bulgaren, die in Deutschland leben und arbeiten. Du startest auf dem richtigen Niveau, lernst in einer kleinen Gruppe und gehst einen klaren Weg von A1 bis C1.",
    ctaPrimary: "Kostenlosen Rückruf anfragen",
    ctaSecondary: "Einstufungstest machen",
    badgeLive: "live online",
    badgeLevels: "A1–C1 für Bulgaren in Deutschland",
    startLabel: "Start",
    startValue: "01.09.2026",
    portraitAlt: "Vasilena Nürnberger, Deutschlehrerin",
  },

  why: {
    kicker: "Warum bei uns",
    title: "Nicht einfach Deutsch — Deutsch für dein Leben hier.",
    lede: "Hunderte Bulgaren in Deutschland haben hier angefangen: von der ersten E-Mail an eine Behörde auf Deutsch bis zum Gespräch, das die bessere Stelle öffnet. Das ist es, was sie hält.",
    items: [
      {
        tag: "Live",
        title: "Unterricht live, keine Aufzeichnungen",
        body: "Du siehst die Lehrerin, hörst die anderen und fragst genau dann, wenn die Frage kommt. Keine einsamen Videos abends nach der Arbeit.",
      },
      {
        tag: "Persönlich",
        title: "Eine Lehrerin, die dein Leben lebt",
        body: "Vasilena ist Bulgarin in Deutschland. Sie weiß, was Anmeldung, Arbeitsamt und ein Bewerbungsgespräch auf Deutsch bedeuten — sie hat es selbst durchgemacht.",
      },
      {
        tag: "Klein",
        title: "Kleine Gruppen, in denen du sprichst",
        body: "8–10 Personen pro Gruppe. Jede Stunde kommst du zu Wort, statt dich hinter ausgeschalteter Kamera zu verstecken, bis die Zeit um ist.",
      },
    ],
  },

  courses: {
    kicker: "Kursniveaus",
    title: "Von den ersten Wörtern bis zum freien Gespräch.",
    all: "Alle Kurse ansehen",
    levels: [
      { level: "A1", name: "Anfänger", body: "Erste Wörter, sich vorstellen, Zahlen und Alltag.", note: "live online · abends" },
      { level: "A2", name: "Grundlagen", body: "Vergangenheit, Einkaufen, Gespräch beim Arzt.", note: "live online · abends" },
      { level: "B1", name: "Selbstständigkeit", body: "Arbeit, Anmeldung, Briefe an Behörden.", note: "das gefragteste Niveau" },
      { level: "B2", name: "Sicherheit", body: "Diskussionen, Bewerbungsgespräch, Berufsdeutsch.", note: "live online · abends" },
      { level: "C1", name: "Freies Niveau", body: "Nuancen, akademisches und geschäftliches Deutsch ohne Stocken.", note: "live online · abends" },
    ],
    emptyTitle: "Gerade ist kein Kurs veröffentlicht",
    emptyBody: "Wir planen die nächsten Termine. Melde dich — wir sagen dir, was als Nächstes startet.",
    emptyCta: "Rückruf anfragen",
  },

  rules: {
    kicker: "Nicht nur Sprache",
    title: "5 Schritte ins Leben in Deutschland.",
    lede: "Im Kurs hört Vasilena nicht bei der Grammatik auf. Wir arbeiten an allem, was Integration wirklich gelingen lässt.",
    stepLabel: "Schritt",
    steps: [
      { n: "01", title: "Sprache", body: "Die Basis: verstanden werden und verstehen." },
      { n: "02", title: "Recht und Pflichten", body: "Deine Rechte und Pflichten als Einwohner Deutschlands." },
      { n: "03", title: "Deutschsprachige Freunde", body: "Ein Kreis, in dem du übst und dich dazugehörig fühlst." },
      { n: "04", title: "Arbeit und Wohnung", body: "Wie du sie auf Deutsch findest und behältst." },
      { n: "05", title: "Kontakte", body: "Das Netzwerk, das die nächste Tür öffnet." },
    ],
  },

  translation: {
    stampTitle: "beglaubigt",
    stampSub: "Dokumentenübersetzung",
    title: "Dokumente, richtig übersetzt.",
    lede: "Diplome, Urkunden, Zeugnisse und Arbeitsverträge. Beglaubigte Übersetzung, die Behörden in Deutschland ohne Rückfragen annehmen. Du lädst das Dokument hoch und bekommst Angebot und Frist noch am selben Tag.",
    cta: "Dokument für Angebot hochladen",
  },

  reviews: {
    kicker: "Was die Teilnehmenden sagen",
    title: "Die Geschichten, für die ich das mache.",
    rating: "4,9",
    ratingLabel: "von 5",
    community: "Facebook-Community mit 22 000+ Bulgaren in deutschsprachigen Ländern",
    items: [
      { quote: "Nach 6 Jahren in Deutschland habe ich in 4 Monaten wirklich zu sprechen begonnen.", author: "Maria K.", city: "München" },
      { quote: "B2 im ersten Versuch. Vasilena lässt dich nicht aufgeben.", author: "Stojan D.", city: "Nürnberg" },
      { quote: "Groß/klein, der/die/das: endlich habe ich verstanden, wie das funktioniert.", author: "Ani P.", city: "Stuttgart" },
      { quote: "Ich habe mich zögerlich angemeldet. Heute führe ich Kundentermine auf Deutsch.", author: "Ivaylo T.", city: "Frankfurt" },
    ],
  },

  callback: {
    kicker: "Kostenloser Rückruf",
    title: "Ein Gespräch, und du weißt, wo du anfängst.",
    lede: "Sag uns nur Name und Telefon. Wir fragen, wo du mit dem Deutschen gerade stehst, und sagen dir ehrlich, mit welchem Niveau du starten solltest — kostenlos.",
  },

  community: {
    title: "22 000+ Bulgaren lernen zusammen Deutsch",
    cta: "Zur Gruppe",
    imageAlt: "Die NFI-Community",
  },
};

const en: HomeCopy = {
  metaTitle: "German courses for Bulgarians in Germany",

  hero: {
    kicker: "German courses · A1–C1 · for Bulgarians in Germany",
    titleLead: "German that",
    titleAccent: "sticks",
    lede: "Live courses with Vasilena Nürnberger for Bulgarians living and working in Germany. You start at the right level, learn in a small group and follow a clear path from A1 to C1.",
    ctaPrimary: "Request a free callback",
    ctaSecondary: "Take the placement test",
    badgeLive: "live online",
    badgeLevels: "A1–C1 for Bulgarians in Germany",
    startLabel: "starts",
    startValue: "01.09.2026",
    portraitAlt: "Vasilena Nürnberger, German teacher",
  },

  why: {
    kicker: "Why us",
    title: "Not just German — German for your life here.",
    lede: "Hundreds of Bulgarians in Germany started here: from the first email to an authority in German to the conversation that opens a better job. This is what keeps them.",
    items: [
      {
        tag: "Live",
        title: "Live lessons, not recordings",
        body: "You see the teacher, hear the others and ask exactly when the question comes. No lonely videos watched at home after work.",
      },
      {
        tag: "Personal",
        title: "A teacher who lives your life",
        body: "Vasilena is a Bulgarian in Germany. She knows what Anmeldung, Arbeitsamt and a job interview in German mean, because she went through them herself.",
      },
      {
        tag: "Small",
        title: "Small groups where you actually speak",
        body: "8–10 people per group. Every lesson you get to speak, instead of hiding behind a switched-off camera until time runs out.",
      },
    ],
  },

  courses: {
    kicker: "Course levels",
    title: "From your first words to free conversation.",
    all: "See all courses",
    levels: [
      { level: "A1", name: "Beginners", body: "First words, introductions, numbers and everyday life.", note: "live online · evenings" },
      { level: "A2", name: "Foundations", body: "Past tense, shopping, talking to the doctor.", note: "live online · evenings" },
      { level: "B1", name: "Independence", body: "Work, Anmeldung, letters to authorities.", note: "most requested level" },
      { level: "B2", name: "Confidence", body: "Discussions, job interviews, professional German.", note: "live online · evenings" },
      { level: "C1", name: "Fluency", body: "Nuance, academic and business German without stumbling.", note: "live online · evenings" },
    ],
    emptyTitle: "No course is published right now",
    emptyBody: "We're planning the next dates. Get in touch — we'll tell you what starts next.",
    emptyCta: "Request a callback",
  },

  rules: {
    kicker: "Not only language",
    title: "5 steps into life in Germany.",
    lede: "In the course Vasilena doesn't stop at grammar. We work on everything that makes integration actually happen.",
    stepLabel: "Step",
    steps: [
      { n: "01", title: "Language", body: "The basis: being understood and understanding." },
      { n: "02", title: "Law and rights", body: "Your rights and duties as a resident of Germany." },
      { n: "03", title: "German-speaking friends", body: "A circle where you practise and feel you belong." },
      { n: "04", title: "Work and housing", body: "How to find and keep them in German." },
      { n: "05", title: "Contacts", body: "The network that opens the next door." },
    ],
  },

  translation: {
    stampTitle: "beglaubigt",
    stampSub: "document translation",
    title: "Documents translated properly.",
    lede: "Diplomas, certificates, records and employment contracts. Certified translation that German authorities accept without questions. Upload the document and get a quote and deadline the same day.",
    cta: "Upload a document for a quote",
  },

  reviews: {
    kicker: "What students say",
    title: "The stories I do this for.",
    rating: "4.9",
    ratingLabel: "out of 5",
    community: "Facebook community of 22,000+ Bulgarians in German-speaking countries",
    items: [
      { quote: "After 6 years in Germany I truly started speaking in 4 months.", author: "Maria K.", city: "Munich" },
      { quote: "Passed B2 first time. Vasilena doesn't let you give up.", author: "Stoyan D.", city: "Nuremberg" },
      { quote: "Groß/klein, der/die/das: it finally clicked how it works.", author: "Ani P.", city: "Stuttgart" },
      { quote: "I signed up timidly. Today I run client meetings in German.", author: "Ivaylo T.", city: "Frankfurt" },
    ],
  },

  callback: {
    kicker: "Free callback",
    title: "One conversation, and you know where to start.",
    lede: "Just give us your name and phone number. We'll ask where you are with German and tell you honestly which level to start from — at no cost.",
  },

  community: {
    title: "22,000+ Bulgarians learning German together",
    cta: "Join the group",
    imageAlt: "The NFI community",
  },
};

const COPY: Record<Locale, HomeCopy> = { bg, de, en };

export function homeCopy(locale: Locale): HomeCopy {
  return COPY[locale] ?? COPY.bg;
}

/** Стар подпис — страницата още го вика. */
export const getHomeCopy = homeCopy;
