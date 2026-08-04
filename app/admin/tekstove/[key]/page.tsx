// АДМИН · Текстове — редакция на един блок.
//
// Един блок на екран, три езика, жив преглед отстрани. Нищо друго.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { BlockForm } from "@/components/admin/block-form";
import { requireAdmin } from "@/lib/admin/guard";
import { blockForEditor } from "@/lib/content/blocks-db";
import { PAGE_LABELS } from "@/lib/content/registry";
import { formatDateTime } from "@/lib/intl";
import {
  discardDraftAction,
  enablePreview,
  publishAction,
  revertAction,
  saveDraftAction,
} from "../actions";

export const metadata: Metadata = {
  title: "Редакция на текст",
  robots: { index: false, follow: false },
};

const FLASH = {
  vurnat: "Текстът е върнат към оригинала от сайта.",
  chernova: "Черновата е изхвърлена.",
};

type Props = {
  params: Promise<{ key: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditTextPage({ params, searchParams }: Props) {
  await requireAdmin();

  const { key } = await params;
  const query = await searchParams;

  const block = await blockForEditor(decodeURIComponent(key));
  if (!block) notFound();

  const { spec } = block;

  return (
    <>
      <header className="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/tekstove"
            className="underline underline-offset-4 hover:text-primary"
          >
            Текстове
          </Link>{" "}
          / {PAGE_LABELS[spec.page]}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {spec.label}
        </h1>
        <p className="mt-2 text-muted-foreground">{spec.help}</p>

        {spec.kind === "prose" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Пиши както в имейл. Празен ред между два абзаца прави нов абзац.
            Не слагай форматиране — то идва само.
          </p>
        ) : null}
      </header>

      <Flash
        query={query}
        success={FLASH}
        errors={commonFlashErrors("Текстът")}
      />

      {block.drifted ? (
        <p className="mt-6 max-w-3xl rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Оригиналът в сайта се е променил, откакто си записала своя текст.
          Виж дали твоят още е верен — или го върни към новия оригинал.
        </p>
      ) : null}

      {block.draft ? (
        <div className="mt-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm">
            Има незапазена чернова
            {block.draftUpdatedAt
              ? ` от ${formatDateTime(block.draftUpdatedAt, "bg")}`
              : ""}
            . Тя още не се вижда на сайта.
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={enablePreview}>
              <input type="hidden" name="key" value={spec.key} />
              <Button type="submit" variant="outline" size="sm">
                Виж как изглежда
              </Button>
            </form>
            <form action={discardDraftAction}>
              <input type="hidden" name="key" value={spec.key} />
              <Button type="submit" variant="outline" size="sm">
                Изхвърли черновата
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <BlockForm
          block={{
            key: spec.key,
            label: spec.label,
            help: spec.help,
            kind: spec.kind,
            max: spec.max,
            // Черновата е по-новото състояние — тя влиза в полетата.
            values: block.draft ?? block.published,
            code: block.code,
          }}
          saveDraft={saveDraftAction}
          publish={publishAction}
        />
      </div>

      {block.code ? (
        <details className="mt-12 max-w-3xl rounded-xl border border-border">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Върни оригинала
          </summary>
          <div className="border-t border-border px-5 py-5">
            <p className="text-sm leading-relaxed">
              Изтрива твоя текст и връща онова, което пише в сайта по
              подразбиране: „{block.code.bg}“. Може да напишеш свой пак по
              всяко време.
            </p>
            <form action={revertAction} className="mt-4">
              <input type="hidden" name="key" value={spec.key} />
              <Button type="submit" variant="outline">
                Върни оригинала
              </Button>
            </form>
          </div>
        </details>
      ) : null}
    </>
  );
}
