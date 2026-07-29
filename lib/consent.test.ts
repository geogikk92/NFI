import { describe, expect, it } from "vitest";
import {
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  acceptAll,
  hasConsent,
  needsDecision,
  parseConsent,
  rejectAll,
  saveSelection,
  serializeConsent,
} from "./consent";

const NOW = new Date("2026-07-29T10:00:00Z");

describe("състояние по подразбиране", () => {
  it("преди решение НИЩО извън необходимото не е разрешено", () => {
    // Това е цялата разлика между законен и незаконен банер.
    expect(DEFAULT_CONSENT.functional).toBe(false);
    expect(DEFAULT_CONSENT.analytics).toBe(false);
    expect(DEFAULT_CONSENT.necessary).toBe(true);
  });

  it("липсата на решение вдига банера", () => {
    expect(needsDecision(DEFAULT_CONSENT)).toBe(true);
    expect(needsDecision(acceptAll(NOW))).toBe(false);
    expect(needsDecision(rejectAll(NOW))).toBe(false);
  });
});

describe("решения", () => {
  it("приемам всичко включва всичко", () => {
    const state = acceptAll(NOW);
    expect(state.functional).toBe(true);
    expect(state.analytics).toBe(true);
    expect(state.decidedAt).toBe(NOW.toISOString());
  });

  it("отказвам всичко оставя само необходимото", () => {
    const state = rejectAll(NOW);
    expect(state.functional).toBe(false);
    expect(state.analytics).toBe(false);
    expect(state.necessary).toBe(true);
    // Записано е — иначе банерът излиза отново и отказът е безсмислен.
    expect(state.decidedAt).toBe(NOW.toISOString());
  });

  it("отказът е също толкова записан, колкото приемането", () => {
    // Art. 7(4) GDPR: съгласието трябва да е свободно. Ако отказът не се
    // помни, натискът да приемеш прави съгласието невалидно.
    expect(rejectAll(NOW).decidedAt).not.toBeNull();
    expect(acceptAll(NOW).decidedAt).not.toBeNull();
  });

  it("избирателното запазване уважава всяка категория", () => {
    const state = saveSelection({ functional: true, analytics: false }, NOW);
    expect(state.functional).toBe(true);
    expect(state.analytics).toBe(false);
  });

  it("necessary не може да се изключи", () => {
    const state = saveSelection({ functional: false, analytics: false }, NOW);
    expect(state.necessary).toBe(true);
  });
});

describe("parseConsent · враждебен вход", () => {
  it("прави пълен кръг", () => {
    const state = acceptAll(NOW);
    expect(parseConsent(serializeConsent(state))).toEqual(state);
  });

  it("липсваща или повредена бисквитка → ОТКАЗ, не приемане", () => {
    // Посоката на провала е важна: при съмнение не се зарежда нищо.
    for (const raw of [undefined, null, "", "{счупено", "null", '"текст"', "[]"]) {
      const state = parseConsent(raw);
      expect(state.functional).toBe(false);
      expect(state.analytics).toBe(false);
      expect(needsDecision(state)).toBe(true);
    }
  });

  it("не приема стойности, различни от true", () => {
    // "true", 1 и "yes" НЕ са съгласие.
    const raw = JSON.stringify({
      functional: "true",
      analytics: 1,
      version: CONSENT_VERSION,
      decidedAt: NOW.toISOString(),
    });
    const state = parseConsent(raw);
    expect(state.functional).toBe(false);
    expect(state.analytics).toBe(false);
  });

  it("стара версия на текста изисква ново съгласие", () => {
    const raw = JSON.stringify({
      functional: true,
      analytics: true,
      version: "2020-01-01",
      decidedAt: NOW.toISOString(),
    });
    const state = parseConsent(raw);
    expect(state.functional).toBe(false);
    expect(needsDecision(state)).toBe(true);
  });
});

describe("hasConsent", () => {
  it("necessary винаги минава", () => {
    expect(hasConsent(DEFAULT_CONSENT, "necessary")).toBe(true);
    expect(hasConsent(rejectAll(NOW), "necessary")).toBe(true);
  });

  it("останалите минават само при изрично съгласие", () => {
    expect(hasConsent(DEFAULT_CONSENT, "functional")).toBe(false);
    expect(hasConsent(DEFAULT_CONSENT, "analytics")).toBe(false);
    expect(hasConsent(acceptAll(NOW), "functional")).toBe(true);
    expect(hasConsent(rejectAll(NOW), "analytics")).toBe(false);
  });
});
