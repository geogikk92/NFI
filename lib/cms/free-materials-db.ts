// ТЕРИТОРИЯ НА БОБИ · задача 8 — безплатни материали, достъп до базата.
//
// Отделен от free-materials.ts, защото ТОЗИ файл внася Prisma. Клиентски
// компонент, който импортира от него, влачи pg в браузърния бъндъл.

import { cache } from "react";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  GRANT_MAX_DOWNLOADS,
  RATE_LIMIT_PER_HOUR,
  grantExpiry,
  grantState,
  needsDownloadGrant,
  watermarkFor,
  type MaterialAccessInput,
  type MaterialKind,
} from "./free-materials";

export interface FreeMaterialSummary {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  kind: MaterialKind;
  externalId: string | null;
  level: string | null;
  coverMediaId: string | null;
}

const SUMMARY_FIELDS = {
  id: true,
  slug: true,
  title: true,
  titleDe: true,
  titleEn: true,
  description: true,
  descriptionDe: true,
  descriptionEn: true,
  kind: true,
  externalId: true,
  level: true,
  coverMediaId: true,
} as const;

export async function listFreeMaterials(): Promise<FreeMaterialSummary[]> {
  const rows = await db.freeMaterial.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: SUMMARY_FIELDS,
  });

  return rows as FreeMaterialSummary[];
}

/**
 * Обвито в React `cache()` по същата причина като getCourseBySlug:
 * generateMetadata и страницата викат независимо, а Next мемоизира само
 * `fetch()`, не и Prisma.
 *
 * `storageKey` НЕ е в избраните полета — той е вътрешен път до файла и
 * няма работа в компонент. Сваля се само през токен, в download-а.
 */
export const getFreeMaterialBySlug = cache(
  async (slug: string): Promise<FreeMaterialSummary | null> => {
    const row = await db.freeMaterial.findFirst({
      where: { slug, published: true },
      select: SUMMARY_FIELDS,
    });

    return (row as FreeMaterialSummary) ?? null;
  },
);

/**
 * Брои заявките за материали от този IP за последния час.
 *
 * Ограничението е в БАЗАТА, не в паметта — на Vercel всяка заявка може да
 * попадне на друга инстанция. Брои се по DownloadGrant.ip.
 */
export async function isMaterialRateLimited(
  ip: string | null,
  now: Date = new Date(),
): Promise<boolean> {
  // Без IP не ограничаваме — цял офис зад един прокси не бива да се
  // заключва взаимно. Honeypot-ът и времето продължават да действат.
  if (!ip) return false;

  const since = new Date(now.getTime() - 60 * 60 * 1000);

  const count = await db.downloadGrant.count({
    where: { ip, createdAt: { gte: since } },
  });

  return count >= RATE_LIMIT_PER_HOUR;
}

/** 32 байта ентропия, base64url — изискване от схемата, не cuid. */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface GrantAccessResult {
  /** Токенът за сваляне; липсва при материали, които не се свалят. */
  token: string | null;
  materialTitle: string;
}

/**
 * Издава достъп до материал.
 *
 * Токен се издава САМО за материали, които се свалят (PDF, аудио).
 * За вградено видео няма файл — там достъпът е самата страница, а
 * вграждането минава през ConsentGate.
 */
export async function grantMaterialAccess(
  input: MaterialAccessInput,
  meta: { ip: string | null },
): Promise<GrantAccessResult | null> {
  const material = await db.freeMaterial.findFirst({
    where: { slug: input.slug, published: true },
    select: { id: true, title: true, kind: true },
  });

  if (!material) return null;

  const downloadable = needsDownloadGrant(material.kind as MaterialKind);
  const token = newToken();

  // Grant се записва И за видео: там той не отключва файл, а е следата
  // „кой поиска какво" — без нея видео-заявката не оставя контакт и
  // формата събира въздух. Токенът просто не се връща.
  await db.downloadGrant.create({
    data: {
      email: input.email,
      freeMaterialId: material.id,
      token,
      expiresAt: grantExpiry(),
      maxDownloads: downloadable ? GRANT_MAX_DOWNLOADS : 0,
      watermarkText: watermarkFor(input.name, input.email),
      ip: meta.ip,
    },
    select: { id: true },
  });

  return { token: downloadable ? token : null, materialTitle: material.title };
}

export type RedeemResult =
  | { ok: true; storageKey: string; watermarkText: string | null; filename: string }
  | { ok: false; reason: "not-found" | "revoked" | "expired" | "exhausted" | "no-file" };

/**
 * Осребрява токен за сваляне.
 *
 * Броячът се вдига с УСЛОВНО обновяване (`updateMany` с проверка в
 * `where`), не с четене и после писане: две едновременни заявки с един
 * токен биха прочели едно и също число и биха минали и двете. Тук базата
 * решава — редът се променя само ако още е под тавана.
 */
export async function redeemDownloadToken(
  token: string,
  now: Date = new Date(),
): Promise<RedeemResult> {
  const grant = await db.downloadGrant.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      maxDownloads: true,
      downloadCount: true,
      revokedAt: true,
      watermarkText: true,
      freeMaterial: { select: { storageKey: true, slug: true } },
    },
  });

  if (!grant) return { ok: false, reason: "not-found" };

  const state = grantState(grant, now);
  if (state !== "ok") return { ok: false, reason: state };

  if (!grant.freeMaterial?.storageKey) {
    return { ok: false, reason: "no-file" };
  }

  const claimed = await db.downloadGrant.updateMany({
    where: {
      id: grant.id,
      revokedAt: null,
      expiresAt: { gt: now },
      downloadCount: { lt: grant.maxDownloads },
    },
    data: { downloadCount: { increment: 1 }, lastUsedAt: now },
  });

  // Нула засегнати реда значи, че между четенето и писането някой друг е
  // изчерпал последното сваляне.
  if (claimed.count === 0) return { ok: false, reason: "exhausted" };

  return {
    ok: true,
    storageKey: grant.freeMaterial.storageKey,
    watermarkText: grant.watermarkText,
    filename: `${grant.freeMaterial.slug}.pdf`,
  };
}
