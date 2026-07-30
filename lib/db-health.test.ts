import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasDatabaseConfigured, loadOrExplain } from "./db-health";

// Трите случая тук не са академични: разликата между тях е разликата
// между „още няма курсове" и „деплоят е счупен", а на страницата и двете
// изглеждат като празен списък.

describe("hasDatabaseConfigured", () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it("липсваща променлива → не е конфигурирана", () => {
    delete process.env.DATABASE_URL;
    expect(hasDatabaseConfigured()).toBe(false);
  });

  it("празен низ → НЕ е конфигурирана", () => {
    // Празният низ е коварен: Prisma го приема като валиден и гърми
    // по-навътре с грешка за протокол вместо за липсваща променлива.
    process.env.DATABASE_URL = "";
    expect(hasDatabaseConfigured()).toBe(false);
  });

  it("низ със стойност → конфигурирана", () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/x";
    expect(hasDatabaseConfigured()).toBe(true);
  });
});

describe("loadOrExplain", () => {
  const original = process.env.DATABASE_URL;

  beforeEach(() => {
    // Заявката не бива да се вика при липсваща база — иначе Prisma
    // хвърля своята неясна грешка преди нашата проверка да значи нещо.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  });

  it("без база: не пипа заявката и връща no-database", async () => {
    delete process.env.DATABASE_URL;
    const query = vi.fn(async () => "данни");

    const result = await loadOrExplain(query);

    expect(result).toEqual({ ok: false, reason: "no-database" });
    expect(query).not.toHaveBeenCalled();
  });

  it("с база и успешна заявка: връща данните", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/x";

    const result = await loadOrExplain(async () => [1, 2, 3]);

    expect(result).toEqual({ ok: true, data: [1, 2, 3] });
  });

  it("с база, но паднала заявка: unreachable, НЕ хвърля", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/x";

    const result = await loadOrExplain(async () => {
      throw new Error("connect ECONNREFUSED");
    });

    // Ако това хвърлеше, страницата щеше да върне 500 и никой нямаше да
    // научи какво липсва.
    expect(result).toEqual({ ok: false, reason: "unreachable" });
    expect(console.error).toHaveBeenCalled();
  });

  it("различава празен резултат от липсваща база", async () => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/x";

    const result = await loadOrExplain(async () => []);

    // Празният масив е ok: true. Точно това разграничение е смисълът на
    // целия файл — иначе „няма курсове" и „няма база" се сливат.
    expect(result).toEqual({ ok: true, data: [] });
  });
});
