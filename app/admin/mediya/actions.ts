"use server";

// АДМИН · медийната библиотека — действията, които пишат.
// Устроени като app/admin/materiali/actions.ts: requireAdmin() на всяко,
// redirect() ИЗВЪН try, обяснимите грешки — до полето.
//
// Качването минава през SERVER ACTION, не с presigned PUT от браузъра,
// по една причина: presigned PUT не може да се докаже без реален bucket
// (иска CORS политика на самия bucket, а изтекъл подпис връща 403 БЕЗ
// CORS заглавки — JavaScript вижда само „Failed to fetch"). Сървърното
// качване работи ДНЕС с локалния драйвер и ще проработи с R2 без промяна
// във формата. Браузърът смалява до 2560 px преди изпращане
// (components/admin/media-upload.tsx); лимитът на тялото е вдигнат в
// next.config.ts.

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
import { MEDIA_LIMITS } from "@/lib/admin/limits";
import {
  MediaGone,
  createMedia,
  deleteMedia,
  mediaUsage,
  parseMediaMetaForm,
  updateMediaMeta,
  usageCount,
} from "@/lib/admin/media";
import { slugify } from "@/lib/admin/slug";
import { readImageHeader, stripJpegMetadata } from "@/lib/media/image-header";
import { newObjectKey, putObject, remove, s3Configured } from "@/lib/storage";

/** Ключът се образува сам — сблъсък значи да се качи наново. */
const KEY_TAKEN = {
  file:
    "Този ключ вече се ползва от друг файл — качи снимката още веднъж, " +
    "ключът се образува наново всеки път.",
};

function explain(error: unknown, data: FormData): AdminFormState {
  const conflict = uniqueConflict(error, KEY_TAKEN);
  if (conflict) return invalid(data, CHECK_FIELDS, conflict);

  if (error instanceof MediaGone) {
    return invalid(
      data,
      "Файлът е бил изтрит, докато формата е стояла отворена.",
    );
  }

  console.error("[admin] Записът на медия се провали:", error);

  return invalid(
    data,
    "Записът не мина заради грешка в базата. Опитай пак след малко — " +
      "написаното е запазено във формата.",
  );
}

/** Разширението следва РАЗПОЗНАТИЯ тип, не името на файла — името лъже. */
const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function uploadMedia(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return invalid(data, CHECK_FIELDS, {
      file: "Избери файл — PNG, JPEG или WebP.",
    });
  }

  if (file.size > MEDIA_LIMITS.uploadBytes) {
    const mb = Math.round(MEDIA_LIMITS.uploadBytes / (1024 * 1024));
    return invalid(data, CHECK_FIELDS, {
      file:
        `Файлът е ${(file.size / (1024 * 1024)).toFixed(1)} MB, таванът е ` +
        `${mb} MB. С включен JavaScript браузърът смалява сам — пробвай ` +
        "пак, или смали снимката преди качване.",
    });
  }

  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());

  // Решава СЪДЪРЖАНИЕТО, не декларираният mimeType и не разширението:
  // клиентът лъже, а media е публично четим scope.
  const header = readImageHeader(bytes);
  if (!header) {
    return invalid(data, CHECK_FIELDS, {
      file:
        "Файлът не е PNG, JPEG или WebP. Снимка от iPhone (HEIC) се " +
        "записва като JPEG от приложението Снимки: Файл → Експортирай.",
    });
  }

  // EXIF се маха СЪРВЪРНО — гаранцията важи и при изключен JavaScript:
  // GPS координатите от телефона не влизат в публично четим bucket.
  if (header.mimeType === "image/jpeg") {
    bytes = stripJpegMetadata(bytes);
  }

  const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "kartinka";
  const key = newObjectKey("media", baseName, EXTENSION[header.mimeType]);

  let createdId: string;

  try {
    const stored = await putObject("media", key, bytes, header.mimeType);

    createdId = (
      await createMedia(
        {
          key,
          bucket: s3Configured() ? String(process.env.S3_BUCKET) : "local",
          mimeType: header.mimeType,
          sizeBytes: bytes.length,
          width: header.width,
          height: header.height,
          checksum: stored.checksum ?? null,
          uploadedById: admin.id,
        },
        await auditMeta(admin),
      )
    ).id;
  } catch (error) {
    return explain(error, data);
  }

  redirect(`/admin/mediya/${createdId}?kachen=1`);
}

export async function saveMediaMeta(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = parseMediaMetaForm(data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва файл за редакция.");

  try {
    await updateMediaMeta(id, parsed.value, await auditMeta(admin));
  } catch (error) {
    return explain(error, data);
  }

  revalidatePath("/admin/mediya/[id]", "page");
  revalidatePath("/admin/mediya");

  return { status: "success", message: "Промените са записани." };
}

export async function removeMedia(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва файл за изтриване.");

  if (data.get("confirm") === null) {
    return invalid(data, "Отметни потвърждението, за да се изтрие файлът.", {
      confirm: "Без тази отметка файлът не се изтрива.",
    });
  }

  // Проверката „ползва ли се" е и в СЪРВЪРА, не само в екрана: формата
  // може да е стояла отворена, докато някой закача корицата.
  try {
    const usage = await mediaUsage(id);
    if (usageCount(usage) > 0) {
      return invalid(
        data,
        "Файлът е закачен като корица — махни го оттам и опитай пак.",
      );
    }

    const { key } = await deleteMedia(id, await auditMeta(admin));

    // Самият обект се трие СЛЕД успешната транзакция: вътре в нея не
    // бива — провали ли се следата, редът се връща, а файлът вече го
    // няма. Обратният ред оставя най-много обект-сирак в хранилището,
    // което е поносимо; счупена връзка на публична страница не е.
    await remove(key);
  } catch (error) {
    return explain(error, data);
  }

  redirect("/admin/mediya?iztrit=1");
}
