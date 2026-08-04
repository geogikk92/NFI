"use client";

// АДМИН · формата за издаване на сертификат.
//
// Издава се на РЕГИСТРИРАН курсист — по имейла на профила му. Изборът на
// курс предлага нивото си сам (key= пренасочва менюто), но админът може
// да го смени: човек може да е завършил B1 група в курс, воден като A2–B1.

import { useActionState, useState } from "react";
import { SelectField, TextField } from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";

export interface CourseChoice {
  value: string;
  label: string;
  level: string;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  courses: readonly CourseChoice[];
  levels: readonly { value: string; label: string }[];
  /** „2026-08-03" — днес по часовата зона на сайта, за полето по подразбиране. */
  today: string;
}

export function CertificateIssueForm({ action, courses, levels, today }: Props) {
  const [state, formAction] = useActionState(action, IDLE);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  const [courseId, setCourseId] = useState(sent.courseId ?? "");
  const chosenLevel =
    courses.find((course) => course.value === courseId)?.level ?? "";

  return (
    <form action={formAction} className="grid max-w-2xl gap-6" noValidate>
      <TextField
        name="email"
        label="Имейл на курсиста"
        required
        type="email"
        autoComplete="off"
        defaultValue={sent.email ?? ""}
        error={errors.email}
        hint="Имейлът, с който човекът е регистриран на сайта."
      />

      <TextField
        name="holderName"
        label="Име в сертификата"
        required
        defaultValue={sent.holderName ?? ""}
        error={errors.holderName}
        hint="Точно както трябва да се изпише в PDF документа — на латиница или кирилица, по желание на курсиста."
      />

      <SelectField
        name="courseId"
        label="Курс"
        required
        options={courses}
        placeholder="— избери курс —"
        defaultValue={sent.courseId ?? ""}
        onValueChange={setCourseId}
        error={errors.courseId}
      />

      <SelectField
        // Смяната на курса пренарежда менюто с неговото ниво; ръчен избор
        // след това пак е възможен. Изпратеното ниво тежи САМО докато
        // курсът е същият като в изпратената форма — смени ли човекът
        // курса след грешка, предложението пак идва от новия курс.
        key={courseId || "bez-kurs"}
        name="level"
        label="Ниво"
        required
        options={levels}
        placeholder="— избери ниво —"
        defaultValue={
          courseId === (sent.courseId ?? "")
            ? (sent.level ?? chosenLevel)
            : chosenLevel
        }
        error={errors.level}
        hint="Предложено от курса; смени го, ако групата е завършила друго ниво."
      />

      <TextField
        name="issuedAt"
        label="Дата на издаване"
        type="date"
        defaultValue={sent.issuedAt ?? today}
        error={errors.issuedAt}
        hint="За курс, завършил по-рано, сложи датата на завършването."
      />

      <FormStatus state={state} />

      <div>
        <SubmitButton pendingLabel="Издаваме…">Издай сертификата</SubmitButton>
      </div>
    </form>
  );
}
