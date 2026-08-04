// АДМИН · задача 17e — абонатите на бюлетина.
//
// Колоната „съгласие" е тук не за красота: при проверка трябва да може да
// се покаже КОГА и по КОЯ ВЕРСИЯ на текста човекът се е съгласил
// (чл. 7, ал. 1 GDPR). Затова тя стои в списъка, а не скрита в детайл.

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import {
  SUBSCRIBER_LIMIT,
  countSubscribersByStatus,
  listSubscribers,
  parseSubscriberStatus,
} from "@/lib/admin/subscribers";
import {
  SUBSCRIBER_STATUSES,
  SUBSCRIBER_STATUS_LABELS,
  type SubscriberStatus,
} from "@/lib/admin/queries";
import { formatDate, formatNumber } from "@/lib/intl";
import { cn } from "@/lib/utils";
import { unsubscribeAction } from "./actions";

export const metadata: Metadata = {
  title: "Абонати",
  robots: { index: false, follow: false },
};

const FLASH = {
  otpisan: "Абонатът е отписан.",
  iztrit: "Записът е изтрит.",
};

/** Цветът допълва текста, не го замества (WCAG 1.4.1). */
const STATUS_VARIANT: Record<
  SubscriberStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  CONFIRMED: "secondary",
  UNSUBSCRIBED: "outline",
  BOUNCED: "destructive",
};

function Missing({ children = "няма" }: { children?: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSubscribersPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const rawStatus = Array.isArray(query.status) ? query.status[0] : query.status;
  const status = parseSubscriberStatus(rawStatus);
  const search = Array.isArray(query.tarsene) ? query.tarsene[0] : query.tarsene;

  const [subscribers, counts] = await Promise.all([
    listSubscribers({ status, search }),
    countSubscribersByStatus(),
  ]);

  const total = SUBSCRIBER_STATUSES.reduce((sum, key) => sum + counts[key], 0);

  return (
    <>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Абонати</h1>
        <p className="mt-2 text-muted-foreground">
          Хората, записани за бюлетина. Записват се сами, с потвърждение по
          имейл — оттук само се преглеждат, отписват и заличават.
        </p>
      </header>

      <Flash query={query} success={FLASH} errors={commonFlashErrors("Записът")} />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="Филтър по състояние">
          <FilterLink label="Всички" count={total} active={!status} href="/admin/abonati" />
          {SUBSCRIBER_STATUSES.map((key) => (
            <FilterLink
              key={key}
              label={SUBSCRIBER_STATUS_LABELS[key]}
              count={counts[key]}
              active={status === key}
              href={`/admin/abonati?status=${key}`}
            />
          ))}
        </nav>

        {/* Нативна GET форма: работи без JavaScript и оставя търсенето в
            адреса, тоест намереното се препраща. */}
        <form className="flex gap-2" role="search">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="tarsene" className="sr-only">
            Търсене по имейл
          </label>
          <input
            id="tarsene"
            name="tarsene"
            type="search"
            defaultValue={search ?? ""}
            placeholder="търси по имейл"
            className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" variant="outline" size="sm">
            Търси
          </Button>
        </form>
      </div>

      {subscribers.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={
            search
              ? "Няма съвпадение"
              : status
                ? "Няма абонати в това състояние"
                : "Още няма абонати"
          }
          description={
            search
              ? "Опитай с друга част от имейла."
              : status
                ? "Абонати има, но нито един не е в това състояние."
                : "Първият ще се появи тук, щом някой се запише от футъра на сайта и потвърди по имейл."
          }
          action={
            search || status ? (
              <Button asChild variant="outline">
                <Link href="/admin/abonati">Виж всички</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            className="mt-8 overflow-x-auto rounded-xl border border-border"
            tabIndex={0}
            role="region"
            aria-label="Абонати"
          >
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Абонати с имейл, състояние, език и доказателство за съгласие
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Имейл
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Състояние
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Език
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Съгласие
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Действие
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="border-t border-border align-top">
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link
                        href={`/admin/abonati/${subscriber.id}`}
                        className="break-all underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {subscriber.email}
                      </Link>
                      {subscriber.name ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {subscriber.name}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[subscriber.status]}>
                        {SUBSCRIBER_STATUS_LABELS[subscriber.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 uppercase">{subscriber.locale}</td>
                    <td className="px-4 py-3">
                      {subscriber.confirmedAt ? (
                        <>
                          {formatDate(subscriber.confirmedAt, "bg")}
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            версия {subscriber.consentTextVersion ?? "не е записана"}
                          </span>
                        </>
                      ) : (
                        <Missing>не е потвърдено</Missing>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {subscriber.status === "UNSUBSCRIBED" ? (
                        <span className="text-xs text-muted-foreground">
                          отписан{" "}
                          {subscriber.unsubscribedAt
                            ? formatDate(subscriber.unsubscribedAt, "bg")
                            : ""}
                        </span>
                      ) : (
                        <form action={unsubscribeAction} className="inline">
                          <input type="hidden" name="id" value={subscriber.id} />
                          <Button type="submit" variant="outline" size="sm">
                            Отпиши
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subscribers.length === SUBSCRIBER_LIMIT ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Показани са последните {formatNumber(SUBSCRIBER_LIMIT, "bg")}.
              Използвай търсенето, за да стигнеш до по-стар запис.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}

function FilterLink({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border hover:bg-muted",
      )}
    >
      {label} ({formatNumber(count, "bg")})
    </a>
  );
}
