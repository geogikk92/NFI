"use client";

// Формата за достъп до безплатен материал · задача 8.
//
// Следва call-request-form.tsx: етикети, aria-describedby, role="status",
// фокус върху резултата. Разликата е наградата — линкът за сваляне се
// показва ВЕДНАГА, не чака имейл (имейлът е подсигуровка, задача 23m).

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HONEYPOT_FIELD } from "@/lib/cms/free-materials";
import type { Locale } from "@/lib/i18n/config";
import { materialsCopy } from "@/lib/i18n/pages/materials";
import { contactFormCopy } from "@/lib/i18n/pages/contact-form";
import type { MaterialAccessState } from "@/app/[locale]/(public)/materialien/actions";

interface MaterialAccessFormProps {
  action: (
    prev: MaterialAccessState,
    formData: FormData,
  ) => Promise<MaterialAccessState>;
  slug: string;
  locale: Locale;
  isVideo: boolean;
}

const INITIAL: MaterialAccessState = { status: "idle" };

export function MaterialAccessForm({
  action,
  slug,
  locale,
  isVideo,
}: MaterialAccessFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const summaryRef = useRef<HTMLDivElement>(null);
  const t = materialsCopy(locale);

  useEffect(() => {
    if (state.status !== "idle") summaryRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div
        ref={summaryRef}
        tabIndex={-1}
        role="status"
        className="border border-success/40 bg-success/5 px-6 py-8"
      >
        <p className="font-title text-xl font-bold text-success">
          {t.result.successTitle}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {state.message ?? t.result.successBody}
        </p>

        {state.downloadPath ? (
          <Button asChild size="lg" className="mt-5">
            {/* <a>, не <Link>: route handler, който стриймва файл —
                клиентската навигация на Next би го отворила като страница. */}
            <a href={state.downloadPath} download>
              <Download aria-hidden />
              {t.result.download}
            </a>
          </Button>
        ) : null}
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="renderedAt" value={Date.now()} />

      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor={`${HONEYPOT_FIELD}-material`}>Website</label>
        <input
          id={`${HONEYPOT_FIELD}-material`}
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
          className="border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="material-name">
            {t.form.nameLabel}{" "}
            <span aria-hidden className="text-destructive">*</span>
          </Label>
          <Input
            id="material-name"
            name="name"
            required
            autoComplete="name"
            placeholder={t.form.namePlaceholder}
            defaultValue={values.name}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "material-name-error" : undefined}
          />
          {errors.name ? (
            <p id="material-name-error" className="text-sm text-destructive">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="material-email">
            {t.form.emailLabel}{" "}
            <span aria-hidden className="text-destructive">*</span>
          </Label>
          <Input
            id="material-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.form.emailPlaceholder}
            defaultValue={values.email}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "material-email-error" : undefined}
          />
          {errors.email ? (
            <p id="material-email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          ) : null}
        </div>
      </div>

      {/* Бюлетинът е ОТДЕЛНА отметка, по подразбиране празна. Обвързан
          достъп = принудително съгласие (чл. 7, ал. 4 GDPR) — затова
          материалът идва независимо от нея. */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="material-newsletter"
          name="newsletter"
          defaultChecked={values.newsletter === "on"}
          className="mt-0.5"
        />
        <Label
          htmlFor="material-newsletter"
          className="text-sm font-normal leading-relaxed text-muted-foreground"
        >
          {t.form.newsletterLabel}
        </Label>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending
          ? t.form.submitting
          : isVideo
            ? t.form.videoSubmit
            : t.form.submit}
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {t.form.privacyNote}{" "}
        <Link
          href={`/${locale}/datenschutz`}
          className="underline hover:text-primary"
        >
          {contactFormCopy(locale).labels.privacyLink}
        </Link>
        .
      </p>
    </form>
  );
}
