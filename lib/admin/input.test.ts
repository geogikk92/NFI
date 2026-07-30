import { describe, expect, it } from "vitest";
import {
  MAX_MONEY_CENTS,
  oneOf,
  optionalText,
  parseDateEnd,
  parseDateStart,
  parseMoneyToCents,
  parseOptionalMoneyToCents,
  parseOptionalWholeNumber,
  parseWholeNumber,
  requiredText,
  toDateInputValue,
} from "./input";

/** Кратко извличане, за да не се повтаря проверката на `ok` навсякъде. */
function value<T>(result: { ok: true; value: T } | { ok: false; error: string }) {
  if (!result.ok) throw new Error(`Очаквах успех, получих: ${result.error}`);
  return result.value;
}

function error<T>(
  result: { ok: true; value: T } | { ok: false; error: string },
): string {
  if (result.ok) {
    throw new Error(`Очаквах грешка, получих: ${JSON.stringify(result.value)}`);
  }
  return result.error;
}

describe("parseMoneyToCents", () => {
  it("чете цяло число като евро", () => {
    expect(value(parseMoneyToCents("129", "Цена"))).toBe(12900);
    expect(value(parseMoneyToCents("0", "Цена"))).toBe(0);
  });

  it("приема и запетая, и точка за десетичен знак", () => {
    expect(value(parseMoneyToCents("129,50", "Цена"))).toBe(12950);
    expect(value(parseMoneyToCents("129.50", "Цена"))).toBe(12950);
  });

  it("допълва един десетичен знак отдясно", () => {
    // „129,5" са 50 цента. Наивното четене дава 5 и цената пада с 45 цента.
    expect(value(parseMoneyToCents("129,5", "Цена"))).toBe(12950);
  });

  it("маха интервалите, включително непрекъсваемите", () => {
    expect(value(parseMoneyToCents(" 1 299,50 ", "Цена"))).toBe(129950);
    expect(value(parseMoneyToCents("1 299,50", "Цена"))).toBe(129950);
    expect(value(parseMoneyToCents("1 299,50", "Цена"))).toBe(129950);
  });

  it("НЕ гадае разделителя за хиляди", () => {
    // „1.299,50" е 1299,50 € на немски и безсмислица на английски. Тихото
    // тълкуване в която и да е посока дава грешна цена в магазина.
    expect(error(parseMoneyToCents("1.299,50", "Цена"))).toContain("хиляди");
    expect(error(parseMoneyToCents("1,299.50", "Цена"))).toContain("хиляди");
  });

  it("отказва да закръгли третия знак", () => {
    // 19,999 → 20,00 € без сигнал е точно начинът, по който грешна цена
    // стига до фактура.
    expect(error(parseMoneyToCents("19,999", "Цена"))).toContain("два знака");
  });

  it("отхвърля отрицателно, буквено и празно", () => {
    expect(error(parseMoneyToCents("-5", "Цена"))).toContain("отрицателна");
    expect(error(parseMoneyToCents("сто", "Цена"))).toContain("не е сума");
    expect(error(parseMoneyToCents("12e3", "Цена"))).toContain("не е сума");
    expect(error(parseMoneyToCents("", "Цена"))).toContain("задължително");
  });

  it("спира преди препълването на Int колоната", () => {
    expect(value(parseMoneyToCents("999999,99", "Цена"))).toBe(MAX_MONEY_CENTS);
    expect(error(parseMoneyToCents("1000000", "Цена"))).toContain("надхвърля");
  });

  it("никога не връща число с плаваща запетая", () => {
    // Точката на целия модул: стойността влиза в Int колона. 0,1 + 0,2 в
    // плаваща запетая дава 0,30000000000000004 — тук такова нещо не може
    // да се получи, защото не се смята с дробни числа.
    for (const raw of ["0,01", "0,07", "1,10", "19,99", "8,29", "1234,56"]) {
      const cents = value(parseMoneyToCents(raw, "Цена"));
      expect(Number.isInteger(cents), raw).toBe(true);
    }
    expect(value(parseMoneyToCents("8,29", "Цена"))).toBe(829);
    expect(value(parseMoneyToCents("1234,56", "Цена"))).toBe(123456);
  });
});

describe("parseOptionalMoneyToCents", () => {
  it("празното дава null, не нула", () => {
    // Разликата е видима за клиента: null е „цената се уговаря", а 0 е
    // „безплатно".
    expect(value(parseOptionalMoneyToCents("", "Цена"))).toBeNull();
    expect(value(parseOptionalMoneyToCents("   ", "Цена"))).toBeNull();
    expect(value(parseOptionalMoneyToCents("0", "Цена"))).toBe(0);
  });
});

describe("parseWholeNumber", () => {
  it("чете цяло число в границите", () => {
    expect(value(parseWholeNumber("12", { max: 100, label: "Седмици" }))).toBe(
      12,
    );
  });

  it("НЕ приема частично число, за разлика от parseInt", () => {
    // parseInt("12 броя") дава 12 и „12.9" дава 12 — тихо приемане на
    // сгрешено въвеждане.
    expect(error(parseWholeNumber("12 броя", { max: 100, label: "Брой" })))
      .toContain("не е цяло число");
    expect(error(parseWholeNumber("12.9", { max: 100, label: "Брой" })))
      .toContain("не е цяло число");
  });

  it("спазва долната и горната граница", () => {
    expect(error(parseWholeNumber("0", { min: 1, max: 99, label: "Места" })))
      .toContain("под 1");
    expect(error(parseWholeNumber("100", { min: 1, max: 99, label: "Места" })))
      .toContain("над 99");
  });

  it("позволява отрицателно, когато границата го допуска", () => {
    // Подредбата може да е отрицателна, за да излезе нещо най-отпред.
    expect(
      value(parseWholeNumber("-5", { min: -100, max: 100, label: "Ред" })),
    ).toBe(-5);
  });

  it("празното е грешка, освен при незадължителния вариант", () => {
    expect(error(parseWholeNumber("", { max: 10, label: "Брой" })))
      .toContain("задължително");
    expect(value(parseOptionalWholeNumber("", { max: 10, label: "Брой" })))
      .toBeNull();
  });
});

describe("текстови полета", () => {
  it("празното незадължително поле дава null, не празен низ", () => {
    // "" в базата минава за налично описание и публичната страница показва
    // празен абзац вместо да падне на резервния език.
    expect(value(optionalText("  ", 100, "Описание"))).toBeNull();
    expect(value(optionalText(" текст ", 100, "Описание"))).toBe("текст");
  });

  it("мери дължината след подрязването", () => {
    expect(value(optionalText(`  ${"а".repeat(10)}  `, 10, "Име"))).toHaveLength(
      10,
    );
    expect(error(optionalText("а".repeat(11), 10, "Име"))).toContain("11");
  });

  it("задължителното поле има долна граница", () => {
    expect(error(requiredText("", { max: 10, label: "Заглавие" })))
      .toContain("задължително");
    expect(error(requiredText("а", { min: 2, max: 10, label: "Заглавие" })))
      .toContain("най-малко 2");
  });
});

describe("oneOf", () => {
  const LEVELS = ["A1", "A2", "B1"] as const;

  it("приема стойност от списъка", () => {
    expect(value(oneOf("B1", LEVELS, "Ниво"))).toBe("B1");
  });

  it("не пуска нищо от прототипната верига", () => {
    // Операторът `in` върху обект би пуснал „toString" и „constructor" —
    // капан, който вече е удрял два пъти в този проект.
    expect(error(oneOf("toString", LEVELS, "Ниво"))).toContain("допустимите");
    expect(error(oneOf("constructor", LEVELS, "Ниво"))).toContain("допустимите");
    expect(error(oneOf("__proto__", LEVELS, "Ниво"))).toContain("допустимите");
  });

  it("празното е грешка", () => {
    expect(error(oneOf("", LEVELS, "Ниво"))).toContain("не е избрано");
  });
});

describe("дати в часовата зона на сайта", () => {
  it("началото на деня е полунощ в Берлин, не в UTC", () => {
    // Лято: Берлин е UTC+2, значи полунощ на 1 септември е 22:00 на 31 август.
    expect(value(parseDateStart("2026-09-01", "Начало"))?.toISOString()).toBe(
      "2026-08-31T22:00:00.000Z",
    );
    // Зима: UTC+1.
    expect(value(parseDateStart("2026-01-15", "Начало"))?.toISOString()).toBe(
      "2026-01-14T23:00:00.000Z",
    );
  });

  it("краят на деня е 23:59:59 в Берлин", () => {
    // Същината: наивното „31.12 23:59 UTC" е вече 1 януари в Берлин и
    // списъкът показва промоция „до 01.01" при въведено 31.12.
    expect(value(parseDateEnd("2026-12-31", "Край"))?.toISOString()).toBe(
      "2026-12-31T22:59:59.999Z",
    );
  });

  it("отива и се връща без изместване на деня", () => {
    // ЕДИНСТВЕНАТА проверка, която пази админа от „въведох 1 септември, а
    // при отваряне пише 31 август". Обхожда цяла година, включително двете
    // смени на времето (29.03 и 25.10.2026).
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [1, 15, 28]) {
        const text = `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        expect(toDateInputValue(value(parseDateStart(text, "Начало"))), text)
          .toBe(text);
        expect(toDateInputValue(value(parseDateEnd(text, "Край"))), text)
          .toBe(text);
      }
    }
  });

  it("издържа и в двата дни на смяна на времето", () => {
    for (const text of ["2026-03-29", "2026-10-25"]) {
      expect(toDateInputValue(value(parseDateStart(text, "Начало"))), text)
        .toBe(text);
      expect(toDateInputValue(value(parseDateEnd(text, "Край"))), text)
        .toBe(text);
    }
  });

  it("началото винаги предхожда края на същия ден", () => {
    for (const text of ["2026-03-29", "2026-10-25", "2026-07-01"]) {
      const start = value(parseDateStart(text, "Начало"))!;
      const end = value(parseDateEnd(text, "Край"))!;
      expect(end.getTime(), text).toBeGreaterThan(start.getTime());
      // Един ден има 24 часа, освен в двата дни на смяната — 23 и 25.
      const hours = (end.getTime() - start.getTime()) / 3_600_000;
      expect(hours, text).toBeGreaterThan(22.9);
      expect(hours, text).toBeLessThan(25.1);
    }
  });

  it("отхвърля несъществуваща дата", () => {
    // 31 февруари минава проверката „месец 1-12, ден 1-31", но Date го
    // „поправя" на 3 март — тоест мълчаливо сменя въведеното.
    expect(error(parseDateStart("2026-02-31", "Начало"))).toContain("валидна");
    expect(error(parseDateStart("2026-13-01", "Начало"))).toContain("валидна");
    expect(error(parseDateStart("31.12.2026", "Начало"))).toContain("валидна");
  });

  it("празното дава null", () => {
    expect(value(parseDateStart("", "Начало"))).toBeNull();
    expect(value(parseDateEnd("", "Край"))).toBeNull();
    expect(toDateInputValue(null)).toBe("");
  });
});
