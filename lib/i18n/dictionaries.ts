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
    signIn: "Anmelden",
    signOut: "Abmelden",
    signedInAs: "Angemeldet als",
    adminPanel: "Verwaltung",
    myAccount: "Mein Konto",
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
    checkInbox: "Ihr Konto ist bereit",
    // НЕ обещава писмо: доставчикът за имейли още го няма (lib/email е
    // договорка без реализация). Текст, който казва „проверете пощата",
    // праща човека да чака нещо, което няма да дойде.
    verifySent:
      "Ihr Konto ist angelegt. Sie können sich ab sofort anmelden. Die Bestätigung per E-Mail richten wir gerade ein — Sie müssen nichts weiter tun.",
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
    signIn: "Вход",
    signOut: "Изход",
    signedInAs: "Влязъл като",
    adminPanel: "Администрация",
    myAccount: "Моят профил",
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
    checkInbox: "Профилът е готов",
    verifySent:
      "Профилът е създаден. Можеш да влезеш веднага. Потвърждението по имейл още се настройва — не е нужно да правиш нищо.",
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
    signIn: "Sign in",
    signOut: "Sign out",
    signedInAs: "Signed in as",
    adminPanel: "Administration",
    myAccount: "My account",
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
    checkInbox: "Your account is ready",
    verifySent:
      "Your account is created. You can sign in right away. Email confirmation is still being set up — there is nothing else you need to do.",
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
