import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  MAX_QUANTITY_PER_LINE,
  addLine,
  countItems,
  mergeLines,
  parseCart,
  removeLine,
  serializeCart,
  setQuantity,
  type CartLine,
} from "./cart";

const lines: CartLine[] = [
  { productId: "a", quantity: 2 },
  { productId: "b", quantity: 1 },
];

describe("сериализация", () => {
  it("прави пълен кръг", () => {
    expect(parseCart(serializeCart(lines))).toEqual(lines);
  });

  it("записът е компактен — масив, не обекти", () => {
    expect(serializeCart(lines)).toBe('[["a",2],["b",1]]');
  });

  it("не пази цени — само id и количество", () => {
    const raw = serializeCart(lines);
    expect(raw).not.toMatch(/price|cents|title/i);
  });
});

describe("parseCart · враждебен вход", () => {
  it("празна количка при липсваща бисквитка", () => {
    expect(parseCart(undefined)).toEqual([]);
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("")).toEqual([]);
  });

  it("не хвърля при повреден JSON", () => {
    // Клиентът може да напише какво ли не в бисквитката си.
    expect(parseCart("{счупено")).toEqual([]);
    expect(parseCart("null")).toEqual([]);
    expect(parseCart('"низ"')).toEqual([]);
    expect(parseCart("42")).toEqual([]);
    expect(parseCart('{"productId":"a"}')).toEqual([]);
  });

  it("пропуска невалидните редове, но пази валидните", () => {
    const raw = JSON.stringify([
      ["a", 2],
      ["b", 0], // нулево количество
      ["c", -5], // отрицателно
      ["d", 1.5], // дробно
      ["", 3], // празно id
      [null, 1], // грешен тип
      ["e"], // непълен запис
      ["f", 1],
    ]);
    expect(parseCart(raw)).toEqual([
      { productId: "a", quantity: 2 },
      { productId: "f", quantity: 1 },
    ]);
  });

  it("реже количество над тавана", () => {
    const raw = JSON.stringify([["a", 100_000]]);
    expect(parseCart(raw)[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("не позволява препълване на бисквитката", () => {
    const many = Array.from({ length: 500 }, (_, i) => [`p${i}`, 1]);
    expect(parseCart(JSON.stringify(many)).length).toBeLessThanOrEqual(
      MAX_CART_LINES,
    );
  });

  it("слива дублирани редове от бисквитката", () => {
    const raw = JSON.stringify([
      ["a", 2],
      ["a", 3],
    ]);
    expect(parseCart(raw)).toEqual([{ productId: "a", quantity: 5 }]);
  });
});

describe("addLine", () => {
  it("добавя нов ред", () => {
    expect(addLine(lines, "c", 1)).toContainEqual({
      productId: "c",
      quantity: 1,
    });
  });

  it("увеличава съществуващ, вместо да дублира", () => {
    const next = addLine(lines, "a", 3);
    expect(next).toHaveLength(2);
    expect(next.find((l) => l.productId === "a")?.quantity).toBe(5);
  });

  it("не мутира входа", () => {
    const before = structuredClone(lines);
    addLine(lines, "a", 1);
    expect(lines).toEqual(before);
  });

  it("игнорира невалидно количество", () => {
    expect(addLine(lines, "c", 0)).toEqual(lines);
    expect(addLine(lines, "c", -1)).toEqual(lines);
    expect(addLine(lines, "c", 1.5)).toEqual(lines);
  });

  it("хвърля при пълна количка, вместо да мълчи", () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({
      productId: `p${i}`,
      quantity: 1,
    }));
    expect(() => addLine(full, "нов", 1)).toThrow(/пълна/);
    // Но добавянето към съществуващ ред минава.
    expect(() => addLine(full, "p0", 1)).not.toThrow();
  });

  it("не пуска количество над тавана", () => {
    const next = addLine(lines, "a", MAX_QUANTITY_PER_LINE);
    expect(next.find((l) => l.productId === "a")?.quantity).toBe(
      MAX_QUANTITY_PER_LINE,
    );
  });
});

describe("removeLine и setQuantity", () => {
  it("маха ред", () => {
    expect(removeLine(lines, "a")).toEqual([{ productId: "b", quantity: 1 }]);
  });

  it("махането на несъществуващ ред не чупи нищо", () => {
    expect(removeLine(lines, "няма")).toEqual(lines);
  });

  it("сменя количеството", () => {
    expect(setQuantity(lines, "a", 7)).toContainEqual({
      productId: "a",
      quantity: 7,
    });
  });

  it("количество 0 маха реда", () => {
    expect(setQuantity(lines, "a", 0)).toEqual([{ productId: "b", quantity: 1 }]);
    expect(setQuantity(lines, "a", -3)).toEqual([
      { productId: "b", quantity: 1 },
    ]);
  });

  it("реже над тавана", () => {
    expect(setQuantity(lines, "a", 10_000)[0].quantity).toBe(
      MAX_QUANTITY_PER_LINE,
    );
  });
});

describe("mergeLines и countItems", () => {
  it("слива и брои", () => {
    expect(
      mergeLines([
        { productId: "a", quantity: 1 },
        { productId: "a", quantity: 2 },
        { productId: "b", quantity: 4 },
      ]),
    ).toEqual([
      { productId: "a", quantity: 3 },
      { productId: "b", quantity: 4 },
    ]);

    expect(countItems(lines)).toBe(3);
    expect(countItems([])).toBe(0);
  });
});
