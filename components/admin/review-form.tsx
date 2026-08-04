"use client";

// АДМИН · формата за отзив.
//
// Оценката е падащо меню с цели звезди, не свободно число: половинки
// нито се въвеждат, нито се рисуват на публичната страница, а „4,7"
// въведено на ръка би дало средна оценка, която никой не може да обясни.

import { useActionState, useState } from "react";
import {
  CheckboxField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";

export interface ReviewFormValues {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  locale: string;
  courseId: string | null;
  published: boolean;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  courses: readonly { value: string; label: string }[];
  review?: ReviewFormValues;
}

const RATINGS = [5, 4, 3, 2, 1].map((value) => ({
  value: String(value),
  label: `${"★".repeat(value)}${"☆".repeat(5 - value)}  ${value} от 5`,
}));

const LOCALE_OPTIONS = [
  { value: "bg", label: "Български" },
  { value: "de", label: "Deutsch (немски)" },
  { value: "en", label: "English (английски)" },
];

export function ReviewForm({ action, courses, review }: Props) {
  const [state, formAction] = useActionState(action, IDLE);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  const [body, setBody] = useState(sent.body ?? review?.body ?? "");

  return (
    <form action={formAction} className="grid max-w-2xl gap-6" noValidate>
      <input type="hidden" name="id" value={review?.id ?? ""} />

      <TextField
        name="authorName"
        label="Име на автора"
        required
        defaultValue={sent.authorName ?? review?.authorName ?? ""}
        error={errors.authorName}
        hint="Както човекът е пожелал да се изпише: „Мария К.“ или пълното име."
      />

      <SelectField
        name="rating"
        label="Оценка"
        required
        options={RATINGS}
        defaultValue={sent.rating ?? String(review?.rating ?? 5)}
        error={errors.rating}
      />

      <TextareaField
        name="body"
        label="Текст на отзива"
        required
        rows={6}
        defaultValue={body}
        onValueChange={setBody}
        error={errors.body}
        hint={`Дословно, както е казан. Остават ${2000 - body.trim().length} знака.`}
      />

      <SelectField
        name="locale"
        label="Език"
        required
        options={LOCALE_OPTIONS}
        defaultValue={sent.locale ?? review?.locale ?? "bg"}
        error={errors.locale}
        hint="Отзивът се показва САМО на посетителите с този език — на другите езици не се превежда сам."
      />

      <SelectField
        name="courseId"
        label="Курс"
        options={courses}
        placeholder="— общ отзив (не се показва още) —"
        defaultValue={sent.courseId ?? review?.courseId ?? ""}
        error={errors.courseId}
        hint="Отзив за курс се показва на страницата му и влиза в средната оценка. Общият отзив засега само се пази — още няма място на сайта, където да излиза."
      />

      <CheckboxField
        name="published"
        label="Показвай отзива на сайта"
        defaultChecked={
          state.status === "error"
            ? sent.published === "on"
            : (review?.published ?? false)
        }
        error={errors.published}
        hint="Показва се на страницата на курса, на избрания по-горе език, и влиза в средната оценка, която Google чете."
      />

      <FormStatus state={state} />

      <div>
        <SubmitButton pendingLabel="Записва се…">
          {review ? "Запази промените" : "Добави отзива"}
        </SubmitButton>
      </div>
    </form>
  );
}
