"use client";

// АДМИН · обработката на една заявка за обаждане.
//
// Две полета. Тук не се въвежда съдържание — взима се решение и се оставя
// следа за колегата, който ще вдигне телефона следващия път.
//
// Заявката НЕ се редактира: име, телефон и съобщение са това, което човекът
// е написал сам. Поле за поправка тук би значело, че записът на екрана вече
// не е неговите думи, а нечий преразказ.

import { useActionState, useState } from "react";
import { SelectField, TextareaField } from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";

export interface CallRequestFormValues {
  id: string;
  status: string;
  handledNote: string | null;
}

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  statuses: readonly { value: string; label: string }[];
  /** Максимумът от сървъра — за да не се разминат двете граници. */
  maxNote: number;
  /**
   * Заварената бележка е следа от honeypot защитата, не човешки текст.
   * Идва пресметнато от сървъра (`isAutomaticNote`), за да не се пише
   * началото на низа на две места.
   */
  noteIsAutomatic: boolean;
  request: CallRequestFormValues;
}

export function CallRequestForm({
  action,
  statuses,
  maxNote,
  noteIsAutomatic,
  request,
}: Props) {
  const [state, formAction] = useActionState(action, IDLE);

  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  const [status, setStatus] = useState(sent.status ?? request.status);

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <input type="hidden" name="id" value={request.id} />

      <FormStatus state={state} />

      <SelectField
        name="status"
        label="Докъде е стигнала заявката"
        required
        options={statuses}
        defaultValue={status}
        error={errors.status}
        onValueChange={setStatus}
        hint={
          status === "SPAM"
            ? "Спамът НЕ се крие от списъка — истинска заявка, сложена тук по погрешка, иначе изчезва безследно."
            : "Вижда се само в панела. Човекът отсреща не получава известие при смяна."
        }
      />

      <TextareaField
        name="handledNote"
        label="Бележка"
        rows={4}
        defaultValue={sent.handledNote ?? request.handledNote ?? ""}
        error={errors.handledNote}
        hint={
          noteIsAutomatic
            ? `Текстът отгоре е сложен от автоматичната проверка, не от човек. Презапишеш ли го, старият остава в дневника на промените. Най-много ${maxNote} знака.`
            : `За колегата, който ще звънне следващия път: кога си опитал, какво е казал човекът. Най-много ${maxNote} знака.`
        }
      />

      <div>
        <SubmitButton>Запази</SubmitButton>
      </div>
    </form>
  );
}
