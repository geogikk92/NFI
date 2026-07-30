// ТЕРИТОРИЯ НА БОБИ · задача 5 — заявки за обаждане.
// Писано от Жоро, докато Боби е в отпуск.
//
// ЧИСТ модул: без достъп до базата, за да може да се импортира от
// клиентски компонент. Формата ползва HONEYPOT_FIELD оттук; ако тук
// влезе `db`, Prisma и pg се озовават в БРАУЗЪРНИЯ бъндъл и страницата
// дава 500. Заявките към базата са в call-requests-db.ts.
//
// Трите източника (COURSE_PAGE, CONTACT_PAGE, LEVEL_TEST) вече са в
// схемата. Тук са валидацията и защитата от ботове.
//
// Формата е публична и без каптча — каптчата отблъсква истински хора и е
// проблем за достъпността. Вместо нея: honeypot, минимално време за
// попълване и ограничение по IP. Трите заедно спират масовия спам, без да
// пречат на никого.

import { z } from "zod";

/** Ботовете попълват всяко поле, включително скритото. */
export const HONEYPOT_FIELD = "website";

/**
 * Под две секунди означава автоматично попълване — човек не успява да
 * прочете и напише дори име за толкова.
 */
export const MIN_FILL_SECONDS = 2;

/** Заявка, по-стара от това, не се брои за подозрителна. */
export const MAX_FORM_AGE_SECONDS = 60 * 60 * 3;

/** Толкова заявки от един IP за един час. */
export const RATE_LIMIT_PER_HOUR = 5;

export const CALL_REQUEST_SOURCES = [
  "COURSE_PAGE",
  "CONTACT_PAGE",
  "LEVEL_TEST",
] as const;

export type CallRequestSource = (typeof CALL_REQUEST_SOURCES)[number];

export const callRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Bitte geben Sie Ihren Namen an.")
    .max(120, "Der Name ist zu lang."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Bitte prüfen Sie Ihre E-Mail-Adresse."),
  // Телефонът е по желание, но заявката за ОБАЖДАНЕ без телефон е странна —
  // затова е с подсказка, не задължително.
  phone: z
    .string()
    .trim()
    .max(40, "Die Telefonnummer ist zu lang.")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .max(2000, "Die Nachricht ist zu lang.")
    .optional()
    .or(z.literal("")),
  preferredTime: z.string().trim().max(120).optional().or(z.literal("")),
  courseId: z.string().trim().max(64).optional().or(z.literal("")),
  source: z.enum(CALL_REQUEST_SOURCES),
});

export type CallRequestInput = z.infer<typeof callRequestSchema>;

export type SpamVerdict =
  | { spam: false }
  | { spam: true; reason: "honeypot" | "too-fast" | "no-timestamp" };

/**
 * Проверява дали заявката изглежда автоматична.
 *
 * ВАЖНО: подозрителните заявки НЕ се отхвърлят с грешка към човека —
 * записват се със статус SPAM и потребителят вижда обичайното
 * потвърждение. Ботът не научава, че е разпознат, а ако сме сбъркали,
 * заявката е в базата и админът я вижда.
 */
export function checkSpam(input: {
  honeypot: string | null;
  formRenderedAt: number | null;
  now?: number;
}): SpamVerdict {
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return { spam: true, reason: "honeypot" };
  }

  if (input.formRenderedAt === null || Number.isNaN(input.formRenderedAt)) {
    return { spam: true, reason: "no-timestamp" };
  }

  const now = input.now ?? Date.now();
  const elapsedSeconds = (now - input.formRenderedAt) / 1000;

  if (elapsedSeconds < MIN_FILL_SECONDS) {
    return { spam: true, reason: "too-fast" };
  }

  // Твърде стар формуляр не е спам — човекът просто е държал таба отворен.
  return { spam: false };
}
