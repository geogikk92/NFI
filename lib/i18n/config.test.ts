import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localeFromAcceptLanguage,
  pick,
  switchLocalePath,
  toLocale,
} from "./config";
import { getDictionary } from "./dictionaries";

describe("разпознаване на език", () => {
  it("приема трите езика", () => {
    for (const locale of LOCALES) expect(isLocale(locale)).toBe(true);
  });

  it("отхвърля всичко останало", () => {
    for (const value of ["fr", "DE", "", null, 42, {}]) {
      expect(isLocale(value)).toBe(false);
    }
  });

  it("toLocale пада към езика по подразбиране вместо да гърми", () => {
    expect(toLocale("bg")).toBe("bg");
    expect(toLocale("измислен")).toBe(DEFAULT_LOCALE);
    expect(toLocale(undefined)).toBe(DEFAULT_LOCALE);
  });
});

describe("pick · вериги от резервни варианти", () => {
  it("взима искания език", () => {
    expect(pick("bg", { bg: "Курс", de: "Kurs", en: "Course" })).toBe("Курс");
  });

  it("липсващият превод пада на БЪЛГАРСКИ, после на немски", () => {
    // Българският е основният: мокъпът е на български и админът въвежда
    // на него, значи тази колона е винаги попълнена.
    expect(pick("en", { bg: "Курс", de: "Kurs" })).toBe("Курс");
    expect(pick("en", { de: "Kurs" })).toBe("Kurs");
    expect(pick("de", { en: "Course" })).toBe("Course");
  });

  it("празният низ се брои за липсващ", () => {
    expect(pick("en", { en: "", bg: "Курс" })).toBe("Курс");
    expect(pick("en", { en: "   ", de: "Kurs" })).toBe("Kurs");
  });

  it("null и undefined не чупят нищо", () => {
    expect(pick("de", { de: null, bg: "Курс" })).toBe("Курс");
    expect(pick("de", { de: undefined, bg: undefined })).toBe("");
    expect(pick("de", {})).toBe("");
  });
});

describe("localeFromAcceptLanguage", () => {
  it("разчита проста глава", () => {
    expect(localeFromAcceptLanguage("bg")).toBe("bg");
    expect(localeFromAcceptLanguage("en-GB")).toBe("en");
  });

  it("уважава подредбата по качество", () => {
    expect(localeFromAcceptLanguage("fr;q=0.9,bg;q=1.0")).toBe("bg");
    expect(localeFromAcceptLanguage("en;q=0.3,de;q=0.8")).toBe("de");
  });

  it("регионалният вариант се свежда до езика", () => {
    expect(localeFromAcceptLanguage("de-AT,en;q=0.5")).toBe("de");
  });

  it("непознат език пада на езика по подразбиране", () => {
    expect(localeFromAcceptLanguage("fr,it;q=0.8")).toBe(DEFAULT_LOCALE);
    expect(localeFromAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
    expect(localeFromAcceptLanguage("")).toBe(DEFAULT_LOCALE);
  });

  it("не гърми при повреден q", () => {
    expect(localeFromAcceptLanguage("bg;q=глупост")).toBe("bg");
  });
});

describe("switchLocalePath", () => {
  it("сменя езика, като пази пътя", () => {
    expect(switchLocalePath("/de/kurse", "bg")).toBe("/bg/kurse");
    expect(switchLocalePath("/bg/kurse/a1", "en")).toBe("/en/kurse/a1");
  });

  it("добавя език, ако липсва", () => {
    expect(switchLocalePath("/kurse", "de")).toBe("/de/kurse");
    expect(switchLocalePath("/", "bg")).toBe("/bg");
  });

  it("не бърка сегмент, който само изглежда като език", () => {
    // „en" като част от името на курс не бива да се третира като език.
    expect(switchLocalePath("/de/kurse/english-b1", "bg")).toBe(
      "/bg/kurse/english-b1",
    );
  });
});

describe("речниците са пълни", () => {
  it("всеки език има всички ключове на немския", () => {
    const de = getDictionary("de");

    for (const locale of LOCALES) {
      const dict = getDictionary(locale);

      for (const section of Object.keys(de) as (keyof typeof de)[]) {
        expect(dict[section], `${locale}.${section}`).toBeDefined();

        for (const key of Object.keys(de[section])) {
          const value = (dict[section] as Record<string, string>)[key];
          expect(value, `${locale}.${section}.${key}`).toBeTruthy();
          expect(typeof value).toBe("string");
        }
      }
    }
  });

  it("никой превод не е оставен на немски по невнимание", () => {
    // Проверява няколко ключа, които ЗАДЪЛЖИТЕЛНО се различават.
    const de = getDictionary("de");
    const bg = getDictionary("bg");
    const en = getDictionary("en");

    expect(bg.nav.courses).not.toBe(de.nav.courses);
    expect(en.nav.courses).not.toBe(de.nav.courses);
    expect(bg.home.heroTitle).not.toBe(de.home.heroTitle);
    expect(en.home.heroTitle).not.toBe(de.home.heroTitle);
  });
});
