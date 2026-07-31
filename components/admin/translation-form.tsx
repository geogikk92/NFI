"use client";

// АДМИН · прегледът на заявка за превод.
//
// Формата е малка нарочно: тук не се въвежда съдържание, а се взима
// решение. Четири полета — състояние, сума, срок на офертата, бележки.
//
// ДДС ставката НЕ се пита. Заверен превод има човешки труд, значи не е
// електронна услуга и се облага по седалището на доставчика, независимо
// къде е клиентът — стойността се смята в lib/admin/translations.ts от
// lib/legal. Поле за нея тук би позволило да се разминат.

import { useActionState, useState } from "react";
import {
  FieldGroup,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";
import { toDateInputValue } from "@/lib/admin/input";

export interface TranslationFormValues {
  id: string;
  status: string;
  quotedCents: number | null;
  quoteExpiresAt: Date | null;
  notes: string | null;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  statuses: readonly { value: string; label: string }[];
  /** Състоянията, при които офертата е задължителна. */
  quoteRequiredFor: readonly string[];
  /** Ставката, която ще влезе в офертата — показва се, не се редактира. */
  vatRate: number;
  request: TranslationFormValues;
}

function centsToInput(cents: number | null): string {
  if (cents === null) return "";
  const abs = Math.abs(cents);
  return `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

export function TranslationForm({
  action,
  statuses,
  quoteRequiredFor,
  vatRate,
  request,
}: Props) {
  const [state, formAction] = useActionState(action, IDLE);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  const [status, setStatus] = useState(sent.status ?? request.status);
  const quoteRequired = quoteRequiredFor.includes(status);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="id" value={request.id} />

      <FormStatus state={state} />

      <FieldGroup title="Състояние">
        <SelectField
          name="status"
          label="Докъде е стигнала заявката"
          required
          options={statuses}
          defaultValue={status}
          error={errors.status}
          onValueChange={setStatus}
          hint="Клиентът вижда състоянието на страницата за проследяване."
        />
      </FieldGroup>

      <FieldGroup
        title="Оферта"
        description={
          quoteRequired
            ? "Избраното състояние значи, че клиентът вече е видял оферта — сумата е задължителна."
            : "Попълва се след преглед на документите. Празна значи „още не е оценена“."
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="quoted"
            label="Сума"
            required={quoteRequired}
            inputMode="decimal"
            suffix="€"
            defaultValue={sent.quoted ?? centsToInput(request.quotedCents)}
            error={errors.quotedCents}
            hint={`С включено ДДС ${vatRate} %. Ставката се смята сама — заверен превод не минава през OSS.`}
          />

          <TextField
            name="quoteExpiresAt"
            label="Офертата важи до"
            type="date"
            defaultValue={
              sent.quoteExpiresAt ?? toDateInputValue(request.quoteExpiresAt)
            }
            error={errors.quoteExpiresAt}
            hint="ВКЛЮЧИТЕЛНО този ден, до 23:59 немско време."
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Бележки">
        <TextareaField
          name="notes"
          label="Вътрешни бележки"
          rows={4}
          defaultValue={sent.notes ?? request.notes ?? ""}
          error={errors.notes}
          hint="Виждат се само тук. Не влизат в имейла до клиента."
        />
      </FieldGroup>

      <div>
        <SubmitButton>Запази</SubmitButton>
      </div>
    </form>
  );
}
