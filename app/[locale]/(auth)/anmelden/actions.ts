"use server";

// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — вход.
//
// ⚠️ ВХОДЪТ ОЩЕ НЕ Е ВКЛЮЧЕН И ТОВА СЕ КАЗВА ЧЕСТНО.
//
// Създаването на сесия е ОТДЕЛНА задача: иска решения по AUTH_SECRET,
// стратегията на сесията (database срещу jwt), Credentials provider-а и
// закачането в middleware.ts — а middleware.ts е чужд файл. Затова тук няма
// нито `signIn`, нито проверка на паролата срещу базата.
//
// ЗАЩО ВЪОБЩЕ СЪЩЕСТВУВА: формата за регистрация сочи „вече имате профил?"
// някъде. Страница, която казва какво става, е по-добра от 404 и много
// по-добра от форма, която мълчаливо не прави нищо. Полетата се валидират
// истински, за да не се променя нищо във формата, когато сесията дойде.
//
// КОГАТО ДОЙДЕ ЗАДАЧАТА ЗА Auth.js, тук се сменя ЕДНО място — маркирано е
// по-долу. Проверката на паролата е готова: verifyPassword и
// verifyAgainstNothing в lib/auth/password.ts.

import { z } from "zod";
import { toLocale } from "@/lib/i18n/config";
import { getAuthTexts } from "@/lib/i18n/pages/auth";
import { LOCALE_FIELD } from "@/lib/auth/register";

export interface LoginFormState {
  status: "idle" | "error" | "unavailable";
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

  // ┌───────────────────────────────────────────────────────────────────┐
  // │ ТУК влиза `await signIn("credentials", { … })`, когато Auth.js е  │
  // │ конфигуриран. Дотогава не се обръщаме към базата: проверка на     │
  // │ парола без сесия не влиза никого и само дава на външен човек      │
  // │ начин да пита „има ли такъв профил".                              │
  // └───────────────────────────────────────────────────────────────────┘
  return {
    status: "unavailable",
    message: texts.loginPendingBody,
    values: { email: parsed.data.email },
  };
}
