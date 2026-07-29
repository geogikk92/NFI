"use server";

// ТЕРИТОРИЯ НА ЖОРО · задача M9 — действия по количката.
//
// Всяко действие приема САМО productId и количество. Цената никога не
// пресича границата клиент → сървър.
//
// Двойка функции на действие: едната връща резултат (за програмно
// ползване и за useActionState), другата е обвивка за `<form action>`,
// която React изисква да връща void. Формулярите работят и без JavaScript.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addLine, removeLine, setQuantity } from "@/lib/commerce/cart";
import { readCart, writeCart } from "@/lib/commerce/cart-cookie";

const productIdSchema = z.string().min(1).max(64);
const quantitySchema = z.coerce.number().int().min(0).max(99);

export type CartActionResult = { ok: true } | { ok: false; error: string };

export async function addToCart(formData: FormData): Promise<CartActionResult> {
  const productId = productIdSchema.safeParse(formData.get("productId"));
  const quantity = quantitySchema.safeParse(formData.get("quantity") ?? 1);

  if (!productId.success || !quantity.success || quantity.data < 1) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  try {
    const cart = await readCart();
    await writeCart(addLine(cart, productId.data, quantity.data));
  } catch {
    return { ok: false, error: "Der Warenkorb ist voll." };
  }

  revalidatePath("/warenkorb");
  return { ok: true };
}

export async function updateCartQuantity(
  formData: FormData,
): Promise<CartActionResult> {
  const productId = productIdSchema.safeParse(formData.get("productId"));
  const quantity = quantitySchema.safeParse(formData.get("quantity"));

  if (!productId.success || !quantity.success) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  const cart = await readCart();
  await writeCart(setQuantity(cart, productId.data, quantity.data));

  revalidatePath("/warenkorb");
  return { ok: true };
}

export async function removeFromCart(
  formData: FormData,
): Promise<CartActionResult> {
  const productId = productIdSchema.safeParse(formData.get("productId"));

  if (!productId.success) {
    return { ok: false, error: "Ungültige Anfrage." };
  }

  const cart = await readCart();
  await writeCart(removeLine(cart, productId.data));

  revalidatePath("/warenkorb");
  return { ok: true };
}

// ── Обвивки за `<form action>` ───────────────────────────────────────────
// Грешката се предава през адреса, за да се вижда и без JavaScript.

export async function addToCartForm(formData: FormData): Promise<void> {
  const result = await addToCart(formData);
  if (!result.ok) {
    redirect(`/warenkorb?fehler=${encodeURIComponent(result.error)}`);
  }
  redirect("/warenkorb");
}

export async function updateCartQuantityForm(formData: FormData): Promise<void> {
  const result = await updateCartQuantity(formData);
  if (!result.ok) {
    redirect(`/warenkorb?fehler=${encodeURIComponent(result.error)}`);
  }
}

export async function removeFromCartForm(formData: FormData): Promise<void> {
  const result = await removeFromCart(formData);
  if (!result.ok) {
    redirect(`/warenkorb?fehler=${encodeURIComponent(result.error)}`);
  }
}
