// Текстовете на формата за заявка за обаждане — трите езика.
//
// По образеца на речниците: de диктува формата, `const bg: T` не пуска
// непълен превод. Кодовете на грешки идват от zod схемата в
// lib/cms/call-requests.ts.

import type { Locale } from "../config";

const de = {
  labels: {
    name: "Name",
    email: "E-Mail",
    phone: "Telefon",
    phoneHint: "Für einen Rückruf — sonst antworten wir per E-Mail.",
    preferredTime: "Wann passt es Ihnen?",
    timeHint: "z. B. „vormittags“ oder „nach 18 Uhr“",
    message: "Ihre Nachricht",
    required: "Pflichtfeld",
    submit: "Rückruf anfragen",
    pending: "Wird gesendet…",
    courseContext: "Ihre Anfrage bezieht sich auf:",
    privacyNote:
      "Wir verwenden Ihre Angaben ausschließlich, um Ihre Anfrage zu bearbeiten. Mehr dazu in der",
    privacyLink: "Datenschutzerklärung",
  },
  result: {
    successTitle: "Anfrage erhalten",
    successBody:
      "Danke! Wir melden uns innerhalb eines Werktags bei Ihnen. Bei dringenden Fragen erreichen Sie uns telefonisch.",
    checkFields: "Bitte prüfen Sie die markierten Felder.",
    rateLimited:
      "Wir haben in der letzten Stunde mehrere Anfragen von Ihnen erhalten. Bitte rufen Sie uns direkt an oder versuchen Sie es später.",
    saveFailed:
      "Die Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
    invalidRequest: "Ungültige Anfrage.",
  },
  errors: {
    "name-too-short": "Bitte geben Sie Ihren Namen an.",
    "name-too-long": "Der Name ist zu lang.",
    "email-invalid": "Bitte prüfen Sie Ihre E-Mail-Adresse.",
    "phone-too-long": "Die Telefonnummer ist zu lang.",
    "message-too-long": "Die Nachricht ist zu lang.",
  } as Record<string, string>,
};

export type ContactFormCopy = typeof de;

const bg: ContactFormCopy = {
  labels: {
    name: "Име",
    email: "Имейл",
    phone: "Телефон",
    phoneHint: "За обратно обаждане — иначе отговаряме по имейл.",
    preferredTime: "Кога ти е удобно?",
    timeHint: "напр. „преди обед“ или „след 18 ч.“",
    message: "Твоето съобщение",
    required: "задължително",
    submit: "Заяви обаждане",
    pending: "Изпраща се…",
    courseContext: "Запитването се отнася за:",
    privacyNote:
      "Използваме данните ти единствено за обработка на запитването. Повече в",
    privacyLink: "политиката за защита на данните",
  },
  result: {
    successTitle: "Получихме запитването",
    successBody:
      "Благодарим! Обаждаме се до един работен ден. При спешност ни потърси по телефона.",
    checkFields: "Провери отбелязаните полета.",
    rateLimited:
      "През последния час получихме няколко запитвания от теб. Обади ни се директно или опитай по-късно.",
    saveFailed: "Запитването не можа да се запише. Опитай отново.",
    invalidRequest: "Невалидна заявка.",
  },
  errors: {
    "name-too-short": "Напиши името си.",
    "name-too-long": "Името е твърде дълго.",
    "email-invalid": "Провери имейл адреса.",
    "phone-too-long": "Телефонният номер е твърде дълъг.",
    "message-too-long": "Съобщението е твърде дълго.",
  },
};

const en: ContactFormCopy = {
  labels: {
    name: "Name",
    email: "Email",
    phone: "Phone",
    phoneHint: "For a callback — otherwise we reply by email.",
    preferredTime: "When suits you?",
    timeHint: "e.g. “mornings” or “after 6 pm”",
    message: "Your message",
    required: "required",
    submit: "Request a callback",
    pending: "Sending…",
    courseContext: "Your enquiry is about:",
    privacyNote:
      "We use your details solely to handle your enquiry. More in the",
    privacyLink: "privacy policy",
  },
  result: {
    successTitle: "Enquiry received",
    successBody:
      "Thank you! We'll get back to you within one working day. For urgent questions, call us.",
    checkFields: "Please check the highlighted fields.",
    rateLimited:
      "We've received several enquiries from you in the last hour. Please call us directly or try again later.",
    saveFailed: "The enquiry could not be saved. Please try again.",
    invalidRequest: "Invalid request.",
  },
  errors: {
    "name-too-short": "Please enter your name.",
    "name-too-long": "The name is too long.",
    "email-invalid": "Please check your email address.",
    "phone-too-long": "The phone number is too long.",
    "message-too-long": "The message is too long.",
  },
};

const COPY: Record<Locale, ContactFormCopy> = { de, bg, en };

export function contactFormCopy(locale: Locale): ContactFormCopy {
  return COPY[locale] ?? COPY.de;
}

/** Код от схемата → текст на езика. Непознат код пада на самия код. */
export function translateFieldError(locale: Locale, code: string): string {
  return contactFormCopy(locale).errors[code] ?? code;
}
