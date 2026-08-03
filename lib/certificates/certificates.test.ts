import { describe, expect, it } from "vitest";
import {
  certificateDownloadName,
  certificateState,
  certificateStorageKey,
  certificateVerifyUrl,
  generateVerifyCode,
  normalizeVerifyCode,
} from "./certificates";

describe("код за проверка", () => {
  it("има формата XXXX-XXXX-XXXX от безопасната азбука", () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generateVerifyCode()).toMatch(
        /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/,
      );
    }
  });

  it("никога не съдържа объркваеми знаци", () => {
    const sample = Array.from({ length: 200 }, generateVerifyCode).join("");
    for (const confusing of ["0", "O", "1", "I", "L"]) {
      expect(sample).not.toContain(confusing);
    }
  });

  it("не се повтаря в разумна извадка", () => {
    const codes = new Set(Array.from({ length: 1000 }, generateVerifyCode));
    expect(codes.size).toBe(1000);
  });
});

describe("нормализиране на въведен код", () => {
  it("приема каноничния запис едно към едно", () => {
    expect(normalizeVerifyCode("XK7M-2PQ9-WD4T")).toBe("XK7M-2PQ9-WD4T");
  });

  it("прощава малки букви, интервали и липсващи тирета", () => {
    expect(normalizeVerifyCode("xk7m 2pq9 wd4t")).toBe("XK7M-2PQ9-WD4T");
    expect(normalizeVerifyCode("XK7M2PQ9WD4T")).toBe("XK7M-2PQ9-WD4T");
    expect(normalizeVerifyCode("  xk7m-2pq9-wd4t  ")).toBe("XK7M-2PQ9-WD4T");
  });

  it("отхвърля грешна дължина и знаци извън азбуката", () => {
    expect(normalizeVerifyCode("XK7M-2PQ9")).toBeNull();
    expect(normalizeVerifyCode("XK7M-2PQ9-WD4T-EXTRA")).toBeNull();
    // O и 1 не съществуват в азбуката — код с тях е преписан грешно.
    expect(normalizeVerifyCode("XKOM-2PQ9-WD4T")).toBeNull();
    expect(normalizeVerifyCode("XK1M-2PQ9-WD4T")).toBeNull();
    expect(normalizeVerifyCode("")).toBeNull();
  });
});

describe("състояние", () => {
  it("без отмяна е валиден", () => {
    expect(certificateState({ revokedAt: null })).toBe("valid");
  });

  it("с отмяна е отменен", () => {
    expect(certificateState({ revokedAt: new Date() })).toBe("revoked");
  });
});

describe("ключ в хранилището", () => {
  it("изважда годината от номера и е детерминистичен", () => {
    expect(certificateStorageKey("NFI-Z-2026-00042")).toBe(
      "document/2026/zertifikat-nfi-z-2026-00042.pdf",
    );
    expect(certificateStorageKey("NFI-Z-2026-00042")).toBe(
      certificateStorageKey("NFI-Z-2026-00042"),
    );
  });

  it("оцелява екзотичен номер и пак дава безопасен ключ", () => {
    expect(certificateStorageKey("ПРОБА")).toBe(
      "document/bez-godina/zertifikat-bez-nomer.pdf",
    );
    expect(certificateStorageKey("A/B..C")).toBe(
      "document/bez-godina/zertifikat-a-b-c.pdf",
    );
  });

  it("името за сваляне носи номера", () => {
    expect(certificateDownloadName("NFI-Z-2026-00042")).toBe(
      "NFI-Zertifikat-NFI-Z-2026-00042.pdf",
    );
  });
});

describe("адрес за проверка", () => {
  it("залепя кода след /zertifikat без език", () => {
    expect(certificateVerifyUrl("https://nfi.example", "XK7M-2PQ9-WD4T")).toBe(
      "https://nfi.example/zertifikat/XK7M-2PQ9-WD4T",
    );
  });

  it("не удвоява наклонената черта", () => {
    expect(certificateVerifyUrl("https://nfi.example/", "XK7M-2PQ9-WD4T")).toBe(
      "https://nfi.example/zertifikat/XK7M-2PQ9-WD4T",
    );
  });
});
