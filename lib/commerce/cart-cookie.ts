import "server-only";

// Достъпът до бисквитката. Отделен от cart.ts, за да остане логиката
// тестваема без Next контекст.

import { cookies } from "next/headers";
import {
  CART_COOKIE,
  CART_MAX_AGE_SECONDS,
  parseCart,
  serializeCart,
  type CartLine,
} from "./cart";

export async function readCart(): Promise<CartLine[]> {
  const store = await cookies();
  return parseCart(store.get(CART_COOKIE)?.value);
}

export async function writeCart(lines: readonly CartLine[]): Promise<void> {
  const store = await cookies();

  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }

  store.set(CART_COOKIE, serializeCart(lines), {
    // Количката не съдържа лични данни, но и няма причина JavaScript
    // да я чете — състоянието се рендира от сървъра.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_MAX_AGE_SECONDS,
  });
}
