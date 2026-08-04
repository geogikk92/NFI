"use server";

// АДМИН · текстовете — действията, които пишат.
//
// Три действия и нито едно повече: запази черновата, публикувай, върни
// оригинала. Плюс включване и изключване на preview режима.
//
// Устроени по шаблона на app/admin/materiali/actions.ts: requireAdmin()
// на първия ред, redirect() ИЗВЪН try, грешките се обясняват до полето.

import { revalidatePath } from "next/cache";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { auditMeta } from "@/lib/admin/audit";
import { type AdminFormState, CHECK_FIELDS, invalid } from "@/lib/admin/form";
import { parseBlockForm } from "@/lib/admin/content-blocks";
import {
  discardBlockDraft,
  publishBlock,
  revertBlock,
  saveBlockDraft,
} from "@/lib/content/blocks-db";
import { PAGE_PATHS, blockSpec } from "@/lib/content/registry";

/**
 * Публикуваният текст се вижда веднага на трите езика.
 *
 * Днес публичните страници са напълно динамични (кореновият layout чете
 * глави), тоест кеш за ревалидиране няма. Извикването е предпазно: появи
 * ли се кеш утре, публикуването пак ще се вижда, вместо да изглежда като
 * „не се записа" и да я накара да натисне пак.
 */
function revalidateBlock(key: string): void {
  const spec = blockSpec(key);
  if (!spec) return;

  const path = PAGE_PATHS[spec.page];
  for (const locale of ["bg", "de", "en"]) {
    revalidatePath(`/${locale}${path}`);
  }
}

export async function saveDraftAction(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  await requireAdmin();

  const key = String(data.get("key") ?? "").trim();
  const spec = blockSpec(key);
  if (!spec) return invalid(data, "Непознат текст.");

  const parsed = parseBlockForm(spec, data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  try {
    await saveBlockDraft(key, parsed.value);
  } catch (error) {
    console.error("[admin] Черновата не се записа:", error);
    return invalid(
      data,
      "Черновата не се записа заради грешка в базата. Написаното е запазено във формата — опитай пак след малко.",
    );
  }

  return {
    status: "success",
    message:
      "Черновата е запазена. Тя още НЕ се вижда на сайта — натисни „Публикувай“, когато си готова.",
  };
}

export async function publishAction(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const key = String(data.get("key") ?? "").trim();
  const spec = blockSpec(key);
  if (!spec) return invalid(data, "Непознат текст.");

  const parsed = parseBlockForm(spec, data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  try {
    await publishBlock(key, parsed.value, await auditMeta(admin));
  } catch (error) {
    console.error("[admin] Текстът не се публикува:", error);
    return invalid(
      data,
      "Публикуването не мина заради грешка в базата. Написаното е запазено във формата — опитай пак след малко.",
    );
  }

  revalidateBlock(key);
  revalidatePath("/admin/tekstove");

  return {
    status: "success",
    message: "Готово — текстът вече се вижда на сайта.",
  };
}

export async function discardDraftAction(data: FormData): Promise<void> {
  await requireAdmin();

  const key = String(data.get("key") ?? "").trim();
  if (!key) redirect("/admin/tekstove");

  try {
    await discardBlockDraft(key);
  } catch (error) {
    console.error("[admin] Черновата не се изхвърли:", error);
    redirect(`/admin/tekstove/${key}?greshka=baza`);
  }

  redirect(`/admin/tekstove/${key}?chernova=izhvurlena`);
}

export async function revertAction(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const key = String(data.get("key") ?? "").trim();
  if (!key) redirect("/admin/tekstove");

  try {
    await revertBlock(key, await auditMeta(admin));
  } catch (error) {
    console.error("[admin] Връщането към оригинала се провали:", error);
    redirect(`/admin/tekstove/${key}?greshka=baza`);
  }

  revalidateBlock(key);
  redirect(`/admin/tekstove/${key}?vurnat=1`);
}

// ─────────────────────────────────────────────────────────────────────────
//  Preview режим
// ─────────────────────────────────────────────────────────────────────────
//
// Включва се от ТУК, с requireAdmin() на първия ред — не с подписан токен
// в адреса. Токен в адрес се препраща и черновата изтича; бисквитката на
// draftMode() е HttpOnly и остава в този браузър.

export async function enablePreview(data: FormData): Promise<void> {
  await requireAdmin();

  const key = String(data.get("key") ?? "").trim();
  const spec = blockSpec(key);

  (await draftMode()).enable();

  redirect(spec ? `/bg${PAGE_PATHS[spec.page]}` : "/bg");
}

export async function disablePreview(): Promise<void> {
  // БЕЗ requireAdmin(): изключването е безопасно за всеки и трябва да
  // работи дори когато сесията е изтекла — иначе човек остава заключен в
  // preview режим без начин да излезе.
  (await draftMode()).disable();
  redirect("/admin/tekstove");
}
