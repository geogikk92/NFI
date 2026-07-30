import { describe, expect, it } from "vitest";
import { MAX_PASSWORD_LENGTH } from "./register";
import {
  SCRYPT_PARAMS,
  hashPassword,
  needsRehash,
  parsePasswordRecord,
  verifyAgainstNothing,
  verifyPassword,
} from "./password";

const PASSWORD = "Sonnenblume im Garten";

describe("hashPassword · формат на записа", () => {
  it("записва алгоритъм, версия и параметри до хеша", async () => {
    const record = await hashPassword(PASSWORD);
    const parts = record.split("$");

    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1]).toBe("v=1");
    expect(parts[2]).toBe(
      `N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}`,
    );
  });

  it("всяка парола получава СВОЯ сол — два хеша на едно и също се различават", async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ]);

    expect(first).not.toBe(second);
    // Различава се точно солта, не само крайният хеш.
    expect(first.split("$")[3]).not.toBe(second.split("$")[3]);
  });

  it("солта е поне 16 байта", async () => {
    const record = parsePasswordRecord(await hashPassword(PASSWORD));
    expect(record?.salt.length).toBeGreaterThanOrEqual(16);
  });
});

describe("verifyPassword", () => {
  it("вярната парола минава", async () => {
    const record = await hashPassword(PASSWORD);
    await expect(verifyPassword(PASSWORD, record)).resolves.toBe(true);
  });

  it("сгрешена парола не минава", async () => {
    const record = await hashPassword(PASSWORD);
    await expect(verifyPassword("Sonnenblume im Garte", record)).resolves.toBe(
      false,
    );
    await expect(verifyPassword("", record)).resolves.toBe(false);
  });

  it("краен интервал е част от паролата и не се маха", async () => {
    const record = await hashPassword("langes passwort ");
    await expect(verifyPassword("langes passwort", record)).resolves.toBe(false);
    await expect(verifyPassword("langes passwort ", record)).resolves.toBe(true);
  });

  it("една и същата парола в два Unicode записа минава (NFKC)", async () => {
    // „ü" като един знак срещу „u" + комбиниращ умлаут — за човека е едно и
    // също, за байтовете не. Немска парола от друга клавиатура иначе не работи.
    const composed = "Gr\u00fcne Wiese 12";
    const decomposed = "Gru\u0308ne Wiese 12";

    expect(composed).not.toBe(decomposed);

    const record = await hashPassword(composed);
    await expect(verifyPassword(decomposed, record)).resolves.toBe(true);
  });

  it("липсващ хеш (профил без парола) не пуска никого", async () => {
    await expect(verifyPassword(PASSWORD, null)).resolves.toBe(false);
    await expect(verifyPassword(PASSWORD, undefined)).resolves.toBe(false);
    await expect(verifyPassword(PASSWORD, "")).resolves.toBe(false);
  });

  it("повреден запис връща false, а не изключение", async () => {
    for (const broken of [
      "не е хеш",
      "scrypt$v=1$N=16384,r=8,p=1$onlysalt",
      "scrypt$v=1$N=16384,r=8,p=1$$",
      "bcrypt$v=1$N=16384,r=8,p=1$c2FsdA==$aGFzaA==",
      "scrypt$v=0$N=16384,r=8,p=1$c2FsdA==$aGFzaA==",
      "scrypt$v=1$N=0,r=8,p=1$c2FsdA==$aGFzaA==",
    ]) {
      await expect(verifyPassword(PASSWORD, broken)).resolves.toBe(false);
    }
  });

  it("прекалено дълга парола се отхвърля, без да се хешира", async () => {
    const record = await hashPassword(PASSWORD);
    const huge = "x".repeat(MAX_PASSWORD_LENGTH + 1);
    await expect(verifyPassword(huge, record)).resolves.toBe(false);
  });

  it("хеш с друга дължина не гърми в timingSafeEqual", async () => {
    // Запис от бъдеща версия с 32-байтов ключ — сравнението трябва да върне
    // false, не да хвърли „input buffers must have the same byte length".
    const short = `scrypt$v=1$N=16384,r=8,p=1$${Buffer.from(
      "0123456789abcdef",
    ).toString("base64")}$${Buffer.alloc(32, 7).toString("base64")}`;

    await expect(verifyPassword(PASSWORD, short)).resolves.toBe(false);
  });
});

describe("needsRehash", () => {
  it("свеж запис не се презаписва", async () => {
    expect(needsRehash(await hashPassword(PASSWORD))).toBe(false);
  });

  it("по-слаби параметри искат презапис", () => {
    const old = `scrypt$v=1$N=1024,r=8,p=1$${Buffer.alloc(16).toString(
      "base64",
    )}$${Buffer.alloc(64).toString("base64")}`;
    expect(needsRehash(old)).toBe(true);
  });

  it("непознат формат иска презапис", () => {
    expect(needsRehash("$2b$12$abcdefghijklmnopqrstuv")).toBe(true);
  });

  it("липсващият хеш няма какво да се презаписва", () => {
    expect(needsRehash(null)).toBe(false);
  });
});

describe("verifyAgainstNothing", () => {
  it("винаги връща false и не хвърля", async () => {
    await expect(verifyAgainstNothing(PASSWORD)).resolves.toBe(false);
    await expect(verifyAgainstNothing("")).resolves.toBe(false);
  });
});
