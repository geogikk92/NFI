"use server";

// ТЕРИТОРИЯ НА БОБИ · задача 8 — заявка за достъп до материал.
// Устроено като kontakt/actions.ts: същият honeypot, същото мълчание
// към ботовете, същите КОДОВЕ за грешки, преведени според locale.

import { headers } from "next/headers";
import { toLocale } from "@/lib/i18n/config";
import { clientIp } from "@/lib/request-ip";
import { materialsCopy } from "@/lib/i18n/pages/materials";
import {
  HONEYPOT_FIELD,
  MIN_FILL_SECONDS,
  materialAccessSchema,
} from "@/lib/cms/free-materials";
import {
  grantMaterialAccess,
  isMaterialRateLimited,
} from "@/lib/cms/free-materials-db";
import { newsletterSchema } from "@/lib/cms/newsletter";
import { subscribeToNewsletter } from "@/lib/cms/newsletter-db";

/** Като в lib/seo/structured-data.ts — там константата не е изнесена. */
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export interface MaterialAccessState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  /** Линкът за сваляне — показва се веднага, не чака имейл. */
  downloadPath?: string;
  /** true за видео: няма файл, съдържанието е на самата страница. */
  isVideo?: boolean;
}

export async function requestMaterialAccess(
  _prev: MaterialAccessState,
  formData: FormData,
): Promise<MaterialAccessState> {
  const locale = toLocale(formData.get("locale"));
  const t = materialsCopy(locale);

  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    newsletter: formData.get("newsletter") === "on",
    slug: String(formData.get("slug") ?? ""),
  };

  const parsed = materialAccessSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) {
        fieldErrors[key] =
          t.fieldErrors[issue.message] ?? t.result.checkFields;
      }
    }
    return {
      status: "error",
      fieldErrors,
      message: t.result.checkFields,
      values: {
        name: raw.name,
        email: raw.email,
        newsletter: raw.newsletter ? "on" : "",
      },
    };
  }

  const ip = await clientIp();
  const store = await headers();

  if (await isMaterialRateLimited(ip)) {
    return {
      status: "error",
      message: t.result.rateLimited,
      values: {
        name: raw.name,
        email: raw.email,
        newsletter: raw.newsletter ? "on" : "",
      },
    };
  }

  // Honeypot и време — както при заявките за обаждане. Ботът вижда
  // успех, но НЕ получава линк: „материалът е на страницата" е
  // правдоподобен отговор и за човек, и за скрипт.
  const renderedAt = Number.parseInt(String(formData.get("renderedAt") ?? ""), 10);
  const honeypot = String(formData.get(HONEYPOT_FIELD) ?? "");
  const tooFast =
    !Number.isNaN(renderedAt) &&
    Date.now() - renderedAt < MIN_FILL_SECONDS * 1000;

  if (honeypot.trim().length > 0 || Number.isNaN(renderedAt) || tooFast) {
    // Неутрален успех без линк: ботът не научава нищо, а истински човек,
    // ударен от автопопълване, вижда правдоподобно съобщение.
    return { status: "success", message: t.result.videoReady, isVideo: true };
  }

  let grant;
  try {
    grant = await grantMaterialAccess(parsed.data, { ip });
  } catch {
    return {
      status: "error",
      message: t.result.failed,
      values: {
        name: raw.name,
        email: raw.email,
        newsletter: raw.newsletter ? "on" : "",
      },
    };
  }

  if (!grant) {
    return {
      status: "error",
      message: t.result.failed,
      values: {
        name: raw.name,
        email: raw.email,
        newsletter: raw.newsletter ? "on" : "",
      },
    };
  }

  // Бюлетинът е ОТДЕЛНО съгласие и отделен поток. Провалът му не бива
  // да съсипе основното: човекът е дошъл за материала.
  if (parsed.data.newsletter) {
    try {
      const sub = newsletterSchema.safeParse({ email: parsed.data.email, locale });
      if (sub.success) {
        await subscribeToNewsletter(sub.data, {
          ip,
          userAgent: store.get("user-agent"),
          appUrl: APP_URL,
        });
      }
    } catch {
      // Съзнателно поглъщане: PENDING абонатът може да се запише пак.
    }
  }

  return {
    status: "success",
    message: grant.token ? t.result.successBody : t.result.videoReady,
    downloadPath: grant.token ? `/download/${grant.token}` : undefined,
    isVideo: grant.token === null,
  };
}
