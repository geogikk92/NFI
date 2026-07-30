"use server";

// ТЕРИТОРИЯ НА БОБИ · задача 2c.
// Писано от Жоро, докато Боби е в отпуск.

import { revalidatePath } from "next/cache";
import {
  acceptAll,
  acceptCategory,
  rejectAll,
  saveSelection,
  type ConsentCategory,
} from "@/lib/consent";
import { readConsent, writeConsent } from "@/lib/consent-cookie";

/**
 * Включва САМО поисканата категория и запазва останалите избори.
 *
 * Ползва се от ConsentGate. Едно „зареди това видео" не бива да включва
 * статистиката — съгласието по GDPR е конкретно за целта.
 */
export async function acceptConsentCategory(
  formData: FormData,
): Promise<void> {
  const raw = formData.get("category");
  const category: ConsentCategory | null =
    raw === "functional" || raw === "analytics" ? raw : null;

  if (!category) return;

  const current = await readConsent();
  await writeConsent(acceptCategory(current, category, new Date()));
  revalidatePath("/", "layout");
}

export async function acceptAllCookies(): Promise<void> {
  await writeConsent(acceptAll(new Date()));
  revalidatePath("/", "layout");
}

export async function rejectAllCookies(): Promise<void> {
  await writeConsent(rejectAll(new Date()));
  revalidatePath("/", "layout");
}

export async function saveCookieSelection(formData: FormData): Promise<void> {
  await writeConsent(
    saveSelection(
      {
        // Отсъстващо поле в FormData значи изключен превключвател.
        functional: formData.get("functional") === "on",
        analytics: formData.get("analytics") === "on",
      },
      new Date(),
    ),
  );
  revalidatePath("/", "layout");
}
