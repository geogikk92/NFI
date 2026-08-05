// АДМИН · една заявка за превод.
//
// Показва описанието на документите, НЕ съдържанието им: име, размер,
// страници. Толкова е нужно за оферта, а всичко над необходимото върху
// лични документи е излишен риск (чл. 5, ал. 1, б. „в" GDPR).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { TranslationForm } from "@/components/admin/translation-form";
import { requireAdmin } from "@/lib/admin/guard";
import {
  getTranslationForEdit,
  translationVatRate,
} from "@/lib/admin/translations";
import {
  TRANSLATION_OPEN_STATUSES,
  TRANSLATION_STATUS_LABELS,
  TRANSLATION_STATUS_OPTIONS,
} from "@/lib/admin/queries";
import { formatDate, formatDateTime, toDateTimeAttribute } from "@/lib/intl";
import { formatMoney } from "@/lib/money";
import { s3Configured } from "@/lib/storage";
import { saveTranslation } from "../actions";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Заявка за превод",
  robots: { index: false, follow: false },
};

/** Състоянията, при които офертата е задължителна — огледало на сървъра. */
const QUOTE_REQUIRED = ["QUOTED", "QUOTE_ACCEPTED", "QUOTE_DECLINED"];

/** Байтове → нещо, което човек чете. */
function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TranslationPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;
  const request = await getTranslationForEdit(id);

  if (!request) notFound();

  const now = new Date();
  const overdue = request.purgeAfter !== null && request.purgeAfter < now;
  const sources = request.documents.filter((doc) => doc.isSource);
  const results = request.documents.filter((doc) => !doc.isSource);

  // От 17m-b хранилището е реализация с два драйвера: локален диск за
  // разработка и S3/R2 за продукция. Единственият случай без хранилище
  // е продукция БЕЗ конфигуриран S3 — на Vercel локалният диск изчезва
  // при всеки deploy. Проверката е ОБЩАТА s3Configured(), не ръчен
  // поглед в process.env: две отделни проверки се разминават при
  // частична конфигурация.
  const storageReady =
    s3Configured() || process.env.NODE_ENV !== "production";

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/prevodi" className="underline hover:text-primary">
          Преводи
        </Link>
        <span aria-hidden> › </span>
        <span>{request.number}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {request.number}
        </h1>
        <Badge
          variant={
            TRANSLATION_OPEN_STATUSES.includes(request.status)
              ? "default"
              : "outline"
          }
        >
          {TRANSLATION_STATUS_LABELS[request.status]}
        </Badge>
      </header>

      {/* Срокът за изтриване стои НАЙ-ОТГОРЕ, не в подножието: това е
          задължение по чл. 5, ал. 1, б. „д" GDPR, а не подробност. */}
      {request.purgeAfter ? (
        <p
          role={overdue ? "alert" : undefined}
          className={
            overdue
              ? "mt-6 max-w-3xl rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              : "mt-6 max-w-3xl rounded-lg border border-border bg-surface-sunken px-4 py-3 text-sm text-muted-foreground"
          }
        >
          {overdue ? (
            <>
              <strong>Срокът за съхранение е изтекъл</strong> на{" "}
              <time dateTime={toDateTimeAttribute(request.purgeAfter)}>
                {formatDate(request.purgeAfter, "bg")}
              </time>
              . Документите е трябвало вече да са изтрити. Провери дали
              cron-ът за срокове работи.
            </>
          ) : (
            <>
              Документите се трият автоматично на{" "}
              <time dateTime={toDateTimeAttribute(request.purgeAfter)}>
                {formatDate(request.purgeAfter, "bg")}
              </time>{" "}
              — GDPR не позволява да се пазят по-дълго от нужното.
            </>
          )}
        </p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <TranslationForm
            action={saveTranslation}
            statuses={TRANSLATION_STATUS_OPTIONS}
            quoteRequiredFor={QUOTE_REQUIRED}
            vatRate={translationVatRate()}
            request={{
              id: request.id,
              status: request.status,
              quotedCents: request.quotedCents,
              quoteExpiresAt: request.quoteExpiresAt,
              notes: request.notes,
            }}
          />

          <section className="mt-12" aria-labelledby="dokumenti">
            <h2 id="dokumenti" className="text-xl font-semibold">
              Документи
            </h2>

            {!storageReady ? (
              // ЧЕСТНО, вместо бутон, който дава грешка. Хранилището още е
              // договорка (lib/storage/index.ts), не реализация.
              <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                <strong>Файловете още не могат да се свалят.</strong> Липсва
                хранилището (S3/R2) — до него описанието отдолу е всичко, с
                което разполагаме. Клиентът праща документите по имейл
                междувременно.
              </p>
            ) : null}

            <h3 className="mt-6 text-sm font-semibold">
              Качени от клиента ({sources.length})
            </h3>
            {sources.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Няма качени документи.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                {sources.map((doc) => (
                  <li key={doc.id} className="px-4 py-3 text-sm">
                    <p className="font-medium break-all">{doc.filename}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fileSize(doc.sizeBytes)}
                      {doc.pages ? ` · ${doc.pages} стр.` : ""} ·{" "}
                      {doc.mimeType}
                    </p>
                    {doc.purgedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Изтрит на{" "}
                        <time dateTime={toDateTimeAttribute(doc.purgedAt)}>
                          {formatDate(doc.purgedAt, "bg")}
                        </time>{" "}
                        по срока за съхранение.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-8 text-sm font-semibold">
              Готов превод ({results.length})
            </h3>
            {results.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Още няма качен превод.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                {results.map((doc) => (
                  <li key={doc.id} className="px-4 py-3 text-sm">
                    <p className="font-medium break-all">{doc.filename}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fileSize(doc.sizeBytes)} · {doc.mimeType}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Клиент</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Име</dt>
                <dd>{request.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Имейл</dt>
                <dd className="break-all">
                  <a
                    href={`mailto:${request.email}`}
                    className="underline hover:text-primary"
                  >
                    {request.email}
                  </a>
                </dd>
              </div>
              {request.phone ? (
                <div>
                  <dt className="text-muted-foreground">Телефон</dt>
                  <dd>
                    <a
                      href={`tel:${request.phone.replace(/\s/g, "")}`}
                      className="underline hover:text-primary"
                    >
                      {request.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Езици</dt>
                <dd>
                  {request.sourceLang.toUpperCase()} →{" "}
                  {request.targetLang.toUpperCase()}
                  {request.certified ? " · заверен" : ""}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Подадена</dt>
                <dd>
                  <time dateTime={toDateTimeAttribute(request.createdAt)}>
                    {formatDateTime(request.createdAt, "bg")}
                  </time>
                </dd>
              </div>
              {request.quotedAt ? (
                <div>
                  <dt className="text-muted-foreground">Оферта</dt>
                  <dd>
                    {request.quotedCents === null
                      ? "—"
                      : formatMoney(request.quotedCents, "bg-BG")}
                    {request.quotedVatRate ? (
                      <span className="block text-xs text-muted-foreground">
                        с ДДС {request.quotedVatRate} %, изпратена на{" "}
                        <time dateTime={toDateTimeAttribute(request.quotedAt)}>
                          {formatDate(request.quotedAt, "bg")}
                        </time>
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
              {request.deliveredAt ? (
                <div>
                  <dt className="text-muted-foreground">Предадена</dt>
                  <dd>
                    <time dateTime={toDateTimeAttribute(request.deliveredAt)}>
                      {formatDate(request.deliveredAt, "bg")}
                    </time>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
