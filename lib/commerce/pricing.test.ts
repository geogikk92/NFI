import { describe, expect, it } from "vitest";
import {
  checkDiscount,
  findShippingZone,
  isCheckoutable,
  priceCart,
  type CatalogProduct,
  type DiscountRule,
  type ShippingRule,
} from "./pricing";

const NOW = new Date("2026-07-29T12:00:00Z");

const pdf: CatalogProduct = {
  id: "p-pdf",
  title: "Работна тетрадка A1 (PDF)",
  kind: "DIGITAL",
  priceCents: 1200,
  vatCategory: "electronic",
  weightGrams: null,
  stock: null,
  published: true,
};

const book: CatalogProduct = {
  id: "p-book",
  title: "Учебник A1",
  kind: "PHYSICAL",
  priceCents: 2800,
  vatCategory: "goods",
  weightGrams: 450,
  stock: 25,
  published: true,
};

const catalog = [pdf, book];

const zones: ShippingRule[] = [
  {
    name: "Германия",
    countries: ["DE"],
    priceCents: 490,
    freeAboveCents: 5000,
    maxWeightGrams: 5000,
    active: true,
  },
  {
    name: "България",
    countries: ["BG"],
    priceCents: 590,
    freeAboveCents: null,
    maxWeightGrams: 5000,
    active: true,
  },
];

const base = {
  countryCode: "DE",
  ossThresholdExceeded: false,
  shippingRules: zones,
  now: NOW,
};

describe("priceCart · основи", () => {
  it("смята един дигитален ред", () => {
    const cart = priceCart(catalog, [{ productId: "p-pdf", quantity: 1 }], base);

    expect(cart.problems).toEqual([]);
    expect(cart.subtotalCents).toBe(1200);
    expect(cart.shippingCents).toBe(0);
    expect(cart.requiresShipping).toBe(false);
    expect(cart.totalCents).toBe(1200);
    // Под прага → българска ставка 20%: 1200 бруто → 200 ДДС
    expect(cart.vatCents).toBe(200);
    expect(isCheckoutable(cart)).toBe(true);
  });

  it("умножава по количество", () => {
    const cart = priceCart(catalog, [{ productId: "p-pdf", quantity: 3 }], base);
    expect(cart.subtotalCents).toBe(3600);
    expect(cart.lines[0].quantity).toBe(3);
  });

  it("слива един и същ продукт, добавен два пъти", () => {
    // Иначе фактурата получава два реда с еднакво заглавие.
    const cart = priceCart(
      catalog,
      [
        { productId: "p-pdf", quantity: 1 },
        { productId: "p-pdf", quantity: 2 },
      ],
      base,
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(3);
    expect(cart.subtotalCents).toBe(3600);
  });

  it("ИНВАРИАНТ: сборът на редовете плюс доставката дава общата сума", () => {
    const cart = priceCart(
      catalog,
      [
        { productId: "p-pdf", quantity: 2 },
        { productId: "p-book", quantity: 1 },
      ],
      base,
    );
    const linesSum = cart.lines.reduce((a, l) => a + l.netOfDiscountCents, 0);
    expect(linesSum + cart.shippingCents).toBe(cart.totalCents);
  });
});

describe("priceCart · цената идва от сървъра", () => {
  it("не приема цена от клиента — входът има само id и количество", () => {
    // Типът CartItemInput няма поле за цена. Тестът пази това свойство:
    // ако някой добави priceCents във входа, тук трябва да се спре.
    const sneaky = { productId: "p-book", quantity: 1, priceCents: 1 } as never;
    const cart = priceCart(catalog, [sneaky], base);
    expect(cart.lines[0].unitPriceCents).toBe(2800);
  });

  it("отказва непознат продукт", () => {
    const cart = priceCart(catalog, [{ productId: "измислен", quantity: 1 }], base);
    expect(cart.problems[0].code).toBe("UNKNOWN_PRODUCT");
    expect(isCheckoutable(cart)).toBe(false);
  });

  it("отказва непубликуван продукт", () => {
    const hidden = { ...book, id: "p-hidden", published: false };
    const cart = priceCart(
      [...catalog, hidden],
      [{ productId: "p-hidden", quantity: 1 }],
      base,
    );
    expect(cart.problems[0].code).toBe("UNPUBLISHED");
  });

  it("отказва количество над наличността", () => {
    const cart = priceCart(catalog, [{ productId: "p-book", quantity: 99 }], base);
    expect(cart.problems[0].code).toBe("OUT_OF_STOCK");
  });

  it("отказва нецяло и неположително количество", () => {
    for (const quantity of [0, -1, 1.5, Number.NaN]) {
      const cart = priceCart(catalog, [{ productId: "p-pdf", quantity }], base);
      expect(cart.problems.some((p) => p.code === "INVALID_QUANTITY")).toBe(true);
    }
  });

  it("празната количка не е платима", () => {
    const cart = priceCart(catalog, [], base);
    expect(cart.problems[0].code).toBe("EMPTY");
    expect(isCheckoutable(cart)).toBe(false);
    expect(cart.totalCents).toBe(0);
  });
});

describe("priceCart · ДДС", () => {
  it("под OSS прага всичко е с българска ставка", () => {
    const cart = priceCart(catalog, [{ productId: "p-book", quantity: 1 }], base);
    expect(cart.lines[0].vatRate).toBe(20);
  });

  it("над прага стоките следват държавата на купувача", () => {
    const cart = priceCart(catalog, [{ productId: "p-book", quantity: 1 }], {
      ...base,
      ossThresholdExceeded: true,
    });
    expect(cart.lines[0].vatRate).toBe(19);
    // 2800 бруто при 19% → 447 ДДС
    expect(cart.lines[0].vatCents).toBe(447);
  });

  it("ДДС-то е СЪДЪРЖАЩО се, не добавено отгоре", () => {
    // PAngV: цената към потребителя е с включено ДДС.
    const cart = priceCart(catalog, [{ productId: "p-pdf", quantity: 1 }], base);
    expect(cart.totalCents).toBe(1200);
    expect(cart.vatCents).toBeLessThan(cart.totalCents);
  });
});

describe("priceCart · отстъпки", () => {
  const tenPercent: DiscountRule = {
    code: "WILLKOMMEN10",
    kind: "PERCENT",
    value: 10,
    minOrderCents: 2000,
    maxRedemptions: 100,
    redemptions: 0,
    startsAt: null,
    endsAt: null,
    active: true,
  };

  it("прилага процентна отстъпка", () => {
    const cart = priceCart(catalog, [{ productId: "p-book", quantity: 1 }], {
      ...base,
      discount: tenPercent,
    });
    expect(cart.discountCents).toBe(280);
    expect(cart.appliedDiscountCode).toBe("WILLKOMMEN10");
    expect(cart.totalCents).toBe(2800 - 280 + 490);
  });

  it("ИНВАРИАНТ: отстъпката по редове дава точно общата отстъпка", () => {
    const cart = priceCart(
      catalog,
      [
        { productId: "p-pdf", quantity: 3 },
        { productId: "p-book", quantity: 2 },
      ],
      { ...base, discount: tenPercent },
    );
    const perLine = cart.lines.reduce((a, l) => a + l.discountCents, 0);
    expect(perLine).toBe(cart.discountCents);
  });

  it("никой ред не получава отстъпка над стойността си", () => {
    const huge: DiscountRule = { ...tenPercent, kind: "FIXED", value: 999_999 };
    const cart = priceCart(
      catalog,
      [
        { productId: "p-pdf", quantity: 1 },
        { productId: "p-book", quantity: 1 },
      ],
      { ...base, discount: huge },
    );
    for (const line of cart.lines) {
      expect(line.discountCents).toBeLessThanOrEqual(line.grossCents);
      expect(line.netOfDiscountCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("отказва код под минималната сума и не тегли пари", () => {
    const cart = priceCart(catalog, [{ productId: "p-pdf", quantity: 1 }], {
      ...base,
      discount: tenPercent, // minOrder 2000, количката е 1200
    });
    expect(cart.problems.some((p) => p.code === "DISCOUNT_INVALID")).toBe(true);
    expect(cart.discountCents).toBe(0);
    expect(cart.appliedDiscountCode).toBeNull();
  });

  it("отказва изчерпан и изтекъл код", () => {
    expect(
      checkDiscount({ ...tenPercent, redemptions: 100 }, 10_000, NOW),
    ).toMatch(/изчерпан/);
    expect(
      checkDiscount(
        { ...tenPercent, endsAt: new Date("2026-01-01T00:00:00Z") },
        10_000,
        NOW,
      ),
    ).toMatch(/изтекъл/);
    expect(
      checkDiscount(
        { ...tenPercent, startsAt: new Date("2027-01-01T00:00:00Z") },
        10_000,
        NOW,
      ),
    ).toMatch(/още не важи/);
    expect(checkDiscount({ ...tenPercent, active: false }, 10_000, NOW)).toMatch(
      /деактивиран/,
    );
  });

  it("валиден код не връща причина", () => {
    expect(checkDiscount(tenPercent, 10_000, NOW)).toBeNull();
  });
});

describe("priceCart · доставка", () => {
  it("дигиталните продукти не изискват доставка", () => {
    const cart = priceCart(catalog, [{ productId: "p-pdf", quantity: 5 }], base);
    expect(cart.requiresShipping).toBe(false);
    expect(cart.shippingCents).toBe(0);
    expect(cart.totalWeightGrams).toBe(0);
  });

  it("физическите изискват и се таксуват по зона", () => {
    const cart = priceCart(catalog, [{ productId: "p-book", quantity: 1 }], base);
    expect(cart.requiresShipping).toBe(true);
    expect(cart.shippingCents).toBe(490);
    expect(cart.totalWeightGrams).toBe(450);
  });

  it("доставката е безплатна над прага на зоната", () => {
    // 2 × 2800 = 5600 ≥ 5000
    const cart = priceCart(catalog, [{ productId: "p-book", quantity: 2 }], base);
    expect(cart.shippingCents).toBe(0);
  });

  it("прагът за безплатна доставка се мери СЛЕД отстъпката", () => {
    // 5600 - 10% = 5040, още над 5000 → безплатно
    const justAbove = priceCart(catalog, [{ productId: "p-book", quantity: 2 }], {
      ...base,
      discount: {
        code: "X",
        kind: "PERCENT",
        value: 10,
        minOrderCents: null,
        maxRedemptions: null,
        redemptions: 0,
        startsAt: null,
        endsAt: null,
        active: true,
      },
    });
    expect(justAbove.shippingCents).toBe(0);

    // 5600 - 20% = 4480, вече под 5000 → плаща се
    const justBelow = priceCart(catalog, [{ productId: "p-book", quantity: 2 }], {
      ...base,
      discount: {
        code: "X",
        kind: "PERCENT",
        value: 20,
        minOrderCents: null,
        maxRedemptions: null,
        redemptions: 0,
        startsAt: null,
        endsAt: null,
        active: true,
      },
    });
    expect(justBelow.shippingCents).toBe(490);
  });

  it("отказва при липсваща зона", () => {
    const cart = priceCart(catalog, [{ productId: "p-book", quantity: 1 }], {
      ...base,
      countryCode: "AT", // поддържана за ДДС, но няма зона в теста
    });
    expect(cart.problems.some((p) => p.code === "NO_SHIPPING_ZONE")).toBe(true);
    expect(isCheckoutable(cart)).toBe(false);
  });

  it("отказва пратка над допустимото тегло", () => {
    const heavy = { ...book, id: "p-heavy", weightGrams: 6000, stock: 10 };
    const cart = priceCart(
      [...catalog, heavy],
      [{ productId: "p-heavy", quantity: 1 }],
      base,
    );
    expect(cart.problems.some((p) => p.code === "TOO_HEAVY")).toBe(true);
  });

  it("ДДС-то на доставката влиза в общото ДДС", () => {
    const withShipping = priceCart(
      catalog,
      [{ productId: "p-book", quantity: 1 }],
      base,
    );
    const lineVat = withShipping.lines[0].vatCents;
    expect(withShipping.vatCents).toBeGreaterThan(lineVat);
  });

  it("непозната държава се отхвърля", () => {
    const cart = priceCart(catalog, [{ productId: "p-pdf", quantity: 1 }], {
      ...base,
      countryCode: "US",
    });
    expect(cart.problems.some((p) => p.code === "UNSUPPORTED_COUNTRY")).toBe(true);
  });
});

describe("findShippingZone", () => {
  it("намира зоната по държава, независимо от регистъра", () => {
    expect(findShippingZone(zones, "de")?.name).toBe("Германия");
    expect(findShippingZone(zones, "BG")?.name).toBe("България");
    expect(findShippingZone(zones, "FR")).toBeNull();
  });

  it("пропуска изключените зони", () => {
    const disabled = zones.map((z) => ({ ...z, active: false }));
    expect(findShippingZone(disabled, "DE")).toBeNull();
  });
});

describe("задънената улица в количката", () => {
  // Спрян от продажба продукт изчезва от `lines`, тоест за него няма ред и
  // няма бутон „Премахни". Страницата може да предложи изход САМО ако
  // проблемът носи productId. Тези тестове пазят точно този договор.

  const spryan: CatalogProduct = { ...pdf, id: "p-spryan", published: false };

  it("проблемът за спрян продукт носи productId", () => {
    const cart = priceCart(
      [spryan],
      [{ productId: "p-spryan", quantity: 1 }],
      base,
    );

    const problem = cart.problems.find((p) => p.code === "UNPUBLISHED");
    expect(problem).toBeDefined();
    expect(problem && "productId" in problem && problem.productId).toBe(
      "p-spryan",
    );
  });

  it("спрян продукт НЕ се появява в редовете", () => {
    const cart = priceCart(
      [spryan],
      [{ productId: "p-spryan", quantity: 1 }],
      base,
    );
    expect(cart.lines).toHaveLength(0);
  });

  it("отпаднат ли ВСИЧКИ редове, проблемите оцеляват", () => {
    // Тук беше най-лошото: страницата гледаше lines.length === 0 и
    // рендираше „количката е празна" — при пълна количка. Проблемите
    // трябва да преживеят връщането на празната количка, иначе човекът
    // няма нито обяснение, нито изход.
    const cart = priceCart(
      [spryan],
      [{ productId: "p-spryan", quantity: 1 }],
      base,
    );

    expect(cart.lines).toHaveLength(0);
    expect(cart.problems.length).toBeGreaterThan(0);
    expect(cart.problems.some((p) => p.code === "EMPTY")).toBe(false);
  });

  it("непознат продукт също носи productId", () => {
    // Изтрит от базата продукт, останал в бисквитката отпреди месец.
    const cart = priceCart([], [{ productId: "p-nyama", quantity: 1 }], base);

    const problem = cart.problems.find((p) => p.code === "UNKNOWN_PRODUCT");
    expect(problem && "productId" in problem && problem.productId).toBe(
      "p-nyama",
    );
  });

  it("изчерпан продукт носи productId и количката не се плаща", () => {
    const izcherpan: CatalogProduct = { ...book, id: "p-nula", stock: 0 };
    const cart = priceCart(
      [izcherpan],
      [{ productId: "p-nula", quantity: 1 }],
      base,
    );

    const problem = cart.problems.find((p) => p.code === "OUT_OF_STOCK");
    expect(problem && "productId" in problem && problem.productId).toBe(
      "p-nula",
    );
    expect(isCheckoutable(cart)).toBe(false);
  });
});
