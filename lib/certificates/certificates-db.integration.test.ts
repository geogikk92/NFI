// Интеграционен тест на издаването срещу ИСТИНСКА база.
//
// Уникалните ограничения (един сертификат на човек и курс, уникален код),
// броячът и одитната следа живеят в Postgres — unit тест с мокове би
// доказал само, че моковете са написани както тестът очаква.
//
// Пропуска се тихо без DATABASE_URL — същото правило като counter теста.

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { AuditMeta } from "@/lib/admin/audit";
import { head, readObject } from "@/lib/storage";
import {
  CertificateTargetGone,
  DuplicateCertificate,
  certificatesForUser,
  ensureCertificatePdf,
  findCertificateByVerifyCode,
  issueCertificate,
  restoreCertificate,
  revokeCertificate,
} from "./certificates-db";

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

const EMAIL = "test-sertifikati@integration.local";
const SLUG = "test-sertifikati-kurs";

suite("Сертификати срещу истински Postgres", () => {
  let uploadsDir: string;
  let userId: string;
  let courseId: string;
  let meta: AuditMeta;

  beforeAll(async () => {
    // PDF-ите отиват във временна папка, не в uploads/ на репото.
    uploadsDir = await mkdtemp(path.join(tmpdir(), "nfi-cert-"));
    process.env.UPLOADS_DIR = uploadsDir;

    await cleanup();

    const user = await db.user.create({
      data: { email: EMAIL, name: "Тестова Курсистка", locale: "bg" },
      select: { id: true },
    });
    userId = user.id;

    const course = await db.course.create({
      data: {
        slug: SLUG,
        title: "Тестов курс за сертификати",
        titleDe: "Testkurs für Zertifikate",
        level: "B1",
        format: "ONLINE",
      },
      select: { id: true },
    });
    courseId = course.id;

    meta = {
      actorId: userId,
      actorEmail: EMAIL,
      ip: "127.0.0.1",
      userAgent: "vitest",
    };
  });

  afterAll(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(uploadsDir, { recursive: true, force: true });
    await cleanup();
    await db.$disconnect();
  });

  async function cleanup() {
    await db.certificate.deleteMany({
      where: { user: { email: EMAIL } },
    });
    await db.auditLog.deleteMany({
      where: { entity: "Certificate", actorEmail: EMAIL },
    });
    await db.course.deleteMany({ where: { slug: SLUG } });
    await db.user.deleteMany({ where: { email: EMAIL } });
  }

  it("издава: номер по формата, код, одитна следа — и не допуска дубъл", async () => {
    const issued = await issueCertificate(
      { userId, courseId, holderName: "Тестова Курсистка", level: "B1" },
      meta,
    );

    expect(issued.number).toMatch(/^NFI-Z-\d{4}-\d{5}$/);
    expect(issued.verifyCode).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);

    // Следата е записана в същата транзакция.
    const trail = await db.auditLog.findMany({
      where: { entity: "Certificate", entityId: issued.id },
    });
    expect(trail).toHaveLength(1);
    expect(trail[0].action).toBe("certificate.issue");
    // verifyCode не бива да личи в следата.
    expect(JSON.stringify(trail[0].after)).not.toContain(issued.verifyCode);

    // Втори сертификат за същия човек и курс — отказ с обяснимо име.
    await expect(
      issueCertificate(
        { userId, courseId, holderName: "Друго Име", level: "B1" },
        meta,
      ),
    ).rejects.toBeInstanceOf(DuplicateCertificate);
  });

  it("несъществуващ курс дава CertificateTargetGone, не гола P2003", async () => {
    await expect(
      issueCertificate(
        {
          userId,
          courseId: "nesashtestvuvasht",
          holderName: "Име",
          level: "A1",
        },
        meta,
      ),
    ).rejects.toBeInstanceOf(CertificateTargetGone);
  });

  it("проверката по код прощава малки букви и липсващи тирета", async () => {
    const [own] = await certificatesForUser(userId);

    const sloppy = own.verifyCode.toLowerCase().replaceAll("-", "");
    const found = await findCertificateByVerifyCode(sloppy);

    expect(found?.number).toBe(own.number);
    expect(found?.state).toBe("valid");
    expect(found?.holderName).toBe("Тестова Курсистка");

    expect(await findCertificateByVerifyCode("XXXX-XXXX-XXXX")).toBeNull();
    expect(await findCertificateByVerifyCode("боклук")).toBeNull();
  });

  it("отмяната се вижда в проверката, възстановяването я връща", async () => {
    const [own] = await certificatesForUser(userId);

    await revokeCertificate(own.id, "Издаден по погрешка", meta);
    expect((await findCertificateByVerifyCode(own.verifyCode))?.state).toBe(
      "revoked",
    );

    await restoreCertificate(own.id, meta);
    expect((await findCertificateByVerifyCode(own.verifyCode))?.state).toBe(
      "valid",
    );

    const actions = await db.auditLog.findMany({
      where: { entity: "Certificate", entityId: own.id },
      orderBy: { createdAt: "asc" },
      select: { action: true },
    });
    expect(actions.map((row) => row.action)).toEqual([
      "certificate.issue",
      "certificate.revoke",
      "certificate.restore",
    ]);
  });

  it("PDF-ът се генерира, записва се в реда и е истински файл", async () => {
    const [own] = await certificatesForUser(userId);

    const key = await ensureCertificatePdf(own.id);
    expect(key).toBe(
      `document/${own.number.match(/-(\d{4})-/)?.[1]}/zertifikat-${own.number.toLowerCase()}.pdf`,
    );

    // Второ извикване е безобидно и връща същия ключ.
    expect(await ensureCertificatePdf(own.id)).toBe(key);

    const [refreshed] = await certificatesForUser(userId);
    expect(refreshed.storageKey).toBe(key);

    // Файлът наистина е в хранилището и е PDF.
    expect((await head(key))?.mimeType).toBe("application/pdf");
    const object = await readObject(key);
    expect(object?.body.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
