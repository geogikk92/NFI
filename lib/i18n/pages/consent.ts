// Текстовете на cookie банера и на гейтнатото съдържание — трите езика.
//
// Банерът стои на ВСЯКА страница, значи е първото, което човек чете. Ако
// е само на немски, посетителят на /bg вижда чужд език още преди
// съдържанието — и съгласието му не е информирано по Art. 4(11) GDPR.

import type { Locale } from "../config";

const de = {
  banner: {
    title: "Cookies und externe Inhalte",
    body: "Technisch notwendige Cookies (Sitzung, Warenkorb, diese Auswahl) setzen wir immer. Externe Videos und Statistik laden wir erst mit Ihrer Einwilligung — bis dahin werden sie",
    bodyStrong: "nicht geladen",
    bodyTail: ", nicht nur ausgeblendet.",
    privacyLink: "Datenschutzerklärung",
    acceptAll: "Alle akzeptieren",
    rejectAll: "Alle ablehnen",
    settings: "Einstellungen",
    settingsLess: "Weniger anzeigen",
    save: "Auswahl speichern",
    categories: "Cookie-Kategorien",
    necessaryLabel: "Notwendig · immer aktiv",
    necessaryBody:
      "Sitzung, Warenkorb und Ihre Cookie-Entscheidung. Ohne diese funktioniert die Seite nicht.",
    functionalLabel: "Externe Inhalte",
    functionalBody:
      "Videos von Vimeo und GoTo. Ohne Einwilligung erscheint an ihrer Stelle ein Platzhalter.",
    analyticsLabel: "Statistik",
    analyticsBody: "Anonyme Auswertung, welche Seiten gelesen werden.",
  },
  gate: {
    notLoaded: "ist nicht geladen",
    notLoadedGeneric: "Inhalt nicht geladen",
    explain: (provider: string) =>
      `Dieser Inhalt kommt von ${provider}. Beim Laden erhält ${provider} Ihre IP-Adresse. Deshalb laden wir ihn erst, wenn Sie zustimmen.`,
    loadAndAccept: "Laden und zustimmen",
    revokeNote: "Die Zustimmung gilt für externe Inhalte auf der gesamten Seite und ist unter",
    revokeLink: "Cookie-Einstellungen",
    revokeTail: "jederzeit widerrufbar.",
  },
};

export type ConsentCopy = typeof de;

const bg: ConsentCopy = {
  banner: {
    title: "Бисквитки и външно съдържание",
    body: "Технически необходимите бисквитки (сесия, количка, самият този избор) слагаме винаги. Външните видеа и статистиката зареждаме само с твоето съгласие — дотогава те",
    bodyStrong: "не се зареждат",
    bodyTail: ", а не просто се скриват.",
    privacyLink: "политика за защита на данните",
    acceptAll: "Приемам всички",
    rejectAll: "Отказвам всички",
    settings: "Настройки",
    settingsLess: "Скрий настройките",
    save: "Запази избора",
    categories: "Категории бисквитки",
    necessaryLabel: "Необходими · винаги активни",
    necessaryBody:
      "Сесия, количка и решението ти за бисквитките. Без тях сайтът не работи.",
    functionalLabel: "Външно съдържание",
    functionalBody:
      "Видеа от Vimeo и GoTo. Без съгласие на тяхно място стои заместител.",
    analyticsLabel: "Статистика",
    analyticsBody: "Анонимна справка кои страници се четат.",
  },
  gate: {
    notLoaded: "не е заредено",
    notLoadedGeneric: "Съдържанието не е заредено",
    explain: (provider: string) =>
      `Това съдържание идва от ${provider}. При зареждане ${provider} получава твоя IP адрес. Затова го зареждаме само след съгласие.`,
    loadAndAccept: "Зареди и приеми",
    revokeNote:
      "Съгласието важи за външното съдържание в целия сайт и се оттегля по всяко време от",
    revokeLink: "Настройки за бисквитки",
    revokeTail: ".",
  },
};

const en: ConsentCopy = {
  banner: {
    title: "Cookies and external content",
    body: "We always set technically necessary cookies (session, cart, this choice itself). External videos and statistics load only with your consent — until then they are",
    bodyStrong: "not loaded",
    bodyTail: ", not merely hidden.",
    privacyLink: "privacy policy",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    settings: "Settings",
    settingsLess: "Show less",
    save: "Save choice",
    categories: "Cookie categories",
    necessaryLabel: "Necessary · always on",
    necessaryBody:
      "Session, cart and your cookie choice. The site does not work without them.",
    functionalLabel: "External content",
    functionalBody:
      "Videos from Vimeo and GoTo. Without consent a placeholder appears instead.",
    analyticsLabel: "Statistics",
    analyticsBody: "Anonymous analysis of which pages get read.",
  },
  gate: {
    notLoaded: "is not loaded",
    notLoadedGeneric: "Content not loaded",
    explain: (provider: string) =>
      `This content comes from ${provider}. On loading, ${provider} receives your IP address. That is why we load it only once you agree.`,
    loadAndAccept: "Load and accept",
    revokeNote:
      "Consent applies to external content across the site and can be withdrawn any time under",
    revokeLink: "Cookie settings",
    revokeTail: ".",
  },
};

const COPY: Record<Locale, ConsentCopy> = { de, bg, en };

export function consentCopy(locale: Locale): ConsentCopy {
  return COPY[locale] ?? COPY.de;
}
