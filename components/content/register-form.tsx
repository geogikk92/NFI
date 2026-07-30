"use client";

// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — формата за регистрация.
//
// Клиентски компонент е САМО заради useActionState (грешки без презареждане
// и „изпраща се" на бутона). Без JavaScript формата пак работи: action-ът е
// server action, а не onClick fetch.
//
// Достъпност (правно задължение от 28.06.2025, WCAG 2.1 AA):
//   • всяко поле има истински <label>, не placeholder вместо етикет;
//   • грешките се съобщават ТЕКСТОВО и се свързват с полето през
//     aria-describedby — не само с червена рамка (WCAG 1.4.1, 3.3.1);
//   • aria-invalid на сгрешените полета;
//   • отметките са НАТИВНИ <input type="checkbox">, а не Radix компонентът:
//     Radix рисува <button> и работи само с JavaScript, а съгласието за AGB
//     трябва да може да се даде и без него;
//   • групата съгласия е <fieldset> с <legend> — четецът обявява
//     принадлежността вместо да чете три несвързани отметки.

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getAuthTexts } from "@/lib/i18n/pages/auth";
import type { Locale } from "@/lib/i18n/config";
import {
  LOCALE_FIELD,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/register";
import { HONEYPOT_FIELD } from "@/lib/cms/call-requests";
import type { RegisterFormState } from "@/app/[locale]/(auth)/registrieren/actions";

interface RegisterFormProps {
  locale: Locale;
  action: (
    prev: RegisterFormState,
    formData: FormData,
  ) => Promise<RegisterFormState>;
}

const INITIAL: RegisterFormState = { status: "idle" };

export function RegisterForm({ locale, action }: RegisterFormProps) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const summaryRef = useRef<HTMLDivElement>(null);
  const t = getDictionary(locale);
  const texts = getAuthTexts(locale);

  // Фокусът отива на съобщението, за да разбере човекът с екранен четец
  // какво е станало. Условието „не е idle" пази от кражба на фокуса при
  // ПЪРВИЯ рендер — тогава състоянието още е idle.
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
        <h2 className="font-medium text-success">{t.auth.checkInbox}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {state.message ?? t.auth.verifySent}
        </p>
        <p className="mt-4 text-sm">
          <Link href={`/${locale}/anmelden`} className="underline hover:text-primary">
            {t.auth.toLogin}
          </Link>
        </p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  // noValidate: браузърът показва своите съобщения на СВОЯ език, който често
  // не е езикът на страницата, и ги рисува в балон, който екранните четци
  // обявяват непоследователно. Нашите съобщения са преведени и свързани с
  // полетата през aria-describedby — те са единственият източник.
  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name={LOCALE_FIELD} value={locale} />
      {/* Отпечатък на времето: попълване под две секунди е бот. */}
      <input type="hidden" name="renderedAt" value={Date.now()} />

      {/* Honeypot: скрит с CSS, не с type="hidden" — ботовете пропускат
          hidden полетата, но попълват видимите за тях текстови.
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
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-destructive">{texts.formErrorTitle}</p>
          <p className="mt-1 text-destructive">{state.message}</p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="reg-name" className="text-sm font-medium">
          {t.auth.name} <span aria-hidden className="text-destructive">*</span>
          <span className="sr-only">({t.auth.required})</span>
        </label>
        <Input
          id="reg-name"
          name="name"
          required
          autoComplete="name"
          defaultValue={values.name}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "reg-name-error" : undefined}
        />
        {errors.name ? (
          <p id="reg-name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label htmlFor="reg-email" className="text-sm font-medium">
          {t.auth.email} <span aria-hidden className="text-destructive">*</span>
          <span className="sr-only">({t.auth.required})</span>
        </label>
        <Input
          id="reg-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={values.email}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={
            errors.email ? "reg-email-error reg-email-hint" : "reg-email-hint"
          }
        />
        <p id="reg-email-hint" className="text-xs text-muted-foreground">
          {texts.emailHint}
        </p>
        {errors.email ? (
          <p id="reg-email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="reg-password" className="text-sm font-medium">
            {t.auth.password}{" "}
            <span aria-hidden className="text-destructive">*</span>
            <span className="sr-only">({t.auth.required})</span>
          </label>
          {/* Паролата НЕ се връща в defaultValue — виж keepableValues в
              lib/auth/register.ts. */}
          <Input
            id="reg-password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={MAX_PASSWORD_LENGTH}
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password
                ? "reg-password-error reg-password-hint"
                : "reg-password-hint"
            }
          />
          <p id="reg-password-hint" className="text-xs text-muted-foreground">
            {t.auth.passwordHint}
          </p>
          {errors.password ? (
            <p id="reg-password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label htmlFor="reg-password-confirm" className="text-sm font-medium">
            {t.auth.passwordConfirm}{" "}
            <span aria-hidden className="text-destructive">*</span>
            <span className="sr-only">({t.auth.required})</span>
          </label>
          <Input
            id="reg-password-confirm"
            name="passwordConfirm"
            type="password"
            required
            autoComplete="new-password"
            aria-invalid={errors.passwordConfirm ? true : undefined}
            aria-describedby={
              errors.passwordConfirm
                ? "reg-confirm-error reg-confirm-hint"
                : "reg-confirm-hint"
            }
          />
          <p id="reg-confirm-hint" className="text-xs text-muted-foreground">
            {texts.passwordConfirmHint}
          </p>
          {errors.passwordConfirm ? (
            <p id="reg-confirm-error" className="text-sm text-destructive">
              {errors.passwordConfirm}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="reg-phone" className="text-sm font-medium">
          {t.auth.phone}{" "}
          <span className="font-normal text-muted-foreground">
            ({t.auth.optional})
          </span>
        </label>
        <Input
          id="reg-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={values.phone}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={
            errors.phone ? "reg-phone-error reg-phone-hint" : "reg-phone-hint"
          }
        />
        <p id="reg-phone-hint" className="text-xs text-muted-foreground">
          {texts.phoneHint}
        </p>
        {errors.phone ? (
          <p id="reg-phone-error" className="text-sm text-destructive">
            {errors.phone}
          </p>
        ) : null}
      </div>

      <fieldset className="grid gap-4 rounded-xl border border-border bg-surface-sunken px-5 py-5">
        <legend className="px-1 text-sm font-semibold">
          {texts.consentLegend}
        </legend>

        <div className="grid gap-1">
          <div className="flex items-start gap-3">
            <input
              id="reg-terms"
              name="acceptTerms"
              type="checkbox"
              required
              defaultChecked={values.acceptTerms === "on"}
              aria-invalid={errors.acceptTerms ? true : undefined}
              aria-describedby={errors.acceptTerms ? "reg-terms-error" : undefined}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <label htmlFor="reg-terms" className="text-sm leading-relaxed">
              {texts.acceptTermsBefore}{" "}
              <Link
                href={`/${locale}/agb`}
                className="underline hover:text-primary"
              >
                {texts.termsLink}
              </Link>{" "}
              <span aria-hidden className="text-destructive">*</span>
              <span className="sr-only">({t.auth.required})</span>
            </label>
          </div>
          {errors.acceptTerms ? (
            <p id="reg-terms-error" className="ml-7 text-sm text-destructive">
              {errors.acceptTerms}
            </p>
          ) : null}
        </div>

        <div className="grid gap-1">
          <div className="flex items-start gap-3">
            <input
              id="reg-privacy"
              name="acceptPrivacy"
              type="checkbox"
              required
              defaultChecked={values.acceptPrivacy === "on"}
              aria-invalid={errors.acceptPrivacy ? true : undefined}
              aria-describedby={
                errors.acceptPrivacy ? "reg-privacy-error" : undefined
              }
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <label htmlFor="reg-privacy" className="text-sm leading-relaxed">
              {texts.acceptPrivacyBefore}{" "}
              <Link
                href={`/${locale}/datenschutz`}
                className="underline hover:text-primary"
              >
                {texts.privacyLink}
              </Link>
              {texts.acceptPrivacyAfter ? ` ${texts.acceptPrivacyAfter}` : ""}{" "}
              <span aria-hidden className="text-destructive">*</span>
              <span className="sr-only">({t.auth.required})</span>
            </label>
          </div>
          {errors.acceptPrivacy ? (
            <p id="reg-privacy-error" className="ml-7 text-sm text-destructive">
              {errors.acceptPrivacy}
            </p>
          ) : null}
        </div>

        {/* Бюлетинът е ОТДЕЛНО съгласие и НИКОГА не е предварително
            отметнат — иначе не е свободно дадено (Art. 7 GDPR) и не важи. */}
        <div className="grid gap-1">
          <div className="flex items-start gap-3">
            <input
              id="reg-newsletter"
              name="newsletter"
              type="checkbox"
              defaultChecked={values.newsletter === "on"}
              aria-describedby="reg-newsletter-hint"
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <label htmlFor="reg-newsletter" className="text-sm leading-relaxed">
              {t.auth.newsletterOptIn}{" "}
              <span className="text-muted-foreground">({t.auth.optional})</span>
            </label>
          </div>
          <p id="reg-newsletter-hint" className="ml-7 text-xs text-muted-foreground">
            {t.auth.newsletterHint}
          </p>
        </div>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.auth.pending : t.auth.submitRegister}
      </Button>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {texts.consentRecordNote}
      </p>
    </form>
  );
}
