// Текстове за /profil.
//
// Образецът е като на другите страници: `de` е източникът, типът се извежда
// от него, а `bg` и `en` се обявяват с този тип — така tsc не пуска непълен
// превод.

import type { Locale } from "@/lib/i18n/config";
import type { ConsentType } from "@/app/generated/prisma/client";

const de = {
  title: "Mein Konto",
  lead: "Hier steht alles, was wir über Sie gespeichert haben.",

  dataHeading: "Ihre Daten",
  name: "Name",
  email: "E-Mail",
  phone: "Telefon",
  language: "Sprache",
  memberSince: "Registriert am",
  notGiven: "nicht angegeben",
  emailVerified: "E-Mail bestätigt",
  emailNotVerified: "noch nicht bestätigt",
  // Обяснява СЕГАШНОТО състояние, без да обещава срок.
  emailNotVerifiedNote:
    "Die Bestätigung per E-Mail richten wir gerade ein. Ihr Konto funktioniert auch ohne sie.",

  consentsHeading: "Ihre Einwilligungen",
  consentsLead:
    "Wir müssen nachweisen können, wann und wozu Sie zugestimmt haben (Art. 7 DSGVO). Deshalb steht hier auch die Fassung des Textes.",
  consentsEmpty: "Es liegen keine Einwilligungen vor.",
  consentGranted: "erteilt",
  consentRevoked: "widerrufen",
  consentVersion: "Fassung",

  testsHeading: "Ihre Einstufungstests",
  testsEmpty: "Sie haben noch keinen Einstufungstest gemacht.",
  testScore: "Punkte",
  testLevel: "Ergebnis",

  rightsHeading: "Ihre Rechte",
  rightsBody:
    "Sie können Auskunft, Berichtigung oder Löschung Ihrer Daten verlangen. Schreiben Sie uns — wir antworten innerhalb eines Monats.",
  rightsLink: "Datenschutzerklärung",

  signOut: "Abmelden",
};

type AccountTexts = typeof de;

const bg: AccountTexts = {
  title: "Моят профил",
  lead: "Тук е всичко, което сме запазили за теб.",

  dataHeading: "Твоите данни",
  name: "Име",
  email: "Имейл",
  phone: "Телефон",
  language: "Език",
  memberSince: "Регистриран на",
  notGiven: "не е посочено",
  emailVerified: "Имейлът е потвърден",
  emailNotVerified: "още не е потвърден",
  emailNotVerifiedNote:
    "Потвърждението по имейл още се настройва. Профилът работи и без него.",

  consentsHeading: "Твоите съгласия",
  consentsLead:
    "Длъжни сме да можем да докажем кога и за какво си се съгласил (чл. 7 GDPR). Затова тук стои и версията на текста.",
  consentsEmpty: "Няма записани съгласия.",
  consentGranted: "дадено",
  consentRevoked: "оттеглено",
  consentVersion: "версия",

  testsHeading: "Твоите тестове за ниво",
  testsEmpty: "Още не си правил тест за ниво.",
  testScore: "точки",
  testLevel: "Резултат",

  rightsHeading: "Твоите права",
  rightsBody:
    "Можеш да поискаш справка, поправка или изтриване на данните си. Пиши ни — отговаряме в едномесечен срок.",
  rightsLink: "Политика за поверителност",

  signOut: "Изход",
};

const en: AccountTexts = {
  title: "My account",
  lead: "Everything we have stored about you is here.",

  dataHeading: "Your details",
  name: "Name",
  email: "Email",
  phone: "Phone",
  language: "Language",
  memberSince: "Registered on",
  notGiven: "not provided",
  emailVerified: "Email confirmed",
  emailNotVerified: "not confirmed yet",
  emailNotVerifiedNote:
    "Email confirmation is still being set up. Your account works without it.",

  consentsHeading: "Your consents",
  consentsLead:
    "We must be able to prove when and to what you consented (Art. 7 GDPR). That is why the version of the text is shown too.",
  consentsEmpty: "No consents on record.",
  consentGranted: "given",
  consentRevoked: "withdrawn",
  consentVersion: "version",

  testsHeading: "Your placement tests",
  testsEmpty: "You have not taken a placement test yet.",
  testScore: "points",
  testLevel: "Result",

  rightsHeading: "Your rights",
  rightsBody:
    "You can request access, correction or deletion of your data. Write to us — we reply within one month.",
  rightsLink: "Privacy policy",

  signOut: "Sign out",
};

const TEXTS: Record<Locale, AccountTexts> = { de, bg, en };

export function getAccountTexts(locale: Locale): AccountTexts {
  return TEXTS[locale] ?? bg;
}

/**
 * Етикетите на видовете съгласие.
 *
 * Изброени са ИЗЧЕРПАТЕЛНО по типа от Prisma, а не с резервен клон:
 * добави ли се нов вид в схемата, tsc спира билда тук, вместо страницата
 * да покаже „MATERIAL_DOWNLOAD" на човека.
 */
const CONSENT_LABELS: Record<Locale, Record<ConsentType, string>> = {
  de: {
    NEWSLETTER: "Newsletter",
    COOKIES: "Cookies",
    TERMS: "AGB",
    PRIVACY: "Datenschutz",
    MATERIAL_DOWNLOAD: "Kostenlose Materialien",
    WIDERRUF: "Verzicht auf das Widerrufsrecht (digitale Inhalte)",
  },
  bg: {
    NEWSLETTER: "Бюлетин",
    COOKIES: "Бисквитки",
    TERMS: "Общи условия",
    PRIVACY: "Поверителност",
    MATERIAL_DOWNLOAD: "Безплатни материали",
    WIDERRUF: "Отказ от правото на отказ (дигитално съдържание)",
  },
  en: {
    NEWSLETTER: "Newsletter",
    COOKIES: "Cookies",
    TERMS: "Terms",
    PRIVACY: "Privacy",
    MATERIAL_DOWNLOAD: "Free materials",
    WIDERRUF: "Waiver of the right of withdrawal (digital content)",
  },
};

export function consentLabel(locale: Locale, type: ConsentType): string {
  return CONSENT_LABELS[locale]?.[type] ?? CONSENT_LABELS.bg[type] ?? type;
}
