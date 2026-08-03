"use client";

// АДМИН · разделът за отмяна на сертификат.
//
// Устроен като DeleteSection: сгънат `<details>`, изрично потвърждение,
// причина, която влиза в одитната следа. Отмяната НЕ трие реда — номерът
// остава завинаги зает, а публичната проверка започва да показва
// „отменен". Затова има и обратен път (възстановяване, на детайла).

import { useActionState } from "react";
import { CheckboxField, TextareaField } from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  id: string;
}

export function CertificateRevokeSection({ action, id }: Props) {
  const [state, formAction] = useActionState(action, IDLE);

  return (
    <details className="mt-12 rounded-xl border border-destructive/30 bg-destructive/5">
      <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Отмяна на сертификата
      </summary>

      <div className="border-t border-destructive/20 px-5 py-5">
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={id} />

          <FormStatus state={state} />

          <p className="text-sm leading-relaxed">
            Публичната проверка ще показва „отменен“, PDF файлът спира да се
            предоставя на курсиста, а номерът остава зает завинаги. Може да се
            възстанови по-късно оттук.
          </p>

          <TextareaField
            name="reason"
            label="Причина за отмяната"
            rows={3}
            defaultValue={state.values?.reason ?? ""}
            error={state.fieldErrors?.reason}
            hint="Вътрешна бележка за дневника — не се показва публично."
          />

          <CheckboxField
            name="confirm"
            label="Разбирам, че сертификатът спира да важи веднага."
            error={state.fieldErrors?.confirm}
          />

          <div>
            <SubmitButton variant="destructive" pendingLabel="Отменя се…">
              Отмени сертификата
            </SubmitButton>
          </div>
        </form>
      </div>
    </details>
  );
}
