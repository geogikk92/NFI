import { describe, expect, it } from "vitest";
import {
  COURSE_LEVELS,
  FORMAT_LABELS,
  LEVEL_LABELS,
  parseFormat,
  parseLevel,
} from "./courses";

describe("parseLevel", () => {
  it("приема валидните нива", () => {
    for (const level of COURSE_LEVELS) {
      expect(parseLevel(level)).toBe(level);
    }
  });

  it("отхвърля всичко останало", () => {
    for (const value of ["A3", "a1", "", "ГЛУПОСТ", null, undefined, 42, {}]) {
      expect(parseLevel(value)).toBeNull();
    }
  });
});

describe("parseFormat", () => {
  it("приема валидните формати", () => {
    for (const format of Object.keys(FORMAT_LABELS)) {
      expect(parseFormat(format)).toBe(format);
    }
  });

  it("НЕ приема наследени ключове от Object.prototype", () => {
    // Операторът `in` обхождаше прототипната верига, затова
    // /kurse?format=toString минаваше за валиден формат и Prisma гърмеше
    // с 500 на публична страница.
    const inherited = [
      "toString",
      "constructor",
      "valueOf",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "toLocaleString",
      "__proto__",
      "__defineGetter__",
    ];
    for (const value of inherited) {
      expect(parseFormat(value)).toBeNull();
    }
  });

  it("отхвърля и обикновените глупости", () => {
    for (const value of ["online", "", null, undefined, 0, []]) {
      expect(parseFormat(value)).toBeNull();
    }
  });
});

describe("етикети", () => {
  it("всяко ниво има немски етикет", () => {
    for (const level of COURSE_LEVELS) {
      expect(LEVEL_LABELS[level]).toBeTruthy();
      expect(LEVEL_LABELS[level]).toContain(level);
    }
  });

  it("всеки формат има немски етикет", () => {
    for (const label of Object.values(FORMAT_LABELS)) {
      expect(label).toBeTruthy();
    }
  });
});
