// Текстовете на страница „Контакт".
//
// Самата форма (components/content/call-request-form.tsx) е чужда
// територия и още е на немски — тук са само текстовете около нея.

import type { Locale } from "@/lib/i18n/config";

const de = {
  metaTitle: "Kontakt",
  metaDescription:
    "Rufen Sie uns an oder fordern Sie einen Rückruf an — wir klären Ihr Niveau und finden den passenden Kurs.",
  kicker: "Kontakt",
  titleForCourse: "Beratung anfragen",
  titleGeneral: "Sprechen wir über Ihren Kurs",
  lead:
    "Sagen Sie uns, was Sie erreichen wollen. Wir rufen zurück, klären Ihr Niveau und schlagen den passenden Kurs vor — unverbindlich und ohne Zahlung.",
  directHeading: "Direkt erreichen",
  addressHeading: "Adresse",
};

type ContactCopy = typeof de;

const bg: ContactCopy = {
  metaTitle: "Контакт",
  metaDescription:
    "Обади ни се или заяви обаждане — изясняваме нивото и намираме подходящия курс.",
  kicker: "Контакт",
  titleForCourse: "Заяви консултация",
  titleGeneral: "Да поговорим за твоя курс",
  lead:
    "Кажи ни какво искаш да постигнеш. Обаждаме се, изясняваме нивото и предлагаме подходящия курс — без обвързване и без плащане.",
  directHeading: "Директна връзка",
  addressHeading: "Адрес",
};

const en: ContactCopy = {
  metaTitle: "Contact",
  metaDescription:
    "Call us or request a callback — we'll work out your level and find the course that fits.",
  kicker: "Contact",
  titleForCourse: "Request advice",
  titleGeneral: "Let's talk about your course",
  lead:
    "Tell us what you want to achieve. We'll call you back, work out your level and suggest the course that fits — no strings, no payment.",
  directHeading: "Reach us directly",
  addressHeading: "Address",
};

const COPY: Record<Locale, ContactCopy> = { de, bg, en };

export function contactCopy(locale: Locale): ContactCopy {
  return COPY[locale] ?? COPY.de;
}
