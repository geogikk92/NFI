// Тестове на номерацията. Покриват само чистите функции — атомарността
// на самия брояч се проверява срещу истинска база в задача 24b.

import { describe, expect, it } from "vitest";
import {
  accountingYear,
  formatSequential,
  formatTaxDocumentNumber,
} from "./counter";

describe("accountingYear", () => {
  it("следва българското време, не UTC", () => {
    // 31.12.2026 23:30 UTC е вече 01.01.2027 01:30 в София.
    // getUTCFullYear() тук би върнал 2026 и би увеличил брояча на
    // година, която счетоводителят вече е приключил.
    expect(accountingYear(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
  });

  it("не избързва в другата посока", () => {
    // 01.01.2027 в 00:30 UTC е 02:30 в София — пак 2027.
    expect(accountingYear(new Date("2027-01-01T00:30:00Z"))).toBe(2027);
    // 31.12.2026 в 21:00 UTC е 23:00 в София — още 2026.
    expect(accountingYear(new Date("2026-12-31T21:00:00Z"))).toBe(2026);
  });

  it("работи и през лятното часово време (UTC+3)", () => {
    expect(accountingYear(new Date("2026-07-15T12:00:00Z"))).toBe(2026);
  });
});

describe("formatTaxDocumentNumber", () => {
  it("дава пореден десетразряден номер само от арабски цифри", () => {
    // ЗДДС чл. 114, ал. 1, т. 2 — без представка, без тире, без година.
    expect(formatTaxDocumentNumber(1)).toBe("0000000001");
    expect(formatTaxDocumentNumber(42)).toBe("0000000042");
    expect(formatTaxDocumentNumber(9_999_999_999)).toBe("9999999999");
  });

  it("винаги е точно десет знака", () => {
    for (const n of [1, 9, 10, 999, 123_456, 1_000_000_000]) {
      expect(formatTaxDocumentNumber(n)).toHaveLength(10);
    }
  });

  it("съдържа само цифри", () => {
    expect(formatTaxDocumentNumber(7)).toMatch(/^\d{10}$/);
  });

  it("отказва невалидни стойности", () => {
    expect(() => formatTaxDocumentNumber(0)).toThrow();
    expect(() => formatTaxDocumentNumber(-1)).toThrow();
    expect(() => formatTaxDocumentNumber(1.5)).toThrow();
    expect(() => formatTaxDocumentNumber(10_000_000_000)).toThrow();
  });
});

describe("formatSequential", () => {
  it("форматира неданъчните номера четимо", () => {
    expect(formatSequential("NFI-B", 2026, 42)).toBe("NFI-B-2026-000042");
    expect(formatSequential("NFI-Z", 2026, 7, 5)).toBe("NFI-Z-2026-00007");
  });
});
