"use server";

// ТЕРИТОРИЯ НА БОБИ · задача 2c.
// Писано от Жоро, докато Боби е в отпуск.

import { revalidatePath } from "next/cache";
import { acceptAll, rejectAll, saveSelection } from "@/lib/consent";
import { writeConsent } from "@/lib/consent-cookie";

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
