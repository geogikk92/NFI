// ТЕРИТОРИЯ НА БОБИ · задача 8 — безплатни материали зад форма.
//
// ЧИСТ модул: без `db` и без next/headers, защото формата за достъп е
// клиентски компонент и внася оттук HONEYPOT_FIELD и схемата. Влезе ли
// тук Prisma, тя се озовава в браузърния бъндъл. Заявките са в
// free-materials-db.ts — същото разделение като при call-requests.
//
// Защо материалите са ЗАД ФОРМА, а не свободни за сваляне:
// те са входната точка на фунията (план, задача 8). Човек оставя имейл,
// получава материала и — ако е дал съгласие — влиза в бюлетина.
// Съгласието за бюлетин е ОТДЕЛНА отметка и НЕ е условие за достъп:
// обвързването на достъпа със съгласие е „принудително съгласие" и не е
// свободно дадено по смисъла на GDPR (чл. 7, ал. 4).

import { z } from "zod";

/** Ботовете попълват всяко поле, включително скритото. */
export const HONEYPOT_FIELD = "website";

/** Под две секунди значи автоматично попълване — както при заявките. */
export const MIN_FILL_SECONDS = 2;

/** Толкова заявки за материали от един IP за един час. */
export const RATE_LIMIT_PER_HOUR = 10;

/** Колко дълго важи връзката за сваляне. */
export const GRANT_TTL_HOURS = 72;

/** Колко пъти може да се ползва една връзка. */
export const GRANT_MAX_DOWNLOADS = 5;

export const MATERIAL_KINDS = [
  "PDF",
  "VIDEO_VIMEO",
  "VIDEO_GOTO",
  "AUDIO",
  "LINK",
] as const;

export type MaterialKind = (typeof MATERIAL_KINDS)[number];

/** Видеата минават през ConsentGate; останалите не вграждат нищо чуждо. */
export function isEmbeddedVideo(kind: MaterialKind): boolean {
  return kind === "VIDEO_VIMEO" || kind === "VIDEO_GOTO";
}

/** Кой доставчик стои зад вграждането — изписва се в заместителя. */
export function embedProvider(kind: MaterialKind): string | null {
  if (kind === "VIDEO_VIMEO") return "Vimeo";
  if (kind === "VIDEO_GOTO") return "GoTo";
  return null;
}

/** Материалите, които се СВАЛЯТ, минават през DownloadGrant. */
export function needsDownloadGrant(kind: MaterialKind): boolean {
  return kind === "PDF" || kind === "AUDIO";
}

/**
 * Съобщенията са КОДОВЕ, не текстове — формата е на три езика.
 * Превеждат се в lib/i18n/pages/materials.ts.
 */
export const materialAccessSchema = z.object({
  name: z.string().trim().min(2, "name-too-short").max(120, "name-too-long"),
  email: z.string().trim().toLowerCase().email("email-invalid"),
  /** Отметката за бюлетина. По желание — виж бележката най-горе. */
  newsletter: z.coerce.boolean().optional(),
  /** Кой материал се иска. */
  slug: z.string().trim().min(1).max(200),
});

export type MaterialAccessInput = z.infer<typeof materialAccessSchema>;

/**
 * Изтекла ли е връзката или е изчерпана.
 *
 * Чист предикат, за да се тества без база. Пази реда на проверките:
 * отменената връзка се съобщава като отменена, не като изтекла.
 */
export function grantState(
  grant: {
    expiresAt: Date;
    maxDownloads: number;
    downloadCount: number;
    revokedAt: Date | null;
  },
  now: Date = new Date(),
): "ok" | "revoked" | "expired" | "exhausted" {
  if (grant.revokedAt !== null) return "revoked";
  if (grant.expiresAt.getTime() <= now.getTime()) return "expired";
  if (grant.downloadCount >= grant.maxDownloads) return "exhausted";
  return "ok";
}

/** Кога изтича връзка, издадена сега. */
export function grantExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + GRANT_TTL_HOURS * 60 * 60 * 1000);
}

/**
 * Текстът, който се щампова върху PDF-а.
 *
 * Личните данни във водния знак са НАЙ-МАЛКОТО, което върши работа:
 * име и имейл. Без IP и без час — те не помагат срещу разпространение, а
 * разширяват щетата, ако файлът изтече.
 */
export function watermarkFor(name: string, email: string): string {
  return `${name.trim()} · ${email.trim().toLowerCase()}`;
}
