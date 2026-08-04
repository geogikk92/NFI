import "server-only";

// АДМИН · разборът на формата за текстов блок.
//
// Тънък слой: истинската проверка живее в регистъра (чист модул), защото
// същите правила трябват и на CI скрипта, и на сийда. Тук се превежда
// само от FormData към стойности и от проблем към българско изречение.

import { collect } from "@/lib/admin/form";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import {
  type BlockSpec,
  blockProblemMessage,
  checkBlockValue,
} from "@/lib/content/registry";
import type { BlockValues } from "@/lib/content/blocks-db";

/** Името на полето във формата: „stoynost-bg". */
export function fieldName(locale: Locale): string {
  return `stoynost-${locale}`;
}

export function parseBlockForm(
  spec: BlockSpec,
  data: FormData,
):
  | { ok: true; value: BlockValues }
  | { ok: false; fieldErrors: Record<string, string> } {
  // collect() иска карта от ParseResult-и и връща ВСИЧКИ грешки наведнъж —
  // три езика, три възможни съобщения, едно изпращане.
  const checked = Object.fromEntries(
    LOCALES.map((locale) => {
      const raw = String(data.get(fieldName(locale)) ?? "");
      const problem = checkBlockValue(spec, locale, raw);

      return [
        fieldName(locale),
        problem
          ? ({ ok: false, error: blockProblemMessage(spec, problem) } as const)
          : ({ ok: true, value: raw.trim() } as const),
      ];
    }),
  );

  const result = collect(checked);
  if (!result.ok) return result;

  const values = result.value as Record<string, string>;
  return {
    ok: true,
    value: {
      bg: values[fieldName("bg")] ?? "",
      de: values[fieldName("de")] ?? "",
      en: values[fieldName("en")] ?? "",
    },
  };
}
