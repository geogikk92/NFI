"use server";

// АДМИН · безплатните материали — действията, които пишат.
// Устроени като app/admin/produkti/actions.ts: requireAdmin() на всяко,
// redirect() ИЗВЪН try, уникалният slug се обяснява до полето.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { auditMeta } from "@/lib/admin/audit";
import {
  type AdminFormState,
  CHECK_FIELDS,
  invalid,
  uniqueConflict,
} from "@/lib/admin/form";
import {
  MaterialGone,
  createMaterial,
  deleteMaterial,
  parseMaterialForm,
  setMaterialPublished,
  updateMaterial,
} from "@/lib/admin/materials";
import { slugify } from "@/lib/admin/slug";
import { newObjectKey, putObject } from "@/lib/storage";

const SLUG_TAKEN = {
  slug:
    "Този адрес вече се ползва от друг материал. Избери друг — адресът е " +
    "част от връзката към страницата и не може да се повтаря.",
};

function explain(error: unknown, data: FormData): AdminFormState {
  const conflict = uniqueConflict(error, SLUG_TAKEN);
  if (conflict) return invalid(data, CHECK_FIELDS, conflict);

  if (error instanceof MaterialGone) {
    return invalid(
      data,
      "Материалът е бил изтрит, докато формата е стояла отворена. " +
        "Копирай написаното и го създай наново.",
    );
  }

  console.error("[admin] Записът на материал се провали:", error);

  return invalid(
    data,
    "Записът не мина заради грешка в базата. Опитай пак след малко — " +
      "написаното е запазено във формата.",
  );
}

/**
 * Разпознава файла ПО СЪДЪРЖАНИЕ — името и деклариният тип лъжат.
 * Приема се точно това, което материалите доставят: PDF и MP3.
 */
function sniffMaterialFile(
  bytes: Uint8Array,
): { mimeType: string; extension: string } | null {
  if (bytes.length > 4 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-") {
    return { mimeType: "application/pdf", extension: "pdf" };
  }

  // MP3: или ID3 етикет, или директно MPEG frame sync (11 единични бита).
  const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const frameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  if (bytes.length > 3 && (id3 || frameSync)) {
    return { mimeType: "audio/mpeg", extension: "mp3" };
  }

  return null;
}

export async function saveMaterial(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  // Качването е ПРЕДИ разбора: успее ли, ключът влиза във FormData и
  // разборът го вижда като попълнено поле — една проверка за двата пътя
  // (качен файл и ръчен ключ). Провали ли се разборът СЛЕД качването,
  // остава обект-сирак в хранилището — поносимо; загубен файл не е.
  const file = data.get("storageFile");
  if (file instanceof File && file.size > 0) {
    const bytes = new Uint8Array(await file.arrayBuffer());

    const sniffed = sniffMaterialFile(bytes);
    if (!sniffed) {
      return invalid(data, CHECK_FIELDS, {
        storageFile:
          "Файлът не е PDF или MP3 — материалите доставят точно тези два " +
          "вида. Провери дали е избран правилният файл.",
      });
    }

    // Scope "product", НЕ "media": материалите са зад форма за контакт и
    // се свалят с DownloadGrant токен, а всичко под media/ е ПУБЛИЧНО.
    const base =
      slugify(String(data.get("slug") ?? "").trim()) ||
      slugify(file.name.replace(/\.[^.]+$/, "")) ||
      "material";
    const key = newObjectKey("product", base, sniffed.extension);

    try {
      await putObject("product", key, bytes, sniffed.mimeType);
    } catch (error) {
      console.error("[admin] Качването на файл за материал се провали:", error);
      return invalid(data, CHECK_FIELDS, {
        storageFile: "Качването не мина. Опитай пак след малко.",
      });
    }

    data.set("storageKey", key);
  }

  const parsed = parseMaterialForm(data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  const id = String(data.get("id") ?? "").trim();
  const meta = await auditMeta(admin);

  let createdId: string | null = null;

  try {
    if (id) {
      await updateMaterial(id, parsed.value, meta);
    } else {
      createdId = (await createMaterial(parsed.value, meta)).id;
    }
  } catch (error) {
    return explain(error, data);
  }

  if (createdId) {
    redirect(`/admin/materiali/${createdId}?sazdaden=1`);
  }

  revalidatePath("/admin/materiali/[id]", "page");
  revalidatePath("/admin/materiali");

  return { status: "success", message: "Промените са записани." };
}

export async function toggleMaterialPublished(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  const next = data.get("published") === "1";

  if (!id) redirect("/admin/materiali");

  try {
    await setMaterialPublished(id, next, await auditMeta(admin));
  } catch (error) {
    if (error instanceof MaterialGone) {
      redirect("/admin/materiali?greshka=nyama");
    }
    console.error("[admin] Публикуването на материал се провали:", error);
    redirect("/admin/materiali?greshka=baza");
  }

  redirect(next ? "/admin/materiali?publikuvan=1" : "/admin/materiali?skrit=1");
}

export async function removeMaterial(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва материал за изтриване.");

  if (data.get("confirm") === null) {
    return invalid(
      data,
      "Отметни потвърждението, за да се изтрие материалът.",
      { confirm: "Без тази отметка материалът не се изтрива." },
    );
  }

  try {
    await deleteMaterial(id, await auditMeta(admin));
  } catch (error) {
    return explain(error, data);
  }

  redirect("/admin/materiali?iztrit=1");
}
