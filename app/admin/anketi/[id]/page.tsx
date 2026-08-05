// АДМИН · една заявка за обаждане.
//
// Екранът, който се отваря с телефон в ръка. Затова подредбата не е по
// важност на данните, а по реда на разговора: първо какво е написал
// човекът, после решението, а следата от подаването — най-долу, където
// се гледа само при съмнение за бот.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CallRequestForm } from "@/components/admin/call-request-form";
import { requireAdmin } from "@/lib/admin/guard";
import {
  MAX_NOTE_LENGTH,
  getCallRequestForEdit,
  isAutomaticNote,
} from "@/lib/admin/call-requests";
import {
  CALL_REQUEST_SOURCE_LABELS,
  CALL_REQUEST_STATUS_OPTIONS,
} from "@/lib/admin/queries";
import { formatDateTime, toDateTimeAttribute } from "@/lib/intl";
import { CallRequestStatusBadge } from "../status-badge";
import { saveCallRequest } from "../actions";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Заявка за обаждане",
  robots: { index: false, follow: false },
};

/** Липсващата стойност се ИЗПИСВА. Тире четецът обявява като нищо. */
function Missing({ children = "няма" }: { children?: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export default async function CallRequestPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;
  const request = await getCallRequestForEdit(id);

  if (!request) notFound();

  const automaticNote = isAutomaticNote(request.handledNote);

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/anketi" className="underline hover:text-primary">
          Заявки за обаждане
        </Link>
        <span aria-hidden> › </span>
        <span>{request.name}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {request.name}
        </h1>
        <CallRequestStatusBadge status={request.status} />
      </header>

      {/* Телефонът е причината този екран да съществува — стои най-горе и е
          връзка, за да се набира с едно натискане от телефон. */}
      <p className="mt-3 text-lg">
        {request.phone ? (
          <a
            href={`tel:${request.phone.replace(/[^+\d]/g, "")}`}
            className="font-medium underline underline-offset-4 hover:text-primary"
          >
            {request.phone}
          </a>
        ) : (
          <Missing>без телефон — само имейл</Missing>
        )}
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          {request.message ? (
            <section className="mb-10" aria-labelledby="sabshtenie">
              <h2 id="sabshtenie" className="text-sm font-semibold">
                Какво е написал
              </h2>
              {/* `whitespace-pre-line` пази редовете на човека. Без него
                  изброяване, написано на нови редове, се слепва в абзац. */}
              <p className="mt-2 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-sm whitespace-pre-line">
                {request.message}
              </p>
            </section>
          ) : null}

          <CallRequestForm
            action={saveCallRequest}
            statuses={CALL_REQUEST_STATUS_OPTIONS}
            maxNote={MAX_NOTE_LENGTH}
            noteIsAutomatic={automaticNote}
            request={{
              id: request.id,
              status: request.status,
              handledNote: request.handledNote,
            }}
          />
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Заявката</h2>
            <dl className="mt-3 space-y-2 text-sm">
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

              <div>
                <dt className="text-muted-foreground">Предпочитан час</dt>
                <dd>{request.preferredTime ?? <Missing>без</Missing>}</dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Източник</dt>
                <dd>{CALL_REQUEST_SOURCE_LABELS[request.source]}</dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Курс</dt>
                {/* Заглавието, не slug-ът, и без връзка към публичната
                    страница: курсът може да е непубликуван и връзката да
                    е 404 точно докато човекът чака на телефона. */}
                <dd>{request.course ? request.course.title : <Missing />}</dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Получена</dt>
                <dd>
                  <time dateTime={toDateTimeAttribute(request.createdAt)}>
                    {formatDateTime(request.createdAt, "bg")}
                  </time>
                </dd>
              </div>

              <div>
                <dt className="text-muted-foreground">Обработена</dt>
                <dd>
                  {request.handledAt ? (
                    <time dateTime={toDateTimeAttribute(request.handledAt)}>
                      {formatDateTime(request.handledAt, "bg")}
                    </time>
                  ) : (
                    <Missing>още не</Missing>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Следата от подаването — пази се нарочно, „за да можем да
              разпознаем ботовете със задна дата" (prisma/schema/content.prisma).
              Сгъната, защото при истинска заявка не носи нищо, а IP адресът
              е лични данни: показва се, когато някой го потърси. */}
          <details className="mt-4 rounded-xl border border-border bg-card p-5">
            <summary className="cursor-pointer text-sm font-semibold">
              Следа от подаването
            </summary>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">IP адрес</dt>
                <dd className="break-all">{request.ip ?? <Missing />}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Браузър</dt>
                <dd className="break-all text-xs">
                  {request.userAgent ?? <Missing />}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Гледа се само при съмнение за бот. Един и същ IP с десет заявки
              за час е спрян от ограничението още при подаването.
            </p>
          </details>
        </aside>
      </div>
    </>
  );
}
