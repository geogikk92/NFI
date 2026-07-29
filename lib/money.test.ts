// Тестове на парите · част от задача 24b, писани рано нарочно.
//
// Правят се срещу ОЧАКВАНОТО поведение, не срещу текущата реализация.
// Ако тест падне, първо се проверява дали не е прав ТОЙ.

import { describe, expect, it } from "vitest";
import {
  applyDiscount,
  distributeDiscount,
  formatMoney,
  grossFromNet,
  netFromGross,
  roundHalfUp,
  toCents,
  toEuros,
  vatFromGross,
} from "./money";

describe("roundHalfUp", () => {
  it("закръгля половината нагоре", () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
  });

  it("е симетрично около нулата — важно при кредитни известия", () => {
    // Math.round(-0.5) дава -0, което тук е грешно.
    expect(roundHalfUp(-0.5)).toBe(-1);
    expect(roundHalfUp(-1.5)).toBe(-2);
    expect(roundHalfUp(-2.5)).toBe(-3);
  });

  it("не връща -0", () => {
    expect(Object.is(roundHalfUp(-0.2), -0)).toBe(false);
    expect(roundHalfUp(-0.2)).toBe(0);
  });
});

describe("toCents", () => {
  it("превръща евро в центове", () => {
    expect(toCents(12.34)).toBe(1234);
    expect(toCents(0)).toBe(0);
    expect(toCents(0.01)).toBe(1);
    expect(toCents(1000)).toBe(100_000);
  });

  it("оцелява при плаваща запетая", () => {
    // 19.99 * 100 = 1998.9999999999998 в IEEE 754
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.29)).toBe(29);
    expect(toCents(8.29)).toBe(829);
    expect(toCents(1.1)).toBe(110);
  });

  it("хвърля при повече от два знака, вместо да закръгли тихо", () => {
    // Иначе 19,999 € влиза в базата като 20,00 € без сигнал.
    expect(() => toCents(19.999)).toThrow(/два знака/);
    expect(() => toCents(1.005)).toThrow(/два знака/);
    expect(() => toCents(0.145)).toThrow(/два знака/);
  });

  it("отказва нечисла и суми извън безопасния диапазон", () => {
    expect(() => toCents(Number.NaN)).toThrow();
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => toCents(1e21)).toThrow();
  });

  it("прави пълен кръг с toEuros", () => {
    for (const cents of [0, 1, 99, 1234, 999_999]) {
      expect(toCents(toEuros(cents))).toBe(cents);
    }
  });
});

describe("formatMoney", () => {
  it("форматира по немски — запетая и знак накрая", () => {
    const out = formatMoney(1234);
    expect(out).toMatch(/12,34/);
    expect(out).toMatch(/€/);
  });

  it("показва и нулата като сума", () => {
    expect(formatMoney(0)).toMatch(/0,00/);
  });

  it("работи и на български локал", () => {
    expect(formatMoney(1234, "bg-BG")).toMatch(/12,34/);
  });
});

describe("ДДС от бруто", () => {
  it("смята точно при кръгли числа", () => {
    // 119,00 € с 19% ДДС → нето 100,00 €, ДДС 19,00 €
    expect(vatFromGross(11_900, 19)).toBe(1900);
    expect(netFromGross(11_900, 19)).toBe(10_000);
    // 120,00 € с 20% (българска ставка) → нето 100,00 €
    expect(vatFromGross(12_000, 20)).toBe(2000);
    expect(netFromGross(12_000, 20)).toBe(10_000);
  });

  it("приема ставката и като низ — Prisma Decimal идва така", () => {
    expect(vatFromGross(11_900, "19")).toBe(1900);
    expect(vatFromGross(11_900, "19.00")).toBe(1900);
  });

  it("ИНВАРИАНТ: нето + ДДС === бруто, винаги", () => {
    const rates = [0, 7, 9, 19, 20, 21, 27];
    for (const rate of rates) {
      for (let gross = 1; gross <= 3000; gross += 7) {
        const vat = vatFromGross(gross, rate);
        const net = netFromGross(gross, rate);
        expect(net + vat).toBe(gross);
      }
    }
  });

  it("при ставка 0 не начислява нищо", () => {
    expect(vatFromGross(10_000, 0)).toBe(0);
    expect(netFromGross(10_000, 0)).toBe(10_000);
  });

  it("отказва невалидна ставка", () => {
    expect(() => vatFromGross(10_000, -5)).toThrow();
    expect(() => vatFromGross(10_000, "какво")).toThrow();
  });

  it("grossFromNet връща обратно нетото", () => {
    expect(grossFromNet(10_000, 19)).toBe(11_900);
    expect(grossFromNet(10_000, 20)).toBe(12_000);
  });
});

describe("applyDiscount", () => {
  it("процентна отстъпка", () => {
    expect(applyDiscount(10_000, "PERCENT", 10)).toEqual({
      discountCents: 1000,
      totalCents: 9000,
    });
  });

  it("фиксирана отстъпка", () => {
    expect(applyDiscount(10_000, "FIXED", 1500)).toEqual({
      discountCents: 1500,
      totalCents: 8500,
    });
  });

  it("никога не прави сумата отрицателна", () => {
    const big = applyDiscount(5000, "FIXED", 9999);
    expect(big.totalCents).toBe(0);
    expect(big.discountCents).toBe(5000);

    const over = applyDiscount(5000, "PERCENT", 150);
    expect(over.totalCents).toBe(0);
    expect(over.discountCents).toBe(5000);
  });

  it("игнорира отрицателна отстъпка вместо да добавя пари", () => {
    const neg = applyDiscount(5000, "FIXED", -1000);
    expect(neg.discountCents).toBe(0);
    expect(neg.totalCents).toBe(5000);
  });

  it("ИНВАРИАНТ: отстъпка + остатък === изходната сума", () => {
    for (const amount of [1, 99, 1234, 50_000]) {
      for (const pct of [0, 5, 33, 50, 100]) {
        const r = applyDiscount(amount, "PERCENT", pct);
        expect(r.discountCents + r.totalCents).toBe(amount);
      }
    }
  });
});

describe("distributeDiscount", () => {
  it("раздава отстъпката пропорционално", () => {
    expect(distributeDiscount([5000, 5000], 1000)).toEqual([500, 500]);
  });

  it("ИНВАРИАНТ: сборът на дяловете === отстъпката, без изгубени центове", () => {
    const cases: Array<[number[], number]> = [
      [[3333, 3333, 3334], 1000],
      [[1, 1, 1], 2],
      [[999, 1, 1000], 333],
      [[10_000, 3, 7], 999],
      [[1234, 5678, 9012, 3456], 4321],
    ];
    for (const [lines, discount] of cases) {
      const shares = distributeDiscount(lines, discount);
      const sum = shares.reduce((a, b) => a + b, 0);
      expect(sum).toBe(discount);
      expect(shares).toHaveLength(lines.length);
    }
  });

  it("не дава на ред повече, отколкото струва", () => {
    const lines = [100, 10_000];
    const shares = distributeDiscount(lines, 5000);
    shares.forEach((share, i) => {
      expect(share).toBeLessThanOrEqual(lines[i]);
      expect(share).toBeGreaterThanOrEqual(0);
    });
  });

  it("не отстъпва нищо от ред за 0 ct (бонус към поръчката)", () => {
    // Даваше [33, 33, 33, 1] — един цент отстъпка върху безплатен ред.
    expect(distributeDiscount([333, 333, 334, 0], 100)).toEqual([
      33, 33, 34, 0,
    ]);
  });

  it("никога не връща отрицателен дял", () => {
    // Десет реда по 3 ct с отстъпка 15: остатъкът се стоварваше на
    // последния ред и го правеше -3, тоест УВЕЛИЧАВАШЕ цената му.
    const shares = distributeDiscount([3, 3, 3, 3, 3, 3, 3, 3, 3, 3], 15);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(15);
    for (const share of shares) {
      expect(share).toBeGreaterThanOrEqual(0);
      expect(share).toBeLessThanOrEqual(3);
    }
  });

  it("не раздава повече от общата стойност на редовете", () => {
    expect(distributeDiscount([100], 500)).toEqual([100]);
  });

  it("не се влияе от отрицателни редове в базата", () => {
    // [1000, -400] с 300 даваше [500, -200]: първият ред получаваше 50%
    // вместо 30%, защото базата беше 600 вместо 1000.
    expect(distributeDiscount([1000, -400], 300)).toEqual([300, 0]);
  });

  it("е детерминистичен при равни остатъци", () => {
    const lines = [1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250];
    const first = distributeDiscount(lines, 4);
    for (let i = 0; i < 20; i++) {
      expect(distributeDiscount(lines, 4)).toEqual(first);
    }
    expect(first.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it("понася празен списък и нулева отстъпка", () => {
    expect(distributeDiscount([], 100)).toEqual([]);
    expect(distributeDiscount([1000], 0)).toEqual([0]);
    expect(distributeDiscount([0, 0], 100)).toEqual([0, 0]);
  });
});
