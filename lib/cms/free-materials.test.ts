import { describe, expect, it } from "vitest";
import {
  embedProvider,
  grantExpiry,
  grantState,
  isEmbeddedVideo,
  materialAccessSchema,
  needsDownloadGrant,
  watermarkFor,
  GRANT_TTL_HOURS,
} from "./free-materials";

describe("вид материал", () => {
  it("само видеата се вграждат отвън", () => {
    expect(isEmbeddedVideo("VIDEO_VIMEO")).toBe(true);
    expect(isEmbeddedVideo("VIDEO_GOTO")).toBe(true);
    expect(isEmbeddedVideo("PDF")).toBe(false);
    expect(isEmbeddedVideo("AUDIO")).toBe(false);
    expect(isEmbeddedVideo("LINK")).toBe(false);
  });

  it("доставчикът се назовава, за да е информирано съгласието", () => {
    expect(embedProvider("VIDEO_VIMEO")).toBe("Vimeo");
    expect(embedProvider("VIDEO_GOTO")).toBe("GoTo");
    expect(embedProvider("PDF")).toBeNull();
  });

  it("токен за сваляне се издава само за файлове", () => {
    expect(needsDownloadGrant("PDF")).toBe(true);
    expect(needsDownloadGrant("AUDIO")).toBe(true);
    // Видеото няма файл — достъпът е самата страница.
    expect(needsDownloadGrant("VIDEO_VIMEO")).toBe(false);
    expect(needsDownloadGrant("LINK")).toBe(false);
  });
});

describe("състояние на връзката за сваляне", () => {
  const base = {
    expiresAt: new Date("2026-01-10T00:00:00Z"),
    maxDownloads: 5,
    downloadCount: 0,
    revokedAt: null as Date | null,
  };
  const now = new Date("2026-01-01T00:00:00Z");

  it("валидната връзка е ok", () => {
    expect(grantState(base, now)).toBe("ok");
  });

  it("отменената се съобщава като отменена, не като изтекла", () => {
    // Редът на проверките значи: изтекла И отменена дава „отменена".
    const expiredAndRevoked = {
      ...base,
      expiresAt: new Date("2025-01-01T00:00:00Z"),
      revokedAt: new Date("2025-06-01T00:00:00Z"),
    };
    expect(grantState(expiredAndRevoked, now)).toBe("revoked");
  });

  it("изтеклата е изтекла", () => {
    expect(grantState({ ...base, expiresAt: new Date("2025-12-31T00:00:00Z") }, now)).toBe("expired");
  });

  it("изчерпаната е изчерпана", () => {
    expect(grantState({ ...base, downloadCount: 5 }, now)).toBe("exhausted");
  });

  it("точно на границата на изтичане вече не важи", () => {
    expect(grantState({ ...base, expiresAt: now }, now)).toBe("expired");
  });

  it("последното разрешено сваляне още минава", () => {
    expect(grantState({ ...base, downloadCount: 4 }, now)).toBe("ok");
  });
});

describe("срок на връзката", () => {
  it("изтича след определените часове", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const expiry = grantExpiry(now);
    const hours = (expiry.getTime() - now.getTime()) / (60 * 60 * 1000);
    expect(hours).toBe(GRANT_TTL_HOURS);
  });
});

describe("воден знак", () => {
  it("съдържа име и имейл, нищо повече", () => {
    expect(watermarkFor("  Мария Костова ", " Maria@Example.DE ")).toBe(
      "Мария Костова · maria@example.de",
    );
  });
});

describe("валидация на формата", () => {
  const valid = { name: "Мария", email: "maria@example.de", slug: "der-die-das" };

  it("приема попълнена форма", () => {
    expect(materialAccessSchema.safeParse(valid).success).toBe(true);
  });

  it("бюлетинът е по желание — достъпът не зависи от него", () => {
    const parsed = materialAccessSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.newsletter).toBeUndefined();
  });

  it("късото име дава КОД, не текст — формата е на три езика", () => {
    const parsed = materialAccessSchema.safeParse({ ...valid, name: "М" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("name-too-short");
    }
  });

  it("невалидният имейл дава код", () => {
    const parsed = materialAccessSchema.safeParse({ ...valid, email: "не-е-имейл" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("email-invalid");
    }
  });

  it("имейлът се нормализира — иначе един човек прави два записа", () => {
    const parsed = materialAccessSchema.safeParse({ ...valid, email: "  Maria@Example.DE " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("maria@example.de");
  });
});
