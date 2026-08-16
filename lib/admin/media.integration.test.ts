// Интеграционен тест на медийната библиотека срещу ИСТИНСКА база.
//
// Транзакцията с одитната следа, уникалният ключ и mediaUsage() (замести-
// телят на липсващия foreign key) живеят в Postgres — unit тест с мокове
// би доказал само, че моковете са написани както тестът очаква.
//
// Пропуска се тихо без DATABASE_URL — същото правило като counter теста.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { AuditMeta } from "@/lib/admin/audit";
import {
  MediaGone,
  createMedia,
  deleteMedia,
  getMediaForEdit,
  listMediaForAdmin,
  mediaUsage,
  parseMediaMetaForm,
  updateMediaMeta,
  usageCount,
} from "./media";

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

const EMAIL = "test-mediya@integration.local";
const KEY_PREFIX = "media/2026/test-mediya-int";

suite("Медийната библиотека срещу истински Postgres", () => {
  let userId: string;
  let meta: AuditMeta;

  beforeAll(async () => {
    await cleanup();

    const user = await db.user.create({
      data: { email: EMAIL, name: "Тестов Админ", locale: "bg" },
      select: { id: true },
    });
    userId = user.id;

    meta = {
      actorId: userId,
      actorEmail: EMAIL,
      ip: "127.0.0.1",
      userAgent: "vitest",
    };
  });

  afterAll(async () => {
    await cleanup();
    await db.$disconnect();
  });

  async function cleanup() {
    await db.course.deleteMany({ where: { slug: "test-mediya-kurs" } });
    await db.media.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });
    await db.auditLog.deleteMany({ where: { actorEmail: EMAIL } });
    await db.user.deleteMany({ where: { email: EMAIL } });
  }

  function input(suffix: string) {
    return {
      key: `${KEY_PREFIX}-${suffix}.png`,
      bucket: "local",
      mimeType: "image/png",
      sizeBytes: 1234,
      width: 640,
      height: 480,
      checksum: "abc123",
      uploadedById: userId,
    };
  }

  it("createMedia пише реда и следата В ЕДНА транзакция", async () => {
    const { id } = await createMedia(input("create"), meta);

    const row = await getMediaForEdit(id);
    expect(row?.key).toBe(`${KEY_PREFIX}-create.png`);
    expect(row?.width).toBe(640);

    const trail = await db.auditLog.findFirst({
      where: { action: "media.create", entityId: id },
    });
    expect(trail).not.toBeNull();
    expect(trail?.entity).toBe("Media");
    // Цялата снимка при създаване.
    expect((trail?.after as { key?: string })?.key).toBe(
      `${KEY_PREFIX}-create.png`,
    );
  });

  it("updateMediaMeta без реална промяна НЕ пише ред в дневника", async () => {
    const { id } = await createMedia(input("noop"), meta);

    const form = new FormData();
    form.set("alt", "Описание");
    form.set("altDe", "");
    form.set("title", "");

    const parsed = parseMediaMetaForm(form);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await updateMediaMeta(id, parsed.value, meta);
    const countAfterFirst = await db.auditLog.count({
      where: { action: "media.update", entityId: id },
    });
    expect(countAfterFirst).toBe(1);

    // Същите стойности втори път → нищо ново в дневника.
    await updateMediaMeta(id, parsed.value, meta);
    const countAfterSecond = await db.auditLog.count({
      where: { action: "media.update", entityId: id },
    });
    expect(countAfterSecond).toBe(1);
  });

  it("deleteMedia пази цялата снимка в before и връща ключа", async () => {
    const { id } = await createMedia(input("delete"), meta);

    const { key } = await deleteMedia(id, meta);
    expect(key).toBe(`${KEY_PREFIX}-delete.png`);

    expect(await getMediaForEdit(id)).toBeNull();

    const trail = await db.auditLog.findFirst({
      where: { action: "media.delete", entityId: id },
    });
    expect((trail?.before as { key?: string })?.key).toBe(key);
  });

  it("изчезнал ред → MediaGone, не сурова Prisma грешка", async () => {
    await expect(
      updateMediaMeta(
        "nyama-takova-id",
        { alt: null, altDe: null, title: null },
        meta,
      ),
    ).rejects.toBeInstanceOf(MediaGone);
    await expect(deleteMedia("nyama-takova-id", meta)).rejects.toBeInstanceOf(
      MediaGone,
    );
  });

  it("mediaUsage намира курс с тази корица (заместителят на foreign key)", async () => {
    const { id } = await createMedia(input("usage"), meta);

    expect(usageCount(await mediaUsage(id))).toBe(0);

    await db.course.create({
      data: {
        slug: "test-mediya-kurs",
        title: "Курс с корица",
        titleDe: "Kurs mit Cover",
        level: "A1",
        format: "ONLINE",
        coverMediaId: id,
      },
    });

    const usage = await mediaUsage(id);
    expect(usageCount(usage)).toBe(1);
    expect(usage.courses[0]?.title).toBe("Курс с корица");

    // Списъкът показва същата употреба в колоната „Ползва се в".
    const rows = await listMediaForAdmin({ search: "test-mediya-int-usage" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.usedBy).toEqual([
      { kind: "course", id: expect.any(String), title: "Курс с корица" },
    ]);
  });

  it("търсенето в списъка минава и през alt", async () => {
    const { id } = await createMedia(input("tarsene"), meta);
    await updateMediaMeta(
      id,
      { alt: "Василена пред дъската", altDe: null, title: null },
      meta,
    );

    const rows = await listMediaForAdmin({ search: "пред дъската" });
    expect(rows.some((row) => row.id === id)).toBe(true);
  });
});
