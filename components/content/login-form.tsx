"use client";

// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — формата за вход.
//
// Клиентски компонент само заради useActionState. Без JavaScript формата
// работи: action-ът е server action.
//
// Достъпност: етикети, текстови грешки, aria-describedby, aria-invalid.
// Виж бележките в register-form.tsx — правилата са същите.

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getAuthTexts } from "@/lib/i18n/pages/auth";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_FIELD } from "@/lib/auth/register";
import type { LoginFormState } from "@/app/[locale]/(auth)/anmelden/actions";

interface LoginFormProps {
  locale: Locale;
  action: (
    prev: LoginFormState,
    formData: FormData,
  ) => Promise<LoginFormState>;
}

const INITIAL: LoginFormState = { status: "idle" };

export function LoginForm({ locale, action }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const summaryRef = useRef<HTMLDivElement>(null);
  const t = getDictionary(locale);
  const texts = getAuthTexts(locale);

  // Само след действие — при първия рендер състоянието е idle и фокусът
  // остава там, където го е оставил човекът.
  useEffect(() => {
    if (state.status !== "idle") summaryRef.current?.focus();
  }, [state]);

  const errors = state.fieldErrors ?? {};

  // noValidate — по същата причина като в register-form.tsx: съобщенията на
  // браузъра не са на езика на страницата.
  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name={LOCALE_FIELD} value={locale} />

      {/* Двете състояния са РАЗЛИЧНИ неща и се обявяват различно: сгрешено
          поле е грешка на човека (alert), а неготовият вход е наша —
          затова е бележка, а не червено. Разчита се на текста, не на цвят. */}
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


      <div className="grid gap-2">
        <label htmlFor="login-email" className="text-sm font-medium">
          {t.auth.email} <span aria-hidden className="text-destructive">*</span>
          <span className="sr-only">({t.auth.required})</span>
        </label>
        <Input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={
            errors.email
              ? "login-email-error login-email-hint"
              : "login-email-hint"
          }
        />
        <p id="login-email-hint" className="text-xs text-muted-foreground">
          {texts.loginEmailHint}
        </p>
        {errors.email ? (
          <p id="login-email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor="login-password" className="text-sm font-medium">
          {texts.loginPasswordLabel}{" "}
          <span aria-hidden className="text-destructive">*</span>
          <span className="sr-only">({t.auth.required})</span>
        </label>
        {/* Паролата не се връща в HTML-а при грешка — нито при вход. */}
        <Input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "login-password-error" : undefined}
        />
        {errors.password ? (
          <p id="login-password-error" className="text-sm text-destructive">
            {errors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.auth.pending : t.auth.submitLogin}
      </Button>
    </form>
  );
}
