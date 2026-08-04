import "server-only";

// ТЕРИТОРИЯ НА БОБИ · задача 16 — сертификатите срещу базата.
//
// Издаването е ЕДНА транзакция: номер от общия Counter + ред в Certificate
// + одитна следа. Провали ли се едното, няма нищо — половин сертификат
// (изхабен номер без ред, ред без следа) не съществува като състояние.
//
// PDF-ът е НАРОЧНО извън транзакцията: рисуването и качването в
// хранилището могат да траят секунди и да се провалят по свои причини.
// Сертификатът е фактът в базата; PDF-ът е изведен артефакт, който
// ensureCertificatePdf() може да направи наново по всяко време.

import { cache } from "react";
import { db } from "@/lib/db";
import { nextCertificateNumber } from "@/lib/counter";
import { type AuditMeta, type AuditTx, recordChange } from "@/lib/admin/audit";
import { conflictColumns } from "@/lib/admin/form";
import { head, putObject } from "@/lib/storage";
import {
  type CertificateLevel,
  certificateState,
  certificateStorageKey,
  certificateVerifyUrl,
  generateVerifyCode,
  normalizeVerifyCode,
} from "./certificates";
import { renderCertificatePdf } from "./pdf";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Снимката за одитната следа. verifyCode се скрива от самата следа. */
const AUDITED = {
  id: true,
  number: true,
  userId: true,
  courseId: true,
  holderName: true,
  level: true,
  issuedAt: true,
  storageKey: true,
  verifyCode: true,
  revokedAt: true,
  revokeReason: true,
} as const;

// ─────────────────────────────────────────────────────────────────────────
//  Издаване
// ─────────────────────────────────────────────────────────────────────────

export class DuplicateCertificate extends Error {
  constructor() {
    super("Този човек вече има сертификат за този курс.");
    this.name = "DuplicateCertificate";
  }
}

export class CertificateTargetGone extends Error {
  constructor() {
    super("Потребителят или курсът вече не съществува.");
    this.name = "CertificateTargetGone";
  }
}

export class CertificateGone extends Error {
  constructor() {
    super("Сертификатът вече не съществува.");
    this.name = "CertificateGone";
  }
}

export interface IssueCertificateInput {
  userId: string;
  courseId: string;
  holderName: string;
  level: CertificateLevel;
  /** По подразбиране днес; админът може да издаде със задна дата. */
  issuedAt?: Date;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === code
  );
}

/**
 * Издава сертификат: номер, код за проверка, ред, одитна следа — атомарно.
 *
 * Сблъсък на verifyCode (P2002 по verifyCode) поваля ЦЯЛАТА транзакция,
 * защото Postgres не продължава след грешка — затова опитът се повтаря
 * отвън, с нов код, до три пъти. При 2⁵⁹ възможни кода три опита са
 * теоретична предпазливост, не очакван път.
 */
export async function issueCertificate(
  input: IssueCertificateInput,
  meta: AuditMeta,
): Promise<{ id: string; number: string; verifyCode: string }> {
  for (let attempt = 1; ; attempt += 1) {
    const verifyCode = generateVerifyCode();

    try {
      return await db.$transaction(async (tx: AuditTx) => {
        // Годината в номера следва ДАТАТА НА ИЗДАВАНЕ, не текущия момент:
        // сертификат със задна дата 19.12.2026, издаден на 5 януари, е
        // NFI-Z-2026-…, не NFI-Z-2027-… — иначе номерът и „Ausgestellt am"
        // на същия лист си противоречат.
        const number = await nextCertificateNumber(
          tx,
          input.issuedAt ?? new Date(),
        );

        const certificate = await tx.certificate.create({
          data: {
            userId: input.userId,
            courseId: input.courseId,
            holderName: input.holderName,
            level: input.level,
            issuedAt: input.issuedAt ?? new Date(),
            number,
            verifyCode,
          },
          select: AUDITED,
        });

        await recordChange(tx, meta, {
          action: "certificate.issue",
          entity: "Certificate",
          entityId: certificate.id,
          after: certificate,
        });

        return { id: certificate.id, number, verifyCode };
      });
    } catch (error) {
      if (isPrismaError(error, "P2002")) {
        // Колоните се четат с общия парсер — формата на грешката при
        // driver adapter е коварна (виж коментара към conflictColumns).
        const columns = conflictColumns(error);
        if (columns.some((c) => c.includes("verifyCode")) && attempt < 3) {
          continue;
        }
        if (columns.some((c) => c.includes("userId"))) {
          throw new DuplicateCertificate();
        }
        // Сблъсък по number значи изкривен Counter — това е истинска
        // авария и заслужава да гръмне с оригиналната грешка.
      }
      if (isPrismaError(error, "P2003")) throw new CertificateTargetGone();
      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  PDF артефактът
// ─────────────────────────────────────────────────────────────────────────

/**
 * Гарантира, че PDF-ът на сертификата съществува в хранилището.
 *
 * Идемпотентно: ключът е детерминистичен (изведен от номера), затова
 * повторно извикване просто презаписва същия файл със същото съдържание.
 * Надпревара между две извиквания е безобидна по същата причина.
 *
 * storageKey се пише БЕЗ одитна следа нарочно: това не е решение на
 * човек, а машинно извеждане на файл от вече одитираните данни.
 */
export async function ensureCertificatePdf(id: string): Promise<string> {
  const certificate = await db.certificate.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      verifyCode: true,
      holderName: true,
      level: true,
      issuedAt: true,
      storageKey: true,
      course: { select: { title: true, titleDe: true } },
    },
  });
  if (!certificate) throw new CertificateGone();

  const key = certificateStorageKey(certificate.number);

  // Файлът вече е там и редът го знае — нищо за правене.
  if (certificate.storageKey === key && (await head(key))) return key;

  const bytes = await renderCertificatePdf({
    number: certificate.number,
    verifyCode: certificate.verifyCode,
    verifyUrl: certificateVerifyUrl(APP_URL, certificate.verifyCode),
    holderName: certificate.holderName,
    courseTitleDe: certificate.course.titleDe ?? certificate.course.title,
    courseTitleBg: certificate.course.title,
    level: certificate.level as CertificateLevel,
    issuedAt: certificate.issuedAt,
  });

  await putObject("document", key, bytes, "application/pdf");

  if (certificate.storageKey !== key) {
    await db.certificate.update({
      where: { id },
      data: { storageKey: key },
    });
  }

  return key;
}

// ─────────────────────────────────────────────────────────────────────────
//  Отмяна и възстановяване
// ─────────────────────────────────────────────────────────────────────────

export async function revokeCertificate(
  id: string,
  reason: string,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.certificate.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new CertificateGone();

    const after = await tx.certificate.update({
      where: { id },
      data: { revokedAt: before.revokedAt ?? new Date(), revokeReason: reason },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "certificate.revoke",
      entity: "Certificate",
      entityId: id,
      before,
      after,
    });
  });
}

export async function restoreCertificate(
  id: string,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.certificate.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new CertificateGone();

    const after = await tx.certificate.update({
      where: { id },
      data: { revokedAt: null, revokeReason: null },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "certificate.restore",
      entity: "Certificate",
      entityId: id,
      before,
      after,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Четене — профил, публична проверка, админ
// ─────────────────────────────────────────────────────────────────────────

export interface OwnCertificate {
  id: string;
  number: string;
  holderName: string;
  level: CertificateLevel;
  issuedAt: Date;
  revokedAt: Date | null;
  verifyCode: string;
  storageKey: string | null;
  courseTitle: string;
  courseTitleDe: string | null;
  courseTitleEn: string | null;
}

/** Сертификатите на влезлия човек — за раздела в профила. */
export async function certificatesForUser(
  userId: string,
): Promise<OwnCertificate[]> {
  const rows = await db.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      number: true,
      holderName: true,
      level: true,
      issuedAt: true,
      revokedAt: true,
      verifyCode: true,
      storageKey: true,
      course: { select: { title: true, titleDe: true, titleEn: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    holderName: row.holderName,
    level: row.level as CertificateLevel,
    issuedAt: row.issuedAt,
    revokedAt: row.revokedAt,
    verifyCode: row.verifyCode,
    storageKey: row.storageKey,
    courseTitle: row.course.title,
    courseTitleDe: row.course.titleDe,
    courseTitleEn: row.course.titleEn,
  }));
}

export interface VerifiedCertificate {
  state: "valid" | "revoked";
  number: string;
  holderName: string;
  level: CertificateLevel;
  issuedAt: Date;
  revokedAt: Date | null;
  courseTitle: string;
  courseTitleDe: string | null;
  courseTitleEn: string | null;
}

/**
 * Публичната проверка по код.
 *
 * Кодът е с висока ентропия, затова търсенето по него не е оракул за
 * изброяване. Причината за отмяна НЕ излиза навън — тя е вътрешна бележка;
 * светът вижда само „отменен на дата".
 */
export const findCertificateByVerifyCode = cache(
  async (raw: string): Promise<VerifiedCertificate | null> => {
    const code = normalizeVerifyCode(raw);
    if (!code) return null;

    const row = await db.certificate.findUnique({
      where: { verifyCode: code },
      select: {
        number: true,
        holderName: true,
        level: true,
        issuedAt: true,
        revokedAt: true,
        course: { select: { title: true, titleDe: true, titleEn: true } },
      },
    });
    if (!row) return null;

    return {
      state: certificateState(row),
      number: row.number,
      holderName: row.holderName,
      level: row.level as CertificateLevel,
      issuedAt: row.issuedAt,
      revokedAt: row.revokedAt,
      courseTitle: row.course.title,
      courseTitleDe: row.course.titleDe,
      courseTitleEn: row.course.titleEn,
    };
  },
);

// ─────────────────────────────────────────────────────────────────────────
//  Админ
// ─────────────────────────────────────────────────────────────────────────

export interface AdminCertificateRow {
  id: string;
  number: string;
  holderName: string;
  userEmail: string;
  courseTitle: string;
  level: CertificateLevel;
  issuedAt: Date;
  revokedAt: Date | null;
  hasPdf: boolean;
}

export async function listCertificatesForAdmin(): Promise<
  AdminCertificateRow[]
> {
  const rows = await db.certificate.findMany({
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      number: true,
      holderName: true,
      level: true,
      issuedAt: true,
      revokedAt: true,
      storageKey: true,
      user: { select: { email: true } },
      course: { select: { title: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    holderName: row.holderName,
    userEmail: row.user.email,
    courseTitle: row.course.title,
    level: row.level as CertificateLevel,
    issuedAt: row.issuedAt,
    revokedAt: row.revokedAt,
    hasPdf: Boolean(row.storageKey),
  }));
}

export interface AdminCertificateDetail {
  id: string;
  number: string;
  holderName: string;
  level: CertificateLevel;
  issuedAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  verifyCode: string;
  storageKey: string | null;
  userEmail: string;
  userName: string | null;
  courseTitle: string;
}

export async function getCertificateForAdmin(
  id: string,
): Promise<AdminCertificateDetail | null> {
  const row = await db.certificate.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      holderName: true,
      level: true,
      issuedAt: true,
      revokedAt: true,
      revokeReason: true,
      verifyCode: true,
      storageKey: true,
      user: { select: { email: true, name: true } },
      course: { select: { title: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    number: row.number,
    holderName: row.holderName,
    level: row.level as CertificateLevel,
    issuedAt: row.issuedAt,
    revokedAt: row.revokedAt,
    revokeReason: row.revokeReason,
    verifyCode: row.verifyCode,
    storageKey: row.storageKey,
    userEmail: row.user.email,
    userName: row.user.name,
    courseTitle: row.course.title,
  };
}

/**
 * Човекът, на когото се издава — намира се по имейл, защото админът няма
 * (и по план не получава) екран със списък на потребителите.
 */
export async function resolveStudentByEmail(
  email: string,
): Promise<{ id: string; name: string | null; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  return db.user.findFirst({
    where: { email: normalized, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
}

export interface CertificateCourseOption {
  id: string;
  title: string;
  level: CertificateLevel;
}

/** Курсовете за падащото меню — И непубликуваните: курс може да е минал. */
export async function courseOptionsForCertificates(): Promise<
  CertificateCourseOption[]
> {
  const rows = await db.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, level: true },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    level: row.level as CertificateLevel,
  }));
}
