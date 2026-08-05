"use client";

// АДМИН · качване на изображение.
//
// Клиентски е заради две неща и нищо друго:
//   1. СМАЛЯВАНЕТО: снимка от телефон е 4000+ px и 8+ MB — canvas я
//      свежда до 2560 px по дългата страна преди изпращане. Това е
//      ПОДОБРЕНИЕ, не гаранция: с изключен JavaScript файлът тръгва цял
//      и сървърът го проверява пак (магически байтове, таван на
//      размера, махане на EXIF). Прекодирането през canvas има и
//      страничен ефект, на който се разчита: canvas НЕ пренася EXIF.
//   2. ПРЕГЛЕДЪТ: човек вижда какво е избрал, преди да натисне „Качи".
//
// Формата пак работи без JavaScript — действието е server action.

import { useActionState, useRef, useState } from "react";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";

/**
 * Максимална дълга страна след смаляването. Съгласувано с коментара в
 * lib/admin/limits.ts: /_next/image дърпа оригинала при всеки cache
 * miss, по веднъж на ширина — 2560 px покрива и най-широкия дисплей от
 * deviceSizes, без да плаща за 4000.
 */
const MAX_SIDE = 2560;

/** Над този размер JPEG се прекодира дори да е в границите по пиксели. */
const RECODE_OVER_BYTES = 3 * 1024 * 1024;

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
}

export function MediaUpload({ action }: Props) {
  const [state, formAction] = useActionState(action, IDLE);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const errors = state.fieldErrors ?? {};

  async function onFileChosen(input: HTMLInputElement) {
    const file = input.files?.[0];

    if (preview) URL.revokeObjectURL(preview);
    setNote(null);

    if (!file) {
      setPreview(null);
      return;
    }

    const shrunk = await shrinkIfNeeded(file);
    if (shrunk && input.files) {
      // Смаленият файл ЗАМЕСТВА избрания в самото поле — така формата
      // изпраща него по обичайния път, без fetch и без скрити полета.
      const transfer = new DataTransfer();
      transfer.items.add(shrunk);
      input.files = transfer.files;
      setNote(
        `Снимката е смалена преди качване: ${formatMb(file.size)} → ` +
          `${formatMb(shrunk.size)}.`,
      );
    }

    setPreview(URL.createObjectURL(input.files?.[0] ?? file));
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <FormStatus state={state} />

      <div className="grid gap-2">
        <label htmlFor="media-file" className="text-sm font-medium">
          Файл{" "}
          <span aria-hidden className="text-destructive">
            *
          </span>
          <span className="sr-only">(задължително)</span>
        </label>
        <input
          ref={fileRef}
          id="media-file"
          name="file"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp"
          aria-describedby={errors.file ? "media-file-error" : "media-file-hint"}
          aria-invalid={errors.file ? true : undefined}
          className="rounded-lg border border-input bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
          onChange={(event) => void onFileChosen(event.currentTarget)}
        />
        {errors.file ? (
          <p id="media-file-error" className="text-sm text-destructive">
            {errors.file}
          </p>
        ) : (
          <p id="media-file-hint" className="text-sm text-muted-foreground">
            PNG, JPEG или WebP. Снимка от iPhone (HEIC) първо се записва
            като JPEG.
          </p>
        )}
      </div>

      {preview ? (
        // Прегледът е <img>, не next/image: адресът е blob: в паметта на
        // браузъра и оптимизаторът няма какво да оптимизира.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Преглед на избраната снимка"
          className="max-h-64 w-fit rounded-lg border border-border"
        />
      ) : null}

      {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}

      <div>
        <SubmitButton pendingLabel="Качва се…">Качи файла</SubmitButton>
      </div>
    </form>
  );
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Смалява през canvas, когато има защо. Връща null, когато оригиналът
 * е добре както си е — прекодиране без нужда само влошава качеството.
 * PNG се пази PNG (прозрачността оцелява), другото излиза JPEG.
 */
async function shrinkIfNeeded(file: File): Promise<File | null> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Счупен или лъжлив файл — сървърът ще го обясни; тук не се гадае.
    return null;
  }

  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    const needsResize = longSide > MAX_SIDE;
    const needsRecode = file.type === "image/jpeg" && file.size > RECODE_OVER_BYTES;
    if (!needsResize && !needsRecode) return null;

    const scale = needsResize ? MAX_SIDE / longSide : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(bitmap, 0, 0, width, height);

    const keepPng = file.type === "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(
        resolve,
        keepPng ? "image/png" : "image/jpeg",
        keepPng ? undefined : 0.85,
      ),
    );
    if (!blob || blob.size >= file.size) return null;

    const newName = file.name.replace(/\.[^.]+$/, "") + (keepPng ? ".png" : ".jpg");
    return new File([blob], newName, { type: blob.type });
  } finally {
    bitmap.close();
  }
}
