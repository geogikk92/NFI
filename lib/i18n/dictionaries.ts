// Речниците на интерфейса.
//
// Държат се в TypeScript, не в JSON: така липсващ ключ е грешка при
// компилация, а не празен низ в продукция. `Dictionary` се извежда от
// немския и всеки друг език ЗАДЪЛЖИТЕЛНО го покрива изцяло — tsc не
// пуска непълен превод.
//
// Тук са само текстовете на ИНТЕРФЕЙСА. Съдържанието (курсове, страници)
// живее в базата с колони за всеки език.

import type { Locale } from "./config";

const de = {
  nav: {
    courses: "Kurse",
    levelTest: "Einstufungstest",
    shop: "Shop",
    about: "Über uns",
    community: "Community",
    contact: "Kontakt",
    cart: "Warenkorb",
    consultation: "Beratung",
    menuOpen: "Menü öffnen",
    menuClose: "Menü schließen",
    skipToContent: "Zum Inhalt springen",
    mainNav: "Hauptnavigation",
    languageLabel: "Sprache",
    cartEmpty: "leer",
    cartItems: "Artikel",
  },
  footer: {
    courses: "Kurse",
    institute: "Institut",
    service: "Service",
    legal: "Rechtliches",
    allCourses: "Alle Kurse",
    forBeginners: "Für Anfänger",
    examPrep: "Prüfungsvorbereitung",
    imprint: "Impressum",
    privacy: "Datenschutz",
    terms: "AGB",
    withdrawal: "Widerrufsrecht",
    cookieSettings: "Cookie-Einstellungen",
    tagline: "Sprachen verbinden.",
    vatNote: "Alle Preise inkl. gesetzlicher MwSt.",
  },
  home: {
    kicker: "Nürnberger Fremdsprachen Institut",
    heroTitle: "Deutsch lernen, wirklich ankommen",
    heroLead:
      "Sprachkurse von A1 bis C2, Prüfungsvorbereitung und beglaubigte Übersetzungen — von Lehrkräften, die beide Sprachen kennen.",
    heroPrimary: "Kurse ansehen",
    heroSecondary: "Niveau testen",
    threadTitle: "Der rote Faden",
    threadLead:
      "Vom ersten Wort bis zum Zertifikat — und zu den Papieren, die Sie dafür brauchen.",
    step1Title: "Niveau klären",
    step1Body: "Zehn Minuten Test oder ein Gespräch. Danach wissen Sie, wo Sie stehen.",
    step2Title: "Kurs finden",
    step2Body: "Kleine Gruppen, Präsenz oder online. Wir sagen offen, was passt.",
    step3Title: "Prüfung schaffen",
    step3Body: "Gezielte Vorbereitung auf die Zertifikate, die Ämter und Arbeitgeber verlangen.",
    step4Title: "Papiere erledigen",
    step4Body: "Beglaubigte Übersetzungen Ihrer Dokumente — im selben Haus.",
    coursesTitle: "Kurse für jedes Niveau",
    coursesLead: "Von den ersten Wörtern bis zur Prüfungsreife.",
    coursesAll: "Alle Kurse ansehen",
    whyTitle: "Warum das NFI",
    why1Title: "Beide Sprachen im Haus",
    why1Body:
      "Unsere Lehrkräfte erklären Deutsch aus der Perspektive Ihrer Muttersprache — nicht mit Händen und Füßen.",
    why2Title: "Kleine Gruppen",
    why2Body:
      "Höchstens zwölf Teilnehmende. Sie kommen zu Wort, jede Stunde.",
    why3Title: "Alles an einem Ort",
    why3Body:
      "Kurs, Prüfungsvorbereitung, Materialien und beglaubigte Übersetzungen — ohne Behördenmarathon.",
    testTitle: "Sie wissen nicht, wo Sie stehen?",
    testLead:
      "Der Einstufungstest dauert etwa zehn Minuten, ist kostenlos und verpflichtet zu nichts.",
    testCta: "Zum Einstufungstest",
    contactTitle: "Sprechen wir darüber",
    contactLead:
      "Erzählen Sie uns, was Sie erreichen wollen. Wir rufen zurück — unverbindlich und ohne Zahlung.",
    contactCta: "Rückruf anfragen",
  },
  auth: {
    registerTitle: "Konto erstellen",
    registerLead:
      "Mit einem Konto sehen Sie Ihre Kurse, Bestellungen, Rechnungen und Zertifikate an einem Ort.",
    loginTitle: "Anmelden",
    loginLead: "Willkommen zurück.",
    name: "Name",
    email: "E-Mail",
    password: "Passwort",
    passwordConfirm: "Passwort wiederholen",
    phone: "Telefon",
    optional: "optional",
    required: "Pflichtfeld",
    passwordHint: "Mindestens 10 Zeichen. Länger ist besser als komplizierter.",
    acceptTerms: "Ich akzeptiere die AGB",
    acceptPrivacy: "Ich habe die Datenschutzerklärung gelesen",
    newsletterOptIn: "Ich möchte den Newsletter erhalten",
    newsletterHint: "Jederzeit abbestellbar. Wir bestätigen die Anmeldung per E-Mail.",
    submitRegister: "Konto erstellen",
    submitLogin: "Anmelden",
    hasAccount: "Sie haben schon ein Konto?",
    noAccount: "Noch kein Konto?",
    toLogin: "Anmelden",
    toRegister: "Konto erstellen",
    checkInbox: "Bitte prüfen Sie Ihr Postfach",
    verifySent:
      "Wir haben Ihnen einen Bestätigungslink geschickt. Erst danach ist Ihr Konto aktiv.",
    pending: "Wird gesendet…",
  },
  common: {
    loading: "Wird geladen",
    errorTitle: "Da ist etwas schiefgelaufen",
    errorBody:
      "Bitte versuchen Sie es erneut. Falls das Problem bleibt, melden Sie sich bei uns.",
    retry: "Erneut versuchen",
    inclVat: "inkl. MwSt.",
    from: "ab",
    back: "Zurück",
  },
};

/**
 * Формата на речника се диктува от немския.
 *
 * БЕЗ `as const` нарочно: с него стойностите стават литерални типове и
 * „Курсове" не се приема на мястото на „Kurse". Строгостта, която ни
 * трябва, е върху КЛЮЧОВЕТЕ — тя се пази от `const bg: Dictionary`,
 * което не пуска непълен или разминат превод.
 */
export type Dictionary = typeof de;

const bg: Dictionary = {
  nav: {
    courses: "Курсове",
    levelTest: "Тест за ниво",
    shop: "Магазин",
    about: "За нас",
    community: "Общност",
    contact: "Контакт",
    cart: "Количка",
    consultation: "Консултация",
    menuOpen: "Отвори менюто",
    menuClose: "Затвори менюто",
    skipToContent: "Към съдържанието",
    mainNav: "Основна навигация",
    languageLabel: "Език",
    cartEmpty: "празна",
    cartItems: "артикула",
  },
  footer: {
    courses: "Курсове",
    institute: "Институт",
    service: "Услуги",
    legal: "Правна информация",
    allCourses: "Всички курсове",
    forBeginners: "За начинаещи",
    examPrep: "Подготовка за изпит",
    imprint: "Импресум",
    privacy: "Защита на данните",
    terms: "Общи условия",
    withdrawal: "Право на отказ",
    cookieSettings: "Настройки за бисквитки",
    tagline: "Езиците свързват.",
    vatNote: "Всички цени са с включено ДДС.",
  },
  home: {
    kicker: "Нюрнбергски институт за чужди езици",
    heroTitle: "Научи немски, установи се наистина",
    heroLead:
      "Езикови курсове от A1 до C2, подготовка за изпити и заверени преводи — от преподаватели, които знаят и двата езика.",
    heroPrimary: "Виж курсовете",
    heroSecondary: "Провери нивото си",
    threadTitle: "Червената нишка",
    threadLead:
      "От първата дума до сертификата — и до документите, които ти трябват за него.",
    step1Title: "Изясняваме нивото",
    step1Body: "Десет минути тест или разговор. После знаеш откъде започваш.",
    step2Title: "Намираме курса",
    step2Body: "Малки групи, присъствено или онлайн. Казваме честно кое е подходящо.",
    step3Title: "Взимаш изпита",
    step3Body: "Целенасочена подготовка за сертификатите, които искат институциите и работодателите.",
    step4Title: "Уреждаме документите",
    step4Body: "Заверени преводи на документите ти — на същото място.",
    coursesTitle: "Курсове за всяко ниво",
    coursesLead: "От първите думи до изпитна готовност.",
    coursesAll: "Всички курсове",
    whyTitle: "Защо НФИ",
    why1Title: "И двата езика под един покрив",
    why1Body:
      "Преподавателите обясняват немския през твоя майчин език — не с ръкомахане.",
    why2Title: "Малки групи",
    why2Body: "Най-много дванайсет души. Стигаш до думата всеки час.",
    why3Title: "Всичко на едно място",
    why3Body:
      "Курс, подготовка за изпит, материали и заверени преводи — без обиколка по институции.",
    testTitle: "Не знаеш откъде да започнеш?",
    testLead:
      "Тестът за ниво отнема около десет минути, безплатен е и не те обвързва с нищо.",
    testCta: "Към теста за ниво",
    contactTitle: "Да го обсъдим",
    contactLead:
      "Разкажи ни какво искаш да постигнеш. Обаждаме се — без обвързване и без плащане.",
    contactCta: "Заяви обаждане",
  },
  auth: {
    registerTitle: "Създаване на профил",
    registerLead:
      "С профил виждаш курсовете, поръчките, фактурите и сертификатите си на едно място.",
    loginTitle: "Вход",
    loginLead: "Радваме се да те видим отново.",
    name: "Име",
    email: "Имейл",
    password: "Парола",
    passwordConfirm: "Повтори паролата",
    phone: "Телефон",
    optional: "по желание",
    required: "задължително",
    passwordHint: "Поне 10 знака. По-дългата е по-добра от по-сложната.",
    acceptTerms: "Приемам общите условия",
    acceptPrivacy: "Прочетох политиката за защита на данните",
    newsletterOptIn: "Искам да получавам бюлетина",
    newsletterHint: "Отписваш се по всяко време. Потвърждаваме записването с имейл.",
    submitRegister: "Създай профил",
    submitLogin: "Влез",
    hasAccount: "Вече имаш профил?",
    noAccount: "Още нямаш профил?",
    toLogin: "Вход",
    toRegister: "Създай профил",
    checkInbox: "Провери пощата си",
    verifySent:
      "Изпратихме ти линк за потвърждение. Профилът е активен само след него.",
    pending: "Изпраща се…",
  },
  common: {
    loading: "Зарежда се",
    errorTitle: "Нещо се обърка",
    errorBody:
      "Опитай отново. Ако проблемът остане, обади ни се.",
    retry: "Опитай отново",
    inclVat: "с ДДС",
    from: "от",
    back: "Назад",
  },
};

const en: Dictionary = {
  nav: {
    courses: "Courses",
    levelTest: "Placement test",
    shop: "Shop",
    about: "About us",
    community: "Community",
    contact: "Contact",
    cart: "Cart",
    consultation: "Get advice",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    skipToContent: "Skip to content",
    mainNav: "Main navigation",
    languageLabel: "Language",
    cartEmpty: "empty",
    cartItems: "items",
  },
  footer: {
    courses: "Courses",
    institute: "Institute",
    service: "Services",
    legal: "Legal",
    allCourses: "All courses",
    forBeginners: "For beginners",
    examPrep: "Exam preparation",
    imprint: "Imprint",
    privacy: "Privacy",
    terms: "Terms",
    withdrawal: "Right of withdrawal",
    cookieSettings: "Cookie settings",
    tagline: "Languages connect.",
    vatNote: "All prices include VAT.",
  },
  home: {
    kicker: "Nuremberg Institute of Foreign Languages",
    heroTitle: "Learn German, actually settle in",
    heroLead:
      "Language courses from A1 to C2, exam preparation and certified translations — taught by people who know both languages.",
    heroPrimary: "Browse courses",
    heroSecondary: "Test your level",
    threadTitle: "The red thread",
    threadLead:
      "From your first word to the certificate — and to the paperwork you need for it.",
    step1Title: "Find your level",
    step1Body: "A ten-minute test or a conversation. Either way you'll know where you stand.",
    step2Title: "Pick the course",
    step2Body: "Small groups, in person or online. We'll tell you honestly what fits.",
    step3Title: "Pass the exam",
    step3Body: "Focused preparation for the certificates authorities and employers ask for.",
    step4Title: "Sort the paperwork",
    step4Body: "Certified translations of your documents — under the same roof.",
    coursesTitle: "Courses for every level",
    coursesLead: "From first words to exam readiness.",
    coursesAll: "See all courses",
    whyTitle: "Why NFI",
    why1Title: "Both languages in house",
    why1Body:
      "Our teachers explain German through your own language — not through gestures.",
    why2Title: "Small groups",
    why2Body: "Twelve people at most. You get to speak, every lesson.",
    why3Title: "Everything in one place",
    why3Body:
      "Course, exam prep, materials and certified translations — without the run-around.",
    testTitle: "Not sure where you stand?",
    testLead:
      "The placement test takes about ten minutes, costs nothing and commits you to nothing.",
    testCta: "Take the placement test",
    contactTitle: "Let's talk it through",
    contactLead:
      "Tell us what you want to achieve. We'll call you back — no strings, no payment.",
    contactCta: "Request a callback",
  },
  auth: {
    registerTitle: "Create an account",
    registerLead:
      "With an account you'll find your courses, orders, invoices and certificates in one place.",
    loginTitle: "Sign in",
    loginLead: "Good to see you again.",
    name: "Name",
    email: "Email",
    password: "Password",
    passwordConfirm: "Repeat password",
    phone: "Phone",
    optional: "optional",
    required: "required",
    passwordHint: "At least 10 characters. Longer beats complicated.",
    acceptTerms: "I accept the terms and conditions",
    acceptPrivacy: "I have read the privacy policy",
    newsletterOptIn: "I'd like to receive the newsletter",
    newsletterHint: "Unsubscribe any time. We confirm sign-up by email.",
    submitRegister: "Create account",
    submitLogin: "Sign in",
    hasAccount: "Already have an account?",
    noAccount: "No account yet?",
    toLogin: "Sign in",
    toRegister: "Create account",
    checkInbox: "Check your inbox",
    verifySent:
      "We've sent you a confirmation link. Your account is active once you follow it.",
    pending: "Sending…",
  },
  common: {
    loading: "Loading",
    errorTitle: "Something went wrong",
    errorBody: "Please try again. If it keeps happening, get in touch.",
    retry: "Try again",
    inclVat: "incl. VAT",
    from: "from",
    back: "Back",
  },
};

const DICTIONARIES: Record<Locale, Dictionary> = { de, bg, en };

/**
 * Синхронно е нарочно: речниците са малки и статични, а динамичният
 * import би направил всеки сървърен компонент, който ги ползва, async.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.de;
}
