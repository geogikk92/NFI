"use server";

// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — вход.
//
// Входът РАБОТИ от 30.07.2026. Сесията е ред в таблицата Session, а не JWT:
// триеш реда, човекът е навън в същия миг. Виж lib/auth/session.ts за
// защо не е Auth.js, макар пакетът да е инсталиран.
//
// Разпределението на отговорностите:
//   • тук            — формата: валидация, съобщения, пренасочване;
//   • login-db.ts    — самоличност: парола, изтрит профил, презапис на хеш;
//   • session-db.ts  — сесия: токен, бисквитка, изход.
//
// Валидацията при ВХОД е нарочно по-хлабава от тази при регистрация — виж
// коментара над схемата.

import { redirect } from "next/navigation";
import { z } from "zod";
import { toLocale } from "@/lib/i18n/config";
import { getAuthTexts } from "@/lib/i18n/pages/auth";
import { LOCALE_FIELD } from "@/lib/auth/register";
import { authenticate } from "@/lib/auth/login-db";
import { createSession } from "@/lib/auth/session-db";

export interface LoginFormState {
  status: "idle" | "error";
  fieldErrors?: { email?: string; password?: string };
  message?: string;
  /** Вписаното се връща, за да не се губи. БЕЗ паролата. */
  values?: { email?: string };
}

/**
 * Валидацията при ВХОД е нарочно по-хлабава от тази при регистрация: тук не
 * се създава нищо и правилата за силна парола не важат. Проверява се само
 * дали има какво да се провери — иначе съобщението „поне 10 знака" би
 * казало на непознат човек какви са правилата за паролите ни.
 */
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("emailInvalid"),
  password: z.string().min(1, "passwordRequired"),
});

export async function signInWithPassword(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const locale = toLocale(formData.get(LOCALE_FIELD));
  const texts = getAuthTexts(locale);

  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email,
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors: LoginFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "email" && !fieldErrors.email) {
        fieldErrors.email = texts.loginErrorEmail;
      }
      if (issue.path[0] === "password" && !fieldErrors.password) {
        fieldErrors.password = texts.loginErrorPassword;
      }
    }

    return {
      status: "error",
      fieldErrors,
      message: texts.formError,
      values: { email },
    };
  }

  const outcome = await authenticate(parsed.data.email, parsed.data.password);

  if (outcome.kind === "failed") {
    return {
      status: "error",
      message: texts.loginFailed,
      values: { email: parsed.data.email },
    };
  }

  if (outcome.kind === "locked") {
    return {
      status: "error",
      message: texts.loginLocked,
      values: { email: parsed.data.email },
    };
  }

  await createSession(outcome.userId);

  // Пренасочването е по РОЛЯ, а не по параметър от адреса. Липсата на
  // ?next= не е пропуск: параметър, който казва „води ме тук след вход",
  // е класическият open redirect и иска отделна проверка на всяка
  // стойност. Няма нужда от него — пазачът на /admin връща 404, не
  // пренасочва към вход.
  redirect(outcome.role === "ADMIN" ? "/admin" : `/${locale}`);
}
