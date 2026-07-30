import "server-only";

import { cookies } from "next/headers";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  parseConsent,
  serializeConsent,
  type ConsentState,
} from "./consent";

export async function readConsent(): Promise<ConsentState> {
  const store = await cookies();
  return parseConsent(store.get(CONSENT_COOKIE)?.value);
}

export async function writeConsent(state: ConsentState): Promise<void> {
  const store = await cookies();

  store.set(CONSENT_COOKIE, serializeConsent(state), {
    // Не е httpOnly: скриптовете, които се гейтват, трябва да могат да
    // проверят решението, без да питат сървъра.
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONSENT_MAX_AGE_SECONDS,
  });
}
