// Интеграционен тест на брояча срещу ИСТИНСКА база.
//
// Това е единственият начин да се провери твърдението, върху което стъпва
// цялото фактуриране: че при паралелни плащания никой не получава чужд
// номер. Unit тест не може да го докаже — race condition-ът живее в базата.
//
//   createdb nfi_dev && npx prisma migrate dev
//   npm run test:db
//
// Пропуска се тихо, ако няма DATABASE_URL — за да не чупи CI без база.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "./db";
import {
  formatTaxDocumentNumber,
  nextCounterValue,
  nextInvoiceNumber,
} from "./counter";

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

suite("Counter срещу истински Postgres", () => {
  const KEY = "test:concurrency";

  beforeEach(async () => {
    await db.counter.deleteMany({ where: { key: { startsWith: "test:" } } });
  });

  afterAll(async () => {
    await db.counter.deleteMany({ where: { key: { startsWith: "test:" } } });
    await db.$disconnect();
  });

  it("създава брояча при първо извикване и започва от 1", async () => {
    expect(await nextCounterValue(KEY)).toBe(1);
    expect(await nextCounterValue(KEY)).toBe(2);
    expect(await nextCounterValue(KEY)).toBe(3);
  });

  it("връща число, не BigInt и не низ", async () => {
    const value = await nextCounterValue(KEY);
    expect(typeof value).toBe("number");
    expect(Number.isInteger(value)).toBe(true);
  });

  it("НЕ дава един и същ номер на две паралелни заявки", async () => {
    // Сърцевината: 50 едновременни плащания искат номер на фактура.
    // Ако инкрементът не беше атомарен, тук щеше да има дубликати —
    // и две различни фактури щяха да носят един номер.
    const CONCURRENCY = 50;

    const values = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => nextCounterValue(KEY)),
    );

    const unique = new Set(values);
    expect(unique.size).toBe(CONCURRENCY);

    // Поредицата е плътна: без дупки, от 1 до 50.
    const sorted = [...values].sort((a, b) => a - b);
    expect(sorted[0]).toBe(1);
    expect(sorted[CONCURRENCY - 1]).toBe(CONCURRENCY);
    for (let i = 0; i < CONCURRENCY; i++) {
      expect(sorted[i]).toBe(i + 1);
    }
  });

  it("брои отделно по различни ключове", async () => {
    await nextCounterValue("test:a");
    await nextCounterValue("test:a");
    expect(await nextCounterValue("test:a")).toBe(3);
    expect(await nextCounterValue("test:b")).toBe(1);
  });

  it("откатната транзакция НЕ изхабява номер", async () => {
    await nextCounterValue(KEY); // 1

    await expect(
      db.$transaction(async (tx) => {
        const inside = await nextCounterValue(KEY, tx);
        expect(inside).toBe(2);
        throw new Error("нарочен откат");
      }),
    ).rejects.toThrow("нарочен откат");

    // Ако номерът беше взет извън транзакцията, тук щеше да е 3 и в
    // поредицата на фактурите щеше да зейне дупка.
    expect(await nextCounterValue(KEY)).toBe(2);
  });

  it("издава валиден по ЗДДС номер на фактура от край до край", async () => {
    await db.counter.deleteMany({ where: { key: "taxdoc" } });
    const number = await nextInvoiceNumber();
    expect(number).toMatch(/^\d{10}$/);
    expect(number).toBe(formatTaxDocumentNumber(1));
    await db.counter.deleteMany({ where: { key: "taxdoc" } });
  });
});
