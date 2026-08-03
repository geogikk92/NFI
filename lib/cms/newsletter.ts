// ТЕРИТОРИЯ НА БОБИ · задача 7 — бюлетин с double opt-in.
//
// ЧИСТ модул: без база, за да го внася клиентската форма във футъра.
// Заявките са в newsletter-db.ts.
//
// Double opt-in не е учтивост, а изискване: съгласието трябва да е
// ДОКАЗУЕМО (Art. 7(1) GDPR), а имейл, вписан от кого да е, не доказва
// нищо. Записът става PENDING; чак кликът върху линка в писмото го прави
// CONFIRMED — и точно този клик се записва в ConsentLog с версията на
// текста, който човекът е чел.

import { z } from "zod";

/** Ботовете попълват всяко поле, включително скритото. */
export const HONEYPOT_FIELD = "website";

/**
 * Версия на текста на съгласието. Сменя се при ВСЯКА промяна на
 * формулировката до отметката — ConsentLog пази коя версия е приета.
 */
export const NEWSLETTER_CONSENT_VERSION = "2026-08-03";

/**
 * Текстът, чиято версия пазим — на езика-източник. ConsentLog иска и
 * hash, за да личи дали текстът и версията не са се разминали.
 */
export const NEWSLETTER_CONSENT_TEXT =
  "Съгласявам се да получавам бюлетина на NFI с учебни материали и новини. " +
  "Мога да се отпиша по всяко време от линка във всяко писмо.";

/** Съобщенията са КОДОВЕ — формата е на три езика. */
export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("email-invalid"),
  locale: z.enum(["bg", "de", "en"]).default("bg"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

export type ConfirmOutcome =
  | "confirmed"
  /** Вече потвърден: кликнал е втори път. Не е грешка. */
  | "already"
  | "not-found";

export type UnsubscribeOutcome = "unsubscribed" | "already" | "not-found";
