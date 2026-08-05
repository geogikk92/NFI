"use client";

// АДМИН · формата на един файл — описанията за екранен четец и заглавие.
//
// Ключът, типът и размерите НЕ са полета: раждат се при качването от
// самия файл и после не се редактират — ключът е адресът в bucket-а и
// смяната му не мести обекта, а само чупи всяка вече издадена връзка.
// Показват се в <dl> на страницата, не тук.

import { useActionState } from "react";
import { TextField, TextareaField } from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";
import { MEDIA_LIMITS } from "@/lib/admin/limits";

/** Собствен тип, не внесен от server-only модула — виж course-form.tsx. */
export interface MediaFormValues {
  id: string;
  alt: string | null;
  altDe: string | null;
  title: string | null;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  media: MediaFormValues;
}

export function MediaForm({ action, media }: Props) {
  const [state, formAction] = useActionState(action, IDLE);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="id" value={media.id} />

      <FormStatus state={state} />

      <TextField
        name="title"
        label="Заглавие"
        defaultValue={sent.title ?? media.title ?? ""}
        error={errors.title}
        hint={`Как се казва файлът в списъка — „Василена пред дъската“, не IMG_4032. До ${MEDIA_LIMITS.title} знака.`}
      />

      <TextareaField
        name="alt"
        label="Описание за екранен четец (български)"
        defaultValue={sent.alt ?? media.alt ?? ""}
        error={errors.alt}
        rows={2}
        hint={`Едно изречение: какво се вижда на снимката. Чете се на глас от екранните четци. До ${MEDIA_LIMITS.alt} знака.`}
      />

      <TextareaField
        name="altDe"
        label="Описание за екранен четец (немски)"
        defaultValue={sent.altDe ?? media.altDe ?? ""}
        error={errors.altDe}
        rows={2}
        hint={`Същото изречение на немски — сайтът е двуезичен и четецът на немската страница чете това. До ${MEDIA_LIMITS.alt} знака.`}
      />

      <div>
        <SubmitButton>Запази промените</SubmitButton>
      </div>
    </form>
  );
}
