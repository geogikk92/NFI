// Интеграционен тест на заявките за обаждане срещу ИСТИНСКА база.
// Пропуска се тихо без DATABASE_URL.

import { afterEach, afterAll, describe, expect, it } from "vitest";
import { db } from "../db";
import { RATE_LIMIT_PER_HOUR, callRequestSchema } from "./call-requests";
import {
  createCallRequest,
  findCourseForRequest,
  isRateLimited,
} from "./call-requests-db";

const suite = process.env.DATABASE_URL ? describe : describe.skip;

const TEST_IP = "203.0.113.42";
const TEST_EMAIL_DOMAIN = "@test.invalid";

function input(overrides: Record<string, unknown> = {}) {
  return callRequestSchema.parse({
    name: "Test Person",
    email: `t${Date.now()}${Math.floor(Math.random() * 1e6)}${TEST_EMAIL_DOMAIN}`,
    phone: "",
    message: "",
    preferredTime: "",
    courseId: "",
    source: "CONTACT_PAGE",
    ...overrides,
  });
}

suite("заявки за обаждане срещу истинска база", () => {
  afterEach(async () => {
    await db.callRequest.deleteMany({
      where: { OR: [{ ip: TEST_IP }, { email: { endsWith: TEST_EMAIL_DOMAIN } }] },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("записва чиста заявка със статус NEW", async () => {
    const result = await createCallRequest(input(), {
      ip: TEST_IP,
      userAgent: "vitest",
      spam: { spam: false },
    });

    expect(result.flaggedAsSpam).toBe(false);

    const saved = await db.callRequest.findUnique({
      where: { id: result.id },
      select: { status: true, ip: true, handledNote: true },
    });
    expect(saved?.status).toBe("NEW");
    expect(saved?.ip).toBe(TEST_IP);
    expect(saved?.handledNote).toBeNull();
  });

  it("маркира подозрителната като SPAM, но пак я записва", async () => {
    // Ботът не бива да научава, че е разпознат; а ако сме сбъркали,
    // истинската заявка е в базата и админът я вижда.
    const result = await createCallRequest(input(), {
      ip: TEST_IP,
      userAgent: "bot",
      spam: { spam: true, reason: "honeypot" },
    });

    expect(result.flaggedAsSpam).toBe(true);

    const saved = await db.callRequest.findUnique({
      where: { id: result.id },
      select: { status: true, handledNote: true },
    });
    expect(saved?.status).toBe("SPAM");
    expect(saved?.handledNote).toContain("honeypot");
  });

  it("свързва заявката с истински курс", async () => {
    const course = await findCourseForRequest("deutsch-a1-abendkurs");
    expect(course).not.toBeNull();

    const result = await createCallRequest(
      input({ courseId: course!.id, source: "COURSE_PAGE" }),
      { ip: TEST_IP, userAgent: "vitest", spam: { spam: false } },
    );

    const saved = await db.callRequest.findUnique({
      where: { id: result.id },
      select: { courseId: true, source: true },
    });
    expect(saved?.courseId).toBe(course!.id);
    expect(saved?.source).toBe("COURSE_PAGE");
  });

  it("подхвърлен несъществуващ courseId не чупи записа", async () => {
    // Иначе подаден отвън id гърми с грешка по чужд ключ и посетителят
    // вижда 500 вместо потвърждение.
    const result = await createCallRequest(
      input({ courseId: "clzzzzzzzzzzzzzzzzzzzzzzz" }),
      { ip: TEST_IP, userAgent: "vitest", spam: { spam: false } },
    );

    const saved = await db.callRequest.findUnique({
      where: { id: result.id },
      select: { courseId: true },
    });
    expect(saved?.courseId).toBeNull();
  });

  it("findCourseForRequest не намира непубликуван или измислен курс", async () => {
    expect(await findCourseForRequest("няма-такъв-курс")).toBeNull();
  });

  it("ограничава след достигане на лимита за час", async () => {
    expect(await isRateLimited(TEST_IP)).toBe(false);

    for (let i = 0; i < RATE_LIMIT_PER_HOUR; i++) {
      await createCallRequest(input(), {
        ip: TEST_IP,
        userAgent: "vitest",
        spam: { spam: false },
      });
    }

    expect(await isRateLimited(TEST_IP)).toBe(true);
    // Друг адрес не е засегнат.
    expect(await isRateLimited("198.51.100.7")).toBe(false);
  });

  it("без IP не ограничава — иначе всички зад един прокси се блокират", async () => {
    expect(await isRateLimited(null)).toBe(false);
  });

  it("стари заявки не се броят в лимита", async () => {
    const created = await createCallRequest(input(), {
      ip: TEST_IP,
      userAgent: "vitest",
      spam: { spam: false },
    });

    // Изтласква се два часа назад.
    await db.callRequest.update({
      where: { id: created.id },
      data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    });

    expect(await isRateLimited(TEST_IP)).toBe(false);
  });
});
