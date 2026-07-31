import { describe, expect, it } from "vitest";
import {
  MAX_CODE_LENGTH,
  codeProblem,
  discountStatus,
  normalizeCode,
} from "./discount-code";

describe("normalizeCode", () => {
  it("вдига до главни букви", () => {
    // НЕ е разкрасяване: касата търси с .toUpperCase() (виж catalog.ts),
    // тоест код, записан с малки букви, не може да бъде намерен никога.
    expect(normalizeCode("leto2026")).toBe("LETO2026");
  });

  it("маха интервалите", () => {
    // Клиентът ги губи при копиране и кодът „не работи" по причина,
    // невидима и за двете страни.
    expect(normalizeCode("  LETO 2026 ")).toBe("LETO2026");
    expect(normalizeCode("LETO\t2026")).toBe("LETO2026");
  });
});

describe("codeProblem", () => {
  it("приема нормален код", () => {
    expect(codeProblem("LETO2026")).toBeNull();
    expect(codeProblem("A1-START")).toBeNull();
    expect(codeProblem("2026")).toBeNull();
  });

  it("ОТХВЪРЛЯ кирилица и обяснява защо", () => {
    // Същината: „ЛЯТО2026" се пише лесно на българска клавиатура и
    // изглежда като нормален код, но клиент в Германия не може да го
    // набере. Най-лошо е смесеното — кирилско „С" до латинско „Т".
    const problem = codeProblem("ЛЯТО2026");
    expect(problem).not.toBeNull();
    expect(problem).toContain("кирилица");

    // Хомоглифи: изглежда точно като латинско „CTAPT".
    expect(codeProblem("СТАРТ")).not.toBeNull();
    // Смесен — една-единствена кирилска буква стига.
    expect(codeProblem("STARТ")).not.toBeNull();
  });

  it("отхвърля празно и прекалено късо", () => {
    expect(codeProblem("")).toContain("задължителен");
    expect(codeProblem("AB")).toContain("налучкване");
  });

  it("отхвърля прекалено дълго", () => {
    expect(codeProblem("A".repeat(MAX_CODE_LENGTH + 1))).toContain("преписва");
  });

  it("отхвърля водещо, крайно и двойно тире", () => {
    expect(codeProblem("-LETO")).not.toBeNull();
    expect(codeProblem("LETO-")).not.toBeNull();
    expect(codeProblem("LE--TO")).not.toBeNull();
  });

  it("отхвърля интервал и препинателни знаци", () => {
    // Стигат дотук само ако някой подмине normalizeCode.
    expect(codeProblem("LETO 2026")).not.toBeNull();
    expect(codeProblem("LETO!")).not.toBeNull();
    expect(codeProblem("LETO_2026")).not.toBeNull();
  });

  it("нормализираният вход винаги минава проверката, ако е разумен", () => {
    // Кръстосана проверка: показаното от формата и приетото от сървъра са
    // едно и също нещо.
    for (const raw of ["leto 2026", "  a1-start  ", "Winter2026"]) {
      expect(codeProblem(normalizeCode(raw)), raw).toBeNull();
    }
  });
});

describe("discountStatus", () => {
  const BASE = {
    active: true,
    startsAt: null,
    endsAt: null,
    maxRedemptions: null,
    redemptions: 0,
  };

  const NOW = new Date("2026-07-31T12:00:00Z");

  it("работеща промоция", () => {
    expect(discountStatus(BASE, NOW)).toBe("active");
  });

  it("изключената е изключена, каквото и да е останалото", () => {
    expect(discountStatus({ ...BASE, active: false }, NOW)).toBe("off");
  });

  it("разпознава още-невлязла и изтекла", () => {
    expect(
      discountStatus({ ...BASE, startsAt: new Date("2026-09-01") }, NOW),
    ).toBe("pending");
    expect(
      discountStatus({ ...BASE, endsAt: new Date("2026-06-01") }, NOW),
    ).toBe("expired");
  });

  it("разпознава изчерпаната", () => {
    // Тук е смисълът на цялата функция: кодът стои с отметка „активен" и
    // изглежда изправен, а клиентът получава отказ.
    expect(
      discountStatus({ ...BASE, maxRedemptions: 50, redemptions: 50 }, NOW),
    ).toBe("used-up");
    expect(
      discountStatus({ ...BASE, maxRedemptions: 50, redemptions: 49 }, NOW),
    ).toBe("active");
  });

  it("повтаря реда на проверките от касата", () => {
    // Разминат ли се двата реда, панелът твърди едно, а касата прави
    // друго. Изтекъл И изчерпан код се обявява за ИЗТЕКЪЛ и на двете
    // места — виж describeDiscountProblem в lib/commerce/pricing.ts.
    expect(
      discountStatus(
        {
          ...BASE,
          endsAt: new Date("2026-06-01"),
          maxRedemptions: 1,
          redemptions: 5,
        },
        NOW,
      ),
    ).toBe("expired");
  });

  it("границата на срока е включваща", () => {
    // „Важи до 31.12" значи, че на 31.12 в 23:59 още важи.
    const endsAt = new Date("2026-12-31T22:59:59.999Z");
    expect(discountStatus({ ...BASE, endsAt }, endsAt)).toBe("active");
    expect(
      discountStatus({ ...BASE, endsAt }, new Date(endsAt.getTime() + 1)),
    ).toBe("expired");
  });
});
