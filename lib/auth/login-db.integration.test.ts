// Интеграционен тест на входа срещу истинска база. Изисква сийднатa база:
//
//   npm run db:migrate && npm run db:seed && npm test
//
// Пропуска се тихо без DATABASE_URL.

import { afterAll, describe, expect, it } from "vitest";
import { db } from "../db";
import { authenticate } from "./login-db";
import { hashPassword } from "./password";

const suite = process.env.DATABASE_URL ? describe : describe.skip;

/** Паролата от prisma/seed.ts. */
const DEV_PASSWORD = "nfi-lokalna-parola";

suite("вход срещу истинска база", () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it("пуска админа с вярната парола и връща ролята", async () => {
    const outcome = await authenticate("admin@nfi.local", DEV_PASSWORD);

    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;
    expect(outcome.role).toBe("ADMIN");
    expect(outcome.userId).toBeTruthy();
  });

  it("НЕ пуска с грешна парола", async () => {
    const outcome = await authenticate("admin@nfi.local", "греши");
    expect(outcome.kind).toBe("failed");
  });

  it("НЕ пуска непознат имейл", async () => {
    const outcome = await authenticate("nyama@nfi.local", DEV_PASSWORD);
    expect(outcome.kind).toBe("failed");
  });

  it("непознат имейл и грешна парола дават НЕРАЗЛИЧИМ отговор", async () => {
    // Различни отговори превръщат формата в справка кой е наш клиент.
    const unknown = await authenticate("nyama@nfi.local", "каквото");
    const wrong = await authenticate("admin@nfi.local", "каквото");
    expect(unknown).toEqual(wrong);
  });

  it("регистърът на имейла няма значение", async () => {
    // Човек, регистрирал се с главна буква, иначе не влиза никога.
    const outcome = await authenticate("ADMIN@NFI.LOCAL", DEV_PASSWORD);
    expect(outcome.kind).toBe("ok");
  });

  it("студентът влиза, но с роля STUDENT", async () => {
    const outcome = await authenticate("student@nfi.local", DEV_PASSWORD);
    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") return;
    expect(outcome.role).toBe("STUDENT");
  });

  it("меко изтрит профил дава locked, а не ok", async () => {
    const email = `test-iztrit-${process.pid}@nfi.local`;
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(DEV_PASSWORD),
        deletedAt: new Date(),
      },
    });

    try {
      const outcome = await authenticate(email, DEV_PASSWORD);
      expect(outcome.kind).toBe("locked");
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });

  it("изтрит профил с ГРЕШНА парола дава failed, не locked", async () => {
    // Иначе „профилът не е активен" при произволна парола казва на чужд
    // човек, че такъв адрес съществува у нас.
    const email = `test-iztrit2-${process.pid}@nfi.local`;
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await hashPassword(DEV_PASSWORD),
        deletedAt: new Date(),
      },
    });

    try {
      const outcome = await authenticate(email, "греши");
      expect(outcome.kind).toBe("failed");
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });

  it("профил БЕЗ парола не влиза с празна парола", async () => {
    // Профилите, създадени през OAuth, имат passwordHash = null. Празната
    // парола не бива да минава за „съвпада с нищо".
    const email = `test-bez-parola-${process.pid}@nfi.local`;
    const user = await db.user.create({ data: { email } });

    try {
      expect((await authenticate(email, "")).kind).toBe("failed");
      expect((await authenticate(email, "каквото")).kind).toBe("failed");
    } finally {
      await db.user.delete({ where: { id: user.id } });
    }
  });
});
