"use client";

// АДМИН · формата за един текстов блок.
//
// ЕДИН блок на екран, три езика един под друг. Не цяла страница наведнъж:
// formValues() връща цялата форма през RSC пратката при всяка грешка, а
// FormStatus мести фокуса на върха след изпращане — при 60 полета това е
// дълъг скрол и загубено място. Пък и така работи човек: сяда да оправи
// един абзац, не да пренапише страница.
//
// Броячът на знаци е в БРАУЗЪРА, защото сървърната проверка идва след
// „Запази“ — а тя трябва да разбере, че текстът е дълъг, ДОКАТО пише.

import { useActionState, useState } from "react";
import { TextField, TextareaField } from "@/components/admin/fields";
import { FormStatus, SubmitButton } from "@/components/admin/form-shell";
import { IDLE, type AdminFormState } from "@/lib/admin/form";
import { toParagraphs } from "@/lib/content/registry";

export interface BlockFormValues {
  key: string;
  label: string;
  help: string;
  kind: "prose" | "line" | "date" | "number";
  max: { bg: number; de: number; en: number };
  /** Началните стойности: черновата, ако има, иначе публикуваното. */
  values: { bg: string; de: string; en: string };
  /** Стойността от кода, ако блокът има такава. */
  code: { bg: string; de: string; en: string } | null;
}

interface Props {
  block: BlockFormValues;
  saveDraft: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
  publish: (prev: AdminFormState, data: FormData) => Promise<AdminFormState>;
}

const LOCALE_LABELS = {
  bg: "Български",
  de: "Deutsch (немски)",
  en: "English (английски)",
} as const;

type LocaleKey = keyof typeof LOCALE_LABELS;

export function BlockForm({ block, saveDraft, publish }: Props) {
  // Две действия върху ЕДНА форма: коя от двете е натисната решава кой
  // action се вика. Държим ги разделени, за да са различни съобщенията.
  const [draftState, draftAction] = useActionState(saveDraft, IDLE);
  const [publishState, publishAction] = useActionState(publish, IDLE);

  const state = publishState.status !== "idle" ? publishState : draftState;
  const errors = state.fieldErrors ?? {};
  const sent = state.values ?? {};

  const initial = (locale: LocaleKey) =>
    sent[`stoynost-${locale}`] ?? block.values[locale] ?? "";

  const [text, setText] = useState<Record<LocaleKey, string>>({
    bg: initial("bg"),
    de: initial("de"),
    en: initial("en"),
  });

  const multiline = block.kind === "prose";

  return (
    <form className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <input type="hidden" name="key" value={block.key} />

      <div className="grid gap-6">
        <FormStatus state={state} />

        {(Object.keys(LOCALE_LABELS) as LocaleKey[]).map((locale) => {
          const name = `stoynost-${locale}`;
          const limit = block.max[locale];
          const used = text[locale].trim().length;
          const left = limit - used;

          const counter =
            left < 0
              ? `Надвишен с ${-left} знака — толкова текст излиза извън мястото си.`
              : `Остават ${left} от ${limit} знака.`;

          const shared = {
            name,
            label: LOCALE_LABELS[locale],
            error: errors[name],
            hint: counter,
            defaultValue: text[locale],
          };

          return multiline ? (
            <TextareaField
              key={locale}
              {...shared}
              rows={locale === "bg" ? 10 : 8}
              onValueChange={(value) =>
                setText((current) => ({ ...current, [locale]: value }))
              }
            />
          ) : (
            <TextField
              key={locale}
              {...shared}
              defaultValue={undefined}
              value={text[locale]}
              onChange={(event) =>
                setText((current) => ({
                  ...current,
                  [locale]: event.target.value,
                }))
              }
            />
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton formAction={draftAction} variant="outline" pendingLabel="Записва се…">
            Запази черновата
          </SubmitButton>
          <SubmitButton formAction={publishAction} pendingLabel="Публикува се…">
            Публикувай
          </SubmitButton>
        </div>

        <p className="text-sm text-muted-foreground">
          Черновата е само за теб — виждаш я с бутона „Виж как изглежда“.
          Публикуването я показва на посетителите.
        </p>
      </div>

      {/* ── Жив преглед ── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-mono text-2xs uppercase tracking-kicker text-muted-foreground">
          Така изглежда текстът
        </h2>

        <div className="mt-3 rounded-xl border border-border bg-card p-5">
          {text.bg.trim() ? (
            <div className="prose prose-sm max-w-none">
              {multiline ? (
                toParagraphs(text.bg).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              ) : (
                <p>{text.bg}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Още няма текст на български.
            </p>
          )}
        </div>

        {block.code ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-4">
            <p className="text-2xs uppercase tracking-kicker text-muted-foreground">
              Оригинал в сайта
            </p>
            <p className="mt-1.5 text-sm">{block.code.bg}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Това се показва, докато не запишеш свой текст.
            </p>
          </div>
        ) : null}
      </aside>
    </form>
  );
}
