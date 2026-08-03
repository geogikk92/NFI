"use server";

// ТЕРИТОРИЯ НА БОБИ · задача 7 — записване за бюлетина.
//
// Против злоупотреба: honeypot + идемпотентност. Нарочно БЕЗ лимит по
// IP: повторното записване на един имейл преизползва същия ред и същия
// токен, тоест няма какво да се напомпа. Писмо получава само
// собственикът на адреса — двойният opt-in е сам по себе си спирачката.

import { headers } from "next/headers";
import { toLocale } from "@/lib/i18n/config";
import { clientIp } from "@/lib/request-ip";
import { newsletterCopy } from "@/lib/i18n/pages/newsletter";
import { HONEYPOT_FIELD, newsletterSchema } from "@/lib/cms/newsletter";
import {
  isNewsletterRateLimited,
  subscribeToNewsletter,
} from "@/lib/cms/newsletter-db";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export interface NewsletterFormState {
  status: "idle" | "success" | "error";
  message?: string;
  /** Показва имейла в потвърждението — човек да види за кой адрес е. */
  email?: string;
  /** Само извън продукция, когато имейлите са още mock. */
  devConfirmUrl?: string;
}

export async function subscribeAction(
  _prev: NewsletterFormState,
  formData: FormData,
): Promise<NewsletterFormState> {
  const locale = toLocale(formData.get("locale"));
  const t = newsletterCopy(locale).form.result;

  // Ботът вижда успех и не получава нищо — както навсякъде.
  const honeypot = String(formData.get(HONEYPOT_FIELD) ?? "");
  if (honeypot.trim().length > 0) {
    return { status: "success", message: t.pending };
  }

  const parsed = newsletterSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    locale,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: t.invalid,
      email: String(formData.get("email") ?? ""),
    };
  }

  const store = await headers();
  const ip = await clientIp();

  // Лимит по IP (в базата, като при материалите): цикъл от POST-ове не
  // бива да може да пълни чужди пощи с потвърдителни писма.
  if (await isNewsletterRateLimited(ip)) {
    return { status: "error", message: t.failed, email: parsed.data.email };
  }

  try {
    const result = await subscribeToNewsletter(parsed.data, {
      ip,
      userAgent: store.get("user-agent"),
      appUrl: APP_URL,
    });

    // ЕДНАКЪВ отговор за нов, повторен и вече потвърден абонат — иначе
    // формата е оракул „този имейл в списъка ли е" за всеки любопитен.
    if (result.status === "already-confirmed") {
      return { status: "success", message: t.pending, email: parsed.data.email };
    }

    return {
      status: "success",
      message: t.pending,
      email: parsed.data.email,
      devConfirmUrl: result.devConfirmUrl ?? undefined,
    };
  } catch {
    return { status: "error", message: t.failed, email: parsed.data.email };
  }
}
