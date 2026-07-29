// Тестове на правните правила, изразени като код.
// Референция: docs/ПРАВНИ-ИЗИСКВАНИЯ.md — при разминаване печели документът.

import { describe, expect, it } from "vitest";
import {
  CASH_PAYMENTS_ALLOWED,
  ORDER_BUTTON_LABEL,
  OSS_THRESHOLD_CENTS,
  VAT_REGISTRATION_THRESHOLD_CENTS,
  isSupportedCountry,
  mayReleaseDigitalGoods,
  resolveVatRate,
} from "./index";

describe("прагове", () => {
  it("съответстват на документа, в центове", () => {
    expect(VAT_REGISTRATION_THRESHOLD_CENTS).toBe(51_130_00);
    expect(OSS_THRESHOLD_CENTS).toBe(10_000_00);
  });
});

describe("Button-Lösung", () => {
  it("е един от изрично допустимите надписи по §312j Abs. 3 BGB", () => {
    // Ако този тест падне, договорите спират да възникват.
    expect(ORDER_BUTTON_LABEL.toLowerCase()).toContain("zahlungspflichtig");
  });

  it("не е някой от забранените", () => {
    const forbidden = ["bestellen", "weiter", "anmelden", "absenden"];
    expect(forbidden).not.toContain(ORDER_BUTTON_LABEL.toLowerCase());
  });
});

describe("resolveVatRate", () => {
  const de = { countryCode: "DE", ossThresholdExceeded: true } as const;
  const deUnder = { countryCode: "DE", ossThresholdExceeded: false } as const;

  it("под прага всичко е с българска ставка", () => {
    expect(resolveVatRate({ ...deUnder, category: "goods" })).toBe(20);
    expect(resolveVatRate({ ...deUnder, category: "electronic" })).toBe(20);
    expect(resolveVatRate({ ...deUnder, category: "translation" })).toBe(20);
  });

  it("над прага стоките и електронните услуги следват купувача", () => {
    expect(resolveVatRate({ ...de, category: "goods" })).toBe(19);
    expect(resolveVatRate({ ...de, category: "electronic" })).toBe(19);
  });

  it("заверен превод НИКОГА не минава през OSS", () => {
    // Има човешки труд → не е електронна услуга → общото правило за
    // услуги към потребители: облага се по седалище на доставчика.
    expect(resolveVatRate({ ...de, category: "translation" })).toBe(20);
  });

  it("обучението също не следва купувача", () => {
    expect(resolveVatRate({ ...de, category: "education" })).toBe(20);
  });

  it("непозната държава пада към българска ставка, не към NaN", () => {
    expect(
      resolveVatRate({
        countryCode: "XX",
        ossThresholdExceeded: true,
        category: "goods",
      }),
    ).toBe(20);
  });

  it("не се влияе от регистъра на кода на държавата", () => {
    expect(
      resolveVatRate({
        countryCode: "de",
        ossThresholdExceeded: true,
        category: "goods",
      }),
    ).toBe(19);
  });
});

describe("isSupportedCountry", () => {
  it("познава държавите, за които има ставка", () => {
    expect(isSupportedCountry("DE")).toBe(true);
    expect(isSupportedCountry("bg")).toBe(true);
    expect(isSupportedCountry("AT")).toBe(true);
    expect(isSupportedCountry("FR")).toBe(false);
  });
});

describe("mayReleaseDigitalGoods · §356 Abs. 5 BGB", () => {
  const full = {
    hasExplicitConsent: true,
    acknowledgedWaiver: true,
    confirmationSentAt: new Date("2026-07-29T10:00:00Z"),
  };

  it("пуска файла само при трите условия заедно", () => {
    expect(mayReleaseDigitalGoods(full)).toBe(true);
  });

  it("отказва при липса на което и да е от тях", () => {
    expect(
      mayReleaseDigitalGoods({ ...full, hasExplicitConsent: false }),
    ).toBe(false);
    expect(
      mayReleaseDigitalGoods({ ...full, acknowledgedWaiver: false }),
    ).toBe(false);
    // Без §312f потвърждението клиентът сваля файла и пак има право
    // да си иска парите обратно.
    expect(mayReleaseDigitalGoods({ ...full, confirmationSentAt: null })).toBe(
      false,
    );
  });
});

describe("начини на плащане", () => {
  it("плащането в брой е изключено — от това зависи режимът по Н-18", () => {
    // Ако това стане true, се връщат фискално устройство и СУПТО.
    expect(CASH_PAYMENTS_ALLOWED).toBe(false);
  });
});
