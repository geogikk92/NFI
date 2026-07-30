import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_SECONDS,
  generateSessionToken,
  hashSessionToken,
  isExpired,
  sessionCookieOptions,
  sessionExpiry,
  sessionTokensMatch,
} from "./session";

describe("токен на сесията", () => {
  it("всеки път е различен", () => {
    // 1000 токена без повторение. При 256 бита съвпадение няма да има
    // никога, но точно този тест хваща най-опасната грешка — токен,
    // изведен от нещо предвидимо (време, брояч), който би дал повторения.
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(generateSessionToken());
    expect(seen.size).toBe(1000);
  });

  it("е base64url — без знаци, които искат екраниране в бисквитка", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("носи 256 бита ентропия (43 знака base64url)", () => {
    expect(generateSessionToken()).toHaveLength(43);
  });
});

describe("хеширане на токена", () => {
  it("е устойчиво: същият вход дава същия изход", () => {
    const token = generateSessionToken();
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
  });

  it("НЕ връща самия токен", () => {
    // Ако някой ден това падне, значи в базата се пази готова бисквитка.
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toBe(token);
    expect(hashSessionToken(token)).not.toContain(token);
  });

  it("различни токени → различни хешове", () => {
    expect(hashSessionToken("a")).not.toBe(hashSessionToken("b"));
  });

  it("е SHA-256 в hex — 64 знака", () => {
    expect(hashSessionToken("каквото")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("sessionTokensMatch", () => {
  it("еднакви съвпадат", () => {
    expect(sessionTokensMatch("абв", "абв")).toBe(true);
  });

  it("различни не съвпадат", () => {
    expect(sessionTokensMatch("абв", "абг")).toBe(false);
  });

  it("различна дължина не хвърля", () => {
    // timingSafeEqual хвърля при различна дължина — затова се проверява
    // предварително. Без това всяка подправена бисквитка би дала 500.
    expect(() => sessionTokensMatch("кратко", "много по-дълго")).not.toThrow();
    expect(sessionTokensMatch("кратко", "много по-дълго")).toBe(false);
  });

  it("празни низове съвпадат помежду си", () => {
    expect(sessionTokensMatch("", "")).toBe(true);
  });
});

describe("срок на сесията", () => {
  const now = new Date("2026-07-30T12:00:00.000Z");

  it("изтича точно след 30 дни", () => {
    const expires = sessionExpiry(now);
    expect(expires.getTime() - now.getTime()).toBe(SESSION_TTL_SECONDS * 1000);
    expect(expires.toISOString()).toBe("2026-08-29T12:00:00.000Z");
  });

  it("прясна сесия не е изтекла", () => {
    expect(isExpired(sessionExpiry(now), now)).toBe(false);
  });

  it("сесия, изтичаща точно СЕГА, се смята за изтекла", () => {
    // Граничният случай е нарочно строг: „валидна до" не значи „валидна в".
    expect(isExpired(now, now)).toBe(true);
  });

  it("вчерашна сесия е изтекла", () => {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(isExpired(yesterday, now)).toBe(true);
  });

  it("сесия за след секунда още е валидна", () => {
    expect(isExpired(new Date(now.getTime() + 1000), now)).toBe(false);
  });
});

describe("настройки на бисквитката", () => {
  it("е httpOnly — иначе XSS изнася сесията", () => {
    expect(sessionCookieOptions(SESSION_TTL_SECONDS).httpOnly).toBe(true);
  });

  it("е sameSite=lax, не strict", () => {
    // „strict" би показвал човека като излязъл при връщане по връзка от
    // имейл. Записано е като решение, за да не се „поправи" на strict.
    expect(sessionCookieOptions(0).sameSite).toBe("lax");
  });

  it("path=/ — иначе изходът не изтрива бисквитката на друг път", () => {
    expect(sessionCookieOptions(0).path).toBe("/");
  });

  it("изтриването ползва СЪЩИТЕ настройки, само с maxAge 0", () => {
    // Разминаят ли се настройките между задаване и изтриване, браузърът
    // пази двете за различни бисквитки и „Изход" тихо не работи.
    const set = sessionCookieOptions(SESSION_TTL_SECONDS);
    const clear = sessionCookieOptions(0);
    expect({ ...set, maxAge: 0 }).toEqual(clear);
  });
});
