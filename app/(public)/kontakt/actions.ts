"use server";

// ТЕРИТОРИЯ НА БОБИ · задача 5.
// Писано от Жоро, докато Боби е в отпуск.

import { headers } from "next/headers";
import {
  HONEYPOT_FIELD,
  callRequestSchema,
  checkSpam,
} from "@/lib/cms/call-requests";
import {
  createCallRequest,
  isRateLimited,
} from "@/lib/cms/call-requests-db";

export interface CallRequestFormState {
  status: "idle" | "success" | "error";
  /** Съобщения по поле — формата ги показва до съответния вход. */
  fieldErrors?: Record<string, string>;
  message?: string;
  /** Вписаното се връща, за да не се губи при грешка. */
  values?: Record<string, string>;
}

/**
 * Истинският IP зад обратен прокси.
 *
 * Vercel слага x-forwarded-for; първият адрес е клиентът, останалите са
 * прокситата. Взима се само първият — иначе ограничението по IP се
 * заобикаля с подправена глава.
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

export async function submitCallRequest(
  _prev: CallRequestFormState,
  formData: FormData,
): Promise<CallRequestFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
    preferredTime: String(formData.get("preferredTime") ?? ""),
    courseId: String(formData.get("courseId") ?? ""),
    source: String(formData.get("source") ?? "CONTACT_PAGE"),
  };

  const parsed = callRequestSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      // Първата грешка за поле е достатъчна — стек от съобщения върху
      // едно поле е шум.
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      status: "error",
      fieldErrors,
      message: "Bitte prüfen Sie die markierten Felder.",
      values: raw,
    };
  }

  const store = await headers();
  const ip = await clientIp();

  if (await isRateLimited(ip)) {
    return {
      status: "error",
      message:
        "Wir haben in der letzten Stunde mehrere Anfragen von Ihnen erhalten. " +
        "Bitte rufen Sie uns direkt an oder versuchen Sie es später.",
      values: raw,
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

  try {
    await createCallRequest(parsed.data, {
      ip,
      userAgent: store.get("user-agent"),
      spam,
    });
  } catch {
    return {
      status: "error",
      message:
        "Die Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
      values: raw,
    };
  }

  // Разпознатият бот вижда СЪЩОТО потвърждение. Ако му кажем, че е
  // разпознат, следващият опит ще заобиколи проверката; а ако сме
  // сбъркали, истинският човек не е отблъснат — заявката е в базата със
  // статус SPAM и админът я вижда.
  //
  // Имейлът за потвърждение идва в задача 5 през lib/email (собственик
  // Жоро, още mock) — нарочно не се вика тук, за да не гърми формата.
  return {
    status: "success",
    message:
      "Danke! Wir melden uns innerhalb eines Werktags bei Ihnen. " +
      "Bei dringenden Fragen erreichen Sie uns telefonisch.",
  };
}
