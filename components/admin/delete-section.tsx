"use client";

// АДМИН · разделът за изтриване.
//
// Общ за курсове, продукти и промоции: и трите се трият по едни и същи
// правила — само когато към записа не сочи нищо, с изрично потвърждение и
// със снимка в дневника.
//
// Разделът стои СГЪНАТ (`<details>`), а не като бутон сред останалите:
// изтриването е единственото необратимо действие в панела и не бива да
// стои на един ред разстояние от „Запази".
//
// `<details>` е нативен — отваря се и без JavaScript, за разлика от диалог.

import { useActionState } from "react";
import {
  CheckboxField,
} from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";

interface Props {
  action: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  id: string;
  /** Обяснение защо не може. `null` значи, че може. */
  blocked: string | null;
  /** „курса", „продукта", „промоцията" — влиза в изреченията. */
  what: string;
  /** Какво точно се губи безвъзвратно. */
  consequence: string;
}

export function DeleteSection({
  action,
  id,
  blocked,
  what,
  consequence,
}: Props) {
  const [state, formAction] = useActionState(action, IDLE);

  return (
    <details className="mt-12 rounded-xl border border-destructive/30 bg-destructive/5">
      <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        Изтриване на {what}
      </summary>

      <div className="border-t border-destructive/20 px-5 py-5">
        {blocked ? (
          // Не е неактивен бутон, а обяснение вместо бутон: неактивен
          // бутон без причина е по-лош от липсващ, а причината тук е
          // работеща алтернатива („скрий го").
          <p className="text-sm leading-relaxed">{blocked}</p>
        ) : (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="id" value={id} />

            <FormStatus state={state} />

            <p className="text-sm leading-relaxed">{consequence}</p>

            <CheckboxField
              name="confirm"
              label={`Разбирам, че ${what} се изтрива завинаги.`}
              error={state.fieldErrors?.confirm}
            />

            <div>
              <SubmitButton variant="destructive" pendingLabel="Изтрива се…">
                Изтрий завинаги
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
