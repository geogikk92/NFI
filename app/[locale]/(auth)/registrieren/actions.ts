"use server";

// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход".
//
// Server action, не onClick fetch: формата работи и когато JavaScript го
// няма или още не се е заредил. useActionState само подобрява преживяването.

import { headers } from "next/headers";
import { toLocale } from "@/lib/i18n/config";
import { getAuthTexts } from "@/lib/i18n/pages/auth";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  LOCALE_FIELD,
  keepableValues,
  readRegisterForm,
  validateRegistration,
  type RegisterField,
} from "@/lib/auth/register";
import { createRegistration } from "@/lib/auth/register-db";
// Защитата от ботове е вече написана за формата за обаждане и е чист модул —
// няма причина да се пише втори път.
import { HONEYPOT_FIELD, checkSpam } from "@/lib/cms/call-requests";

export interface RegisterFormState {
  status: "idle" | "success" | "error";
  /** Готови текстове по поле — формата ги показва до съответния вход. */
  fieldErrors?: Partial<Record<RegisterField, string>>;
  message?: string;
  /** Вписаното се връща, за да не се губи. БЕЗ паролите. */
  values?: Record<string, string>;
}

/**
 * Истинският IP зад обратен прокси.
 *
 * Взима се само първият адрес от x-forwarded-for — останалите са прокситата,
 * а подправена глава не бива да замърсява доказателството по Art. 7 GDPR.
 */
async function clientIp(): Promise<string | null> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return store.get("x-real-ip");
}

export async function registerAccount(
  _prev: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  // Езикът пътува в скрито поле: server action не получава params, а
  // съобщенията трябва да са на езика на страницата.
  const locale = toLocale(formData.get(LOCALE_FIELD));
  const texts = getAuthTexts(locale);
  const t = getDictionary(locale);

  const raw = readRegisterForm(formData);
  const validation = validateRegistration(raw);

  if (!validation.ok) {
    const fieldErrors: Partial<Record<RegisterField, string>> = {};
    for (const [field, code] of Object.entries(validation.errors)) {
      fieldErrors[field as RegisterField] = texts.errors[code];
    }

    return {
      status: "error",
      fieldErrors,
      message: texts.formError,
      values: keepableValues(raw),
    };
  }

  const renderedAt = Number.parseInt(
    String(formData.get("renderedAt") ?? ""),
    10,
  );

  const spam = checkSpam({
    honeypot: formData.get(HONEYPOT_FIELD)
      ? String(formData.get(HONEYPOT_FIELD))
      : null,
    formRenderedAt: Number.isNaN(renderedAt) ? null : renderedAt,
  });

  // Разпознатият бот вижда СЪЩОТО потвърждение, но не се създава нищо.
  // Ако му кажем, че е разпознат, следващият опит ще заобиколи проверката.
  if (spam.spam) {
    // Оставя се СЛЕДА в сървърния лог. При заявките за обаждане отхвърленото
    // се пази в базата със статус SPAM и админът го вижда; тук нищо не се
    // записва, а човекът чете „провери пощата". Без този ред фалшивото
    // разпознаване е загубена регистрация, за която никой не научава.
    // Имейлът НЕ влиза в лога — лични данни не се сипват в логовете.
    console.warn(`[registrieren] Отхвърлена заявка (${spam.reason}), locale=${locale}`);
    return { status: "success", message: t.auth.verifySent };
  }

  const store = await headers();

  try {
    await createRegistration(validation.data, {
      ip: await clientIp(),
      userAgent: store.get("user-agent"),
      locale,
    });
  } catch {
    return {
      status: "error",
      message: texts.genericError,
      values: keepableValues(raw),
    };
  }

  // Писмото с линка за потвърждение НАРОЧНО не се праща оттук: lib/email още
  // е mock, който ХВЪРЛЯ (собственик Жоро, задачи E1/23m), и извикването му
  // би съборило регистрация, която вече е записана. Шаблонът е обявен —
  // "auth-verify-email" — и се закача тук, когато доставчикът е готов.
  //
  // СЪЩИЯТ отговор се връща и когато имейлът вече има профил
  // (createRegistration върна created: false). Разликата в отговора би
  // казала на непознат пред формата кой има профил в института.
  return { status: "success", message: t.auth.verifySent };
}
