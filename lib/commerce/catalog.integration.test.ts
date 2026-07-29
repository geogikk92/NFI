// Интеграционен тест на пътя база → сметка. Изисква сийднатa база:
//
//   npm run db:migrate && npm run db:seed && npm test
//
// Пропуска се тихо без DATABASE_URL.

import { afterAll, describe, expect, it } from "vitest";
import { db } from "../db";
import { getProductBySlug, listProducts, priceCartFromDb } from "./catalog";
import { isCheckoutable } from "./pricing";

const suite = process.env.DATABASE_URL ? describe : describe.skip;

suite("каталог срещу истинска база", () => {
  afterAll(async () => {
    await db.$disconnect();
  });

  it("връща само публикуваните продукти", async () => {
    const products = await listProducts();
    expect(products.length).toBeGreaterThan(0);
    for (const product of products) {
      expect(product.priceCents).toBeGreaterThan(0);
    }
  });

  it("намира продукт по slug", async () => {
    const product = await getProductBySlug("lehrbuch-a1");
    expect(product).not.toBeNull();
    expect(product?.type).toBe("PHYSICAL");
    expect(product?.priceCents).toBe(2800);
  });

  it("връща null за несъществуващ slug", async () => {
    expect(await getProductBySlug("няма-такъв")).toBeNull();
  });

  it("смята количка с дигитален и физически продукт", async () => {
    const [digital, physical] = await Promise.all([
      getProductBySlug("arbeitsheft-a1-pdf"),
      getProductBySlug("lehrbuch-a1"),
    ]);

    const cart = await priceCartFromDb({
      items: [
        { productId: digital!.id, quantity: 1 },
        { productId: physical!.id, quantity: 1 },
      ],
      countryCode: "DE",
    });

    expect(cart.problems).toEqual([]);
    expect(cart.subtotalCents).toBe(1200 + 2800);
    expect(cart.requiresShipping).toBe(true);
    expect(cart.shippingCents).toBe(490);
    expect(cart.totalCents).toBe(1200 + 2800 + 490);
    expect(isCheckoutable(cart)).toBe(true);
  });

  it("редът носи НЕМСКОТО заглавие — то отива и във фактурата", async () => {
    const physical = await getProductBySlug("lehrbuch-a1");
    const cart = await priceCartFromDb({
      items: [{ productId: physical!.id, quantity: 1 }],
      countryCode: "DE",
    });
    // Product.title е българското ("Учебник A1 (печатно издание)").
    expect(cart.lines[0].title).toBe("Lehrbuch A1 (gedruckt)");
  });

  it("дигитална поръчка не носи доставка", async () => {
    const digital = await getProductBySlug("arbeitsheft-a1-pdf");
    const cart = await priceCartFromDb({
      items: [{ productId: digital!.id, quantity: 2 }],
      countryCode: "DE",
    });

    expect(cart.requiresShipping).toBe(false);
    expect(cart.shippingCents).toBe(0);
    expect(cart.totalCents).toBe(2400);
  });

  it("прилага истински промокод от базата", async () => {
    const physical = await getProductBySlug("lehrbuch-a1");
    const cart = await priceCartFromDb({
      items: [{ productId: physical!.id, quantity: 1 }],
      countryCode: "DE",
      discountCode: "willkommen10", // нарочно с малки букви
    });

    expect(cart.appliedDiscountCode).toBe("WILLKOMMEN10");
    expect(cart.discountCents).toBe(280);
  });

  it("съобщава за несъществуващ промокод, вместо да мълчи", async () => {
    const physical = await getProductBySlug("lehrbuch-a1");
    const cart = await priceCartFromDb({
      items: [{ productId: physical!.id, quantity: 1 }],
      countryCode: "DE",
      discountCode: "НЯМАТАКЪВ",
    });

    expect(cart.problems.some((p) => p.code === "DISCOUNT_INVALID")).toBe(true);
    expect(cart.discountCents).toBe(0);
  });

  it("не вярва на цена, подадена отвън", async () => {
    const physical = await getProductBySlug("lehrbuch-a1");
    const cart = await priceCartFromDb({
      // Точно това би пратил злонамерен клиент.
      items: [
        { productId: physical!.id, quantity: 1, priceCents: 1 } as never,
      ],
      countryCode: "DE",
    });

    expect(cart.lines[0].unitPriceCents).toBe(2800);
    expect(cart.subtotalCents).toBe(2800);
  });

  it("не пипа базата при празна количка", async () => {
    const cart = await priceCartFromDb({ items: [], countryCode: "DE" });
    expect(cart.problems[0].code).toBe("EMPTY");
    expect(cart.totalCents).toBe(0);
  });

  it("ДДС-то следва държавата над OSS прага", async () => {
    const physical = await getProductBySlug("lehrbuch-a1");

    const under = await priceCartFromDb({
      items: [{ productId: physical!.id, quantity: 1 }],
      countryCode: "DE",
      ossThresholdExceeded: false,
    });
    const over = await priceCartFromDb({
      items: [{ productId: physical!.id, quantity: 1 }],
      countryCode: "DE",
      ossThresholdExceeded: true,
    });

    expect(under.lines[0].vatRate).toBe(20);
    expect(over.lines[0].vatRate).toBe(19);
    // Бруто цената не се мени — мени се колко ДДС се съдържа в нея.
    expect(under.lines[0].grossCents).toBe(over.lines[0].grossCents);
    expect(under.vatCents).not.toBe(over.vatCents);
  });
});
