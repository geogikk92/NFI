"use client";

// АДМИН · основа — обявяването на резултата и бутонът за изпращане.
//
// Клиентски компоненти са САМО заради две неща: местенето на фокуса към
// съобщението и надписа „записва се…" на бутона. Формите под тях пак
// работят без JavaScript — действието е server action, не fetch.

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { AdminFormState } from "@/lib/admin/form";

/**
 * Съобщението над формата.
 *
 * Фокусът отива върху него след изпращане, защото иначе човек с екранен
 * четец остава долу при бутона и НЕ научава нито че записът е минал, нито
 * че три полета са сгрешени. Условието „не е idle" пази от кражба на
 * фокуса при първия рендер.
 *
 * `role="alert"` за грешка (прекъсва четеца — това е новина, която спира
 * работата) и `role="status"` за успех (изчаква — работата е свършена).
 */
export function FormStatus({ state }: { state: AdminFormState }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "idle") ref.current?.focus();
  }, [state]);

  if (state.status === "idle" || !state.message) return null;

  const failed = state.status === "error";

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={failed ? "alert" : "status"}
      className={
        failed
          ? "rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          : "rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm"
      }
    >
      <p className={failed ? "font-medium text-destructive" : "font-medium text-success"}>
        {failed ? "Записът не мина" : "Готово"}
      </p>
      <p className="mt-1">{state.message}</p>
    </div>
  );
}

/**
 * Бутонът знае сам кога формата се изпраща.
 *
 * `useFormStatus` вместо третата стойност на `useActionState`: така
 * бутонът може да стои във всяка форма, без всяка да му подава `pending`.
 *
 * Изключването пази от двоен запис при двойно щракане — а надписът се
 * СМЕНЯ, не само се посивява: посивяване без текст не се чува.
 */
export function SubmitButton({
  children,
  pendingLabel = "Записва се…",
  variant,
  size,
  formAction,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /**
   * Различно действие от това на формата.
   *
   * За форми с ДВА изхода — „Запази черновата" и „Публикувай" върху едни
   * и същи полета. Атрибутът е нативен (HTML5 formaction) и работи и без
   * JavaScript: браузърът праща формата на посочения адрес.
   */
  formAction?: React.ComponentProps<"button">["formAction"];
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      formAction={formAction}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
