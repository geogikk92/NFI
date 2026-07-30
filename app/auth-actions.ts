"use server";

// Изходът стои ТУК, а не до някоя страница, защото се вика от две места с
// различни оформления: страничната лента на админа и (по-късно) хедърът на
// публичния сайт. Два екземпляра на един и същ изход рано или късно се
// разминават — единият чисти реда в базата, другият само бисквитката.

import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth/session-db";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";

/**
 * Изход.
 *
 * Вика се САМО от `<form action={signOut}>`, никога от връзка. Изходът
 * променя състояние, а GET заявка не бива да променя състояние: изтегли ли
 * някой предварително такава връзка (антивирус, четец, Safari), човекът
 * излиза без да е поискал.
 */
export async function signOut(): Promise<never> {
  await destroySession();
  redirect(`/${DEFAULT_LOCALE}`);
}
