// ТЕРИТОРИЯ НА БОБИ · задача 16 — сертификати, чистата част.
//
// Тук няма Prisma и няма файлова система: кодове, състояния, ключове.
// Всичко, което пипа базата, е в certificates-db.ts; всичко, което рисува
// PDF — в pdf.ts. Делението е същото като при материалите (задача 8).

import { randomInt } from "node:crypto";

/** Нивата по ОЕЕР — огледало на Prisma enum-а CourseLevel, без да го внася. */
export const CERTIFICATE_LEVELS = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type CertificateLevel = (typeof CERTIFICATE_LEVELS)[number];

export const HOLDER_NAME_MIN = 2;
export const HOLDER_NAME_MAX = 120;

// ─────────────────────────────────────────────────────────────────────────
//  Код за проверка
// ─────────────────────────────────────────────────────────────────────────

/**
 * Азбука без 0/O, 1/I/L: кодът се чете на глас по телефона и се преписва
 * от хартия. Обърквания от вида „нула или о" струват обаждане до офиса.
 * 31 знака × 12 позиции ≈ 2⁵⁹ — отгатването не е път за атака.
 */
const VERIFY_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

const VERIFY_GROUPS = 3;
const VERIFY_GROUP_LENGTH = 4;

/** „XK7M-2PQ9-WD4T" — групите са за очите, тирето не носи информация. */
export function generateVerifyCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < VERIFY_GROUPS; g += 1) {
    let group = "";
    for (let i = 0; i < VERIFY_GROUP_LENGTH; i += 1) {
      group += VERIFY_ALPHABET[randomInt(VERIFY_ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}

/**
 * Привежда въведеното от човек към каноничния запис в базата.
 *
 * Приема малки букви, интервали, липсващи или излишни тирета — всичко,
 * което се случва при преписване от PDF. Връща null при невъзможен код,
 * за да не стига до базата заявка, която няма как да уцели.
 */
export function normalizeVerifyCode(raw: string): string | null {
  const bare = raw.toUpperCase().replace(/[\s-]+/g, "");
  if (bare.length !== VERIFY_GROUPS * VERIFY_GROUP_LENGTH) return null;

  for (const char of bare) {
    if (!VERIFY_ALPHABET.includes(char)) return null;
  }

  const groups: string[] = [];
  for (let g = 0; g < VERIFY_GROUPS; g += 1) {
    groups.push(bare.slice(g * VERIFY_GROUP_LENGTH, (g + 1) * VERIFY_GROUP_LENGTH));
  }
  return groups.join("-");
}

// ─────────────────────────────────────────────────────────────────────────
//  Състояние
// ─────────────────────────────────────────────────────────────────────────

export type CertificateState = "valid" | "revoked";

/**
 * Едно място решава „важи ли". Публичната страница за проверка, профилът
 * и админът питат тук — две отделни проверки биха се разминали в деня, в
 * който състоянията станат три.
 */
export function certificateState(certificate: {
  revokedAt: Date | null;
}): CertificateState {
  return certificate.revokedAt ? "revoked" : "valid";
}

// ─────────────────────────────────────────────────────────────────────────
//  Ключ в хранилището
// ─────────────────────────────────────────────────────────────────────────

/**
 * Ключът е ДЕТЕРМИНИСТИЧЕН — изведен от номера, без случаен суфикс.
 *
 * Нарочно различно от newObjectKey(): преиздаването на PDF-а (нов дизайн,
 * поправен правопис) трябва да ПРЕЗАПИШЕ стария файл, не да остави
 * осиротяло копие с валиден подписан линк към отмененото съдържание.
 * Номерът е уникален по схема, значи и ключът е.
 *
 * Номерът се стеснява до азбуката на isSafeKey(). Истинските номера
 * („NFI-Z-2026-00042") минават непроменени; защитата е за деня, в който
 * някой подаде нещо друго — тогава ключът пак е валиден, а не грешка
 * дълбоко в localPut().
 */
export function certificateStorageKey(number: string): string {
  const year = /-(\d{4})-/.exec(number)?.[1] ?? "bez-godina";
  const safe =
    number
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "bez-nomer";
  return `document/${year}/zertifikat-${safe}.pdf`;
}

/** Името, под което браузърът предлага файла. */
export function certificateDownloadName(number: string): string {
  return `NFI-Zertifikat-${number}.pdf`;
}

// ─────────────────────────────────────────────────────────────────────────
//  Публичен адрес за проверка
// ─────────────────────────────────────────────────────────────────────────

/**
 * Адресът, отпечатан в PDF-а. БЕЗ език: middleware-ът праща госта към
 * неговия. Сертификатът живее години — колкото по-къс и глупав е адресът,
 * толкова по-дълго ще работи.
 */
export function certificateVerifyUrl(baseUrl: string, verifyCode: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/zertifikat/${verifyCode}`;
}
