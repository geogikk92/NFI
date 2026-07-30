import { describe, expect, it } from "vitest";
import { diffFields } from "./audit";

describe("diffFields", () => {
  it("нищо променено → null", () => {
    // Натиснат „Запази" без промяна не бива да оставя ред в дневника.
    expect(diffFields({ title: "A1", priceCents: 12900 }, { title: "A1", priceCents: 12900 }))
      .toBeNull();
  });

  it("пази САМО промененото поле", () => {
    // Същината: следа, в която двайсет непроменени полета крият
    // единственото важно, не се чете от никого.
    const before = { title: "Немски A1", priceCents: 14900, level: "A1" };
    const after = { title: "Немски A1", priceCents: 12900, level: "A1" };

    expect(diffFields(before, after)).toEqual({
      before: { priceCents: 14900 },
      after: { priceCents: 12900 },
    });
  });

  it("не брои updatedAt за промяна", () => {
    // Полето се мени при ВСЯКО записване. Влезе ли в следата, всеки запис
    // изглежда като промяна дори когато нищо друго не се е случило.
    const now = new Date("2026-07-30T10:00:00Z");
    const later = new Date("2026-07-30T11:00:00Z");

    expect(diffFields({ title: "A1", updatedAt: now }, { title: "A1", updatedAt: later }))
      .toBeNull();
  });

  it("сравнява датите по стойност, не по идентичност", () => {
    // Две различни Date обекта с един и същи момент са едно и също нещо.
    // Без това всяко записване отчита фалшива промяна на датата на начало.
    const a = new Date("2026-09-01T00:00:00Z");
    const b = new Date("2026-09-01T00:00:00Z");
    expect(diffFields({ startsAt: a }, { startsAt: b })).toBeNull();

    const changed = diffFields(
      { startsAt: a },
      { startsAt: new Date("2026-10-01T00:00:00Z") },
    );
    // Датата влиза като ISO низ, а не като празен обект „{}" — точно за
    // това служи привеждането преди записа.
    expect(changed).toEqual({
      before: { startsAt: "2026-09-01T00:00:00.000Z" },
      after: { startsAt: "2026-10-01T00:00:00.000Z" },
    });
  });

  it("записва Decimal като низ, не като празен обект", () => {
    // Prisma.Decimal минава през JSON.stringify като „{}" и следата
    // изгубва точно стойността, заради която се чете — ДДС ставката.
    const decimalLike = (v: string) => ({
      toFixed: () => v,
      toString: () => v,
    });

    expect(
      diffFields({ vatRate: decimalLike("19.00") }, { vatRate: decimalLike("7.00") }),
    ).toEqual({ before: { vatRate: "19.00" }, after: { vatRate: "7.00" } });
  });

  it("хваща поле, което го има само в едната снимка", () => {
    expect(diffFields({ slug: "a1" }, {})).toEqual({
      before: { slug: "a1" },
      after: { slug: null },
    });
    expect(diffFields({}, { slug: "a1" })).toEqual({
      before: { slug: null },
      after: { slug: "a1" },
    });
  });

  it("не различава null от undefined", () => {
    // И двете значат „няма стойност". Разликата между тях е вътрешна за
    // Prisma и не е промяна, която някой би искал да види в дневник.
    expect(diffFields({ titleDe: null }, { titleDe: undefined })).toBeNull();
  });

  it("никога не изнася тайна стойност", () => {
    // Днес нито един екран не пипа такова поле. Проверката пази утрешния.
    const changes = diffFields(
      { email: "a@nfi.bg", passwordHash: "scrypt$стар" },
      { email: "b@nfi.bg", passwordHash: "scrypt$нов" },
    );

    expect(changes?.before.passwordHash).toBe("«скрито»");
    expect(changes?.after.passwordHash).toBe("«скрито»");
    expect(JSON.stringify(changes)).not.toContain("scrypt");
    // Останалите полета минават както обикновено.
    expect(changes?.after.email).toBe("b@nfi.bg");
  });

  it("скрива тайна стойност и вложена в обект", () => {
    const changes = diffFields(
      { meta: { label: "стар", token: "таен-низ" } },
      { meta: { label: "нов", token: "таен-низ" } },
    );

    expect(JSON.stringify(changes)).not.toContain("таен-низ");
    expect(JSON.stringify(changes)).toContain("нов");
  });

  it("сравнява вложените обекти по съдържание", () => {
    // Json полетата (LevelTestQuestion.options) са обекти. Сравнението по
    // идентичност би отчитало промяна при всяко четене от базата.
    expect(
      diffFields({ options: { a: 1, b: [2, 3] } }, { options: { a: 1, b: [2, 3] } }),
    ).toBeNull();

    expect(
      diffFields({ options: { a: 1 } }, { options: { a: 2 } }),
    ).not.toBeNull();
  });

  it("различава 0 от null и false от null", () => {
    // Класическият капан: `!value` слива нулата с липсата. За цена нула
    // („безплатно") срещу null („по договаряне") разликата е съществена.
    expect(diffFields({ priceCents: 0 }, { priceCents: null })).not.toBeNull();
    expect(diffFields({ published: false }, { published: null })).not.toBeNull();
    expect(diffFields({ priceCents: 0 }, { priceCents: 0 })).toBeNull();
  });
});
