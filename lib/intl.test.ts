import { describe, expect, it } from "vitest";
import {
  formatCourseDuration,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatList,
  formatNumber,
  formatPercent,
  formatRelative,
  formatTime,
  toDateTimeAttribute,
} from "./intl";

// 15 март 2026, 14:30 берлинско време (13:30 UTC — зимното часово време
// свършва в края на март).
const D = new Date("2026-03-15T13:30:00Z");

describe("дати", () => {
  it("немският формат е с точки и водещи нули", () => {
    expect(formatDate(D)).toBe("15.03.2026");
  });

  it("българският формат също, но е отделен локал", () => {
    expect(formatDate(D, "bg")).toMatch(/15\.03\.2026/);
  });

  it("дългият формат изписва месеца", () => {
    expect(formatDateLong(D)).toBe("15. März 2026");
  });

  it("часът е 24-часов", () => {
    expect(formatTime(D)).toBe("14:30");
    expect(formatDateTime(D)).toBe("15.03.2026, 14:30");
  });

  it("часовата зона е на института, не на сървъра", () => {
    // 23:30 UTC е вече следващият ден в Берлин.
    const late = new Date("2026-03-15T23:30:00Z");
    expect(formatDate(late)).toBe("16.03.2026");
  });

  it("издържа преминаването към лятно време", () => {
    // 29.03.2026 е смяната: 01:00 UTC → 03:00 CEST
    const beforeSwitch = new Date("2026-03-29T00:30:00Z");
    const afterSwitch = new Date("2026-03-29T01:30:00Z");
    expect(formatTime(beforeSwitch)).toBe("01:30");
    expect(formatTime(afterSwitch)).toBe("03:30");
  });

  it("dateTime атрибутът е машинно четим", () => {
    expect(toDateTimeAttribute(D)).toBe("2026-03-15T13:30:00.000Z");
  });
});

describe("числа", () => {
  it("немското хилядно е точка, десетичното е запетая", () => {
    expect(formatNumber(1234.56, "de", { minimumFractionDigits: 2 })).toBe(
      "1.234,56",
    );
  });

  it("цели числа минават без десетични", () => {
    expect(formatNumber(1000)).toBe("1.000");
    expect(formatNumber(0)).toBe("0");
  });

  it("процентите се смятат от дроб, не от цяло число", () => {
    // 0.45 → „45 %", НЕ 45 → „4.500 %"
    expect(formatPercent(0.45)).toMatch(/45/);
    expect(formatPercent(0.45)).toMatch(/%/);
  });
});

describe("formatList", () => {
  it("немският свързва с „und“, без оксфордска запетая", () => {
    expect(formatList(["Deutsch", "Englisch", "Spanisch"])).toBe(
      "Deutsch, Englisch und Spanisch",
    );
  });

  it("българският свързва с „и“", () => {
    expect(formatList(["немски", "английски"], "bg")).toContain("и");
  });

  it("две и една стойност", () => {
    expect(formatList(["A", "B"])).toBe("A und B");
    expect(formatList(["A"])).toBe("A");
    expect(formatList([])).toBe("");
  });

  it("разделителният вариант ползва „oder“", () => {
    expect(formatList(["A", "B"], "de", "disjunction")).toBe("A oder B");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-03-15T12:00:00Z");

  it("минало и бъдеще", () => {
    expect(formatRelative(new Date("2026-03-12T12:00:00Z"), "de", now)).toMatch(
      /vor 3 Tagen/,
    );
    expect(formatRelative(new Date("2026-03-29T12:00:00Z"), "de", now)).toMatch(
      /2 Wochen/,
    );
  });

  it("избира най-едрата подходяща единица", () => {
    expect(formatRelative(new Date("2026-03-15T10:00:00Z"), "de", now)).toMatch(
      /Stunden/,
    );
    expect(formatRelative(new Date("2027-03-15T12:00:00Z"), "de", now)).toMatch(
      /Jahr/,
    );
  });

  it("не гърми при еднакви момента", () => {
    expect(formatRelative(now, "de", now)).toBeTruthy();
  });
});

describe("formatCourseDuration", () => {
  it("сглобява продължителността на немски", () => {
    expect(formatCourseDuration(12, 4)).toBe("12 Wochen · 4 Std./Woche");
  });

  it("прави разлика между единствено и множествено число", () => {
    expect(formatCourseDuration(1, null)).toBe("1 Woche");
    expect(formatCourseDuration(2, null)).toBe("2 Wochen");
    expect(formatCourseDuration(1, null, "bg")).toBe("1 седмица");
    expect(formatCourseDuration(3, null, "bg")).toBe("3 седмици");
  });

  it("връща null, когато няма какво да покаже", () => {
    expect(formatCourseDuration(null, null)).toBeNull();
    expect(formatCourseDuration(0, 0)).toBeNull();
  });

  it("работи и само с един от двата параметъра", () => {
    expect(formatCourseDuration(null, 6)).toBe("6 Std./Woche");
  });
});
