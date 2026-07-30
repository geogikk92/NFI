// Интеграционен тест на ограниченията. Изисква сийднатa база.
// Пропуска се тихо без DATABASE_URL.

import { afterEach, describe, expect, it } from "vitest";
import { db } from "./db";
import { RATE_ACTIONS, RATE_LIMITS, isOverLimit, recordEvent } from "./rate-limit-db";

const suite = process.env.DATABASE_URL ? describe : describe.skip;

suite("ограничения по IP", () => {
  const IP = `198.51.100.${(process.pid % 200) + 20}`;

  afterEach(async () => {
    await db.auditLog.deleteMany({ where: { ip: IP } });
  });

  it("под лимита пуска", async () => {
    for (let i = 0; i < RATE_LIMITS.register.max - 1; i++) {
      await recordEvent(RATE_ACTIONS.register, { ip: IP, userAgent: null });
    }
    expect(await isOverLimit(RATE_LIMITS.register, IP)).toBe(false);
  });

  it("на лимита спира", async () => {
    for (let i = 0; i < RATE_LIMITS.register.max; i++) {
      await recordEvent(RATE_ACTIONS.register, { ip: IP, userAgent: null });
    }
    expect(await isOverLimit(RATE_LIMITS.register, IP)).toBe(true);
  });

  it("действията се броят ПООТДЕЛНО", async () => {
    // Иначе човек, който е сгрешил паролата няколко пъти, не може да
    // направи и тест за ниво — а двете нямат нищо общо.
    for (let i = 0; i < RATE_LIMITS.register.max + 3; i++) {
      await recordEvent(RATE_ACTIONS.register, { ip: IP, userAgent: null });
    }
    expect(await isOverLimit(RATE_LIMITS.register, IP)).toBe(true);
    expect(await isOverLimit(RATE_LIMITS.levelTest, IP)).toBe(false);
  });

  it("без IP не ограничава — цял офис зад прокси не се заключва", async () => {
    for (let i = 0; i < RATE_LIMITS.register.max + 5; i++) {
      await recordEvent(RATE_ACTIONS.register, { ip: IP, userAgent: null });
    }
    expect(await isOverLimit(RATE_LIMITS.register, null)).toBe(false);
  });

  it("стари събития извън прозореца не се броят", async () => {
    for (let i = 0; i < RATE_LIMITS.register.max + 2; i++) {
      await recordEvent(RATE_ACTIONS.register, { ip: IP, userAgent: null });
    }
    // Час и пет минути по-късно прозорецът от 60 минути е минал.
    const later = new Date(Date.now() + 65 * 60 * 1000);
    expect(await isOverLimit(RATE_LIMITS.register, IP, later)).toBe(false);
  });

  it("чужд IP не се влияе", async () => {
    for (let i = 0; i < RATE_LIMITS.register.max + 5; i++) {
      await recordEvent(RATE_ACTIONS.register, { ip: IP, userAgent: null });
    }
    expect(await isOverLimit(RATE_LIMITS.register, "203.0.113.99")).toBe(false);
  });
});
