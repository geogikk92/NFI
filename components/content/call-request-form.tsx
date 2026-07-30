"use client";

// ТЕРИТОРИЯ НА БОБИ · задача 5 — формата за заявка за обаждане.
// Писано от Жоро, докато Боби е в отпуск.
//
// Достъпност (правно задължение от 28.06.2025):
//   • всяко поле има <label>, не placeholder вместо етикет;
//   • грешките се съобщават ТЕКСТОВО и се свързват с полето през
//     aria-describedby — не само с червена рамка (WCAG 1.4.1);
//   • aria-invalid на сгрешените полета;
//   • резултатът се обявява през role="status" / role="alert".

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { HONEYPOT_FIELD } from "@/lib/cms/call-requests";
import type {
  CallRequestFormState,
} from "@/app/[locale]/(public)/kontakt/actions";

interface CallRequestFormProps {
  action: (
    prev: CallRequestFormState,
    formData: FormData,
  ) => Promise<CallRequestFormState>;
  source: "COURSE_PAGE" | "CONTACT_PAGE" | "LEVEL_TEST";
  /** Предварително избран курс. */
  courseId?: string;
  courseTitle?: string;
}

const INITIAL: CallRequestFormState = { status: "idle" };

export function CallRequestForm({
  action,
  source,
  courseId,
  courseTitle,
}: CallRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Фокусът отива на съобщението — иначе човек с екранен четец не разбира
  // какво е станало след изпращането.
  useEffect(() => {
    if (state.status !== "idle") summaryRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        ref={summaryRef}
        tabIndex={-1}
        role="status"
        className="rounded-xl border border-success/40 bg-success/5 px-6 py-8"
      >
        <p className="font-medium text-success">Anfrage erhalten</p>
        <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="source" value={source} />
      {courseId ? (
        <input type="hidden" name="courseId" value={courseId} />
      ) : null}
      {/* Отпечатък на времето: попълване под две секунди е бот. */}
      <input type="hidden" name="renderedAt" value={Date.now()} />

      {/* Honeypot. Скрит е с CSS, не с type="hidden" — ботовете пропускат
          hidden полета, но попълват видимите за тях текстови.
          aria-hidden + tabIndex={-1}, за да не го срещне никога човек. */}
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" && state.message ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      ) : null}

      {courseTitle ? (
        <p className="rounded-lg bg-muted px-4 py-3 text-sm">
          Ihre Anfrage bezieht sich auf: <strong>{courseTitle}</strong>
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">
            Name <span aria-hidden className="text-destructive">*</span>
            <span className="sr-only">(Pflichtfeld)</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            defaultValue={values.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name ? (
            <p id="name-error" className="text-sm text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">
            E-Mail <span aria-hidden className="text-destructive">*</span>
            <span className="sr-only">(Pflichtfeld)</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={values.phone}
            aria-describedby="phone-hint"
          />
          <p id="phone-hint" className="text-xs text-muted-foreground">
            Für einen Rückruf — sonst antworten wir per E-Mail.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="preferredTime">Wann passt es Ihnen?</Label>
          <Input
            id="preferredTime"
            name="preferredTime"
            defaultValue={values.preferredTime}
            aria-describedby="time-hint"
          />
          <p id="time-hint" className="text-xs text-muted-foreground">
            z.&nbsp;B. &bdquo;vormittags&ldquo; oder &bdquo;nach 18 Uhr&ldquo;
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="message">Ihre Nachricht</Label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          defaultValue={values.message}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={errors.message ? "message-error" : undefined}
        />
        {errors.message ? (
          <p id="message-error" className="text-sm text-destructive">
            {errors.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Wird gesendet…" : "Rückruf anfragen"}
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Wir verwenden Ihre Angaben ausschließlich, um Ihre Anfrage zu
        bearbeiten. Mehr dazu in der{" "}
        <a href="/datenschutz" className="underline hover:text-primary">
          Datenschutzerklärung
        </a>
        .
      </p>
    </form>
  );
}
