"use client";

// Формата за бюлетина · задача 7. Живее във футъра — на всяка страница.
// Компактна: етикет, поле, бутон. Резултатът замества формата на място.

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HONEYPOT_FIELD } from "@/lib/cms/newsletter";
import type { Locale } from "@/lib/i18n/config";
import { newsletterCopy } from "@/lib/i18n/pages/newsletter";
import {
  subscribeAction,
  type NewsletterFormState,
} from "@/app/[locale]/(public)/newsletter/actions";

const INITIAL: NewsletterFormState = { status: "idle" };

export function NewsletterForm({ locale }: { locale: Locale }) {
  const [state, formAction, pending] = useActionState(subscribeAction, INITIAL);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const t = newsletterCopy(locale).form;

  useEffect(() => {
    if (state.status !== "idle") resultRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div role="status">
        <p
          ref={resultRef}
          tabIndex={-1}
          className="text-sm leading-relaxed text-success"
        >
          {state.message}
        </p>
        {state.email ? (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {state.email}
          </p>
        ) : null}
        {state.devConfirmUrl ? (
          // Само в разработка: имейлите са mock и линкът се показва тук,
          // за да може double opt-in потокът да се измине докрай.
          <p className="mt-2 text-xs text-muted-foreground">
            {t.result.devHint}{" "}
            <a href={state.devConfirmUrl} className="underline">
              → OK
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="locale" value={locale} />

      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor={`${HONEYPOT_FIELD}-newsletter`}>Website</label>
        <input
          id={`${HONEYPOT_FIELD}-newsletter`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <Label htmlFor="newsletter-email" className="sr-only">
        {t.emailLabel}
      </Label>

      <div className="flex gap-2">
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          defaultValue={state.status === "error" ? state.email : undefined}
          className="min-w-0 flex-1"
          aria-invalid={state.status === "error" ? true : undefined}
          aria-describedby={
            state.status === "error"
              ? "newsletter-error newsletter-note"
              : "newsletter-note"
          }
        />
        <Button type="submit" disabled={pending} className="flex-none">
          {pending ? t.submitting : t.submit}
        </Button>
      </div>

      {state.status === "error" && state.message ? (
        <p
          id="newsletter-error"
          ref={resultRef}
          tabIndex={-1}
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <p
        id="newsletter-note"
        className="mt-3 text-xs leading-relaxed text-muted-foreground"
      >
        {t.consentNote}
      </p>
    </form>
  );
}
