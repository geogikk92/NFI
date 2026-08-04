// АДМИН · един абонат — доказателството и заличаването.
//
// Списъкът показва накратко; тук е пълният запис за случая, в който
// някой поиска справка или заличаване по чл. 15/17 GDPR.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DeleteSection } from "@/components/admin/delete-section";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/guard";
import { getSubscriber } from "@/lib/admin/subscribers";
import { SUBSCRIBER_STATUS_LABELS } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/intl";
import { deleteSubscriberAction, unsubscribeAction } from "../actions";

export const metadata: Metadata = {
  title: "Абонат",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function SubscriberPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;
  const subscriber = await getSubscriber(id);
  if (!subscriber) notFound();

  return (
    <>
      <header className="max-w-2xl">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/abonati"
            className="underline underline-offset-4 hover:text-primary"
          >
            Абонати
          </Link>{" "}
          / {subscriber.email}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight break-all">
          {subscriber.email}
        </h1>
      </header>

      <dl className="mt-8 max-w-2xl border-t border-border">
        <Row label="Име" value={subscriber.name ?? "не е посочено"} />
        <Row
          label="Състояние"
          value={
            <Badge
              variant={
                subscriber.status === "BOUNCED" ? "destructive" : "secondary"
              }
            >
              {SUBSCRIBER_STATUS_LABELS[subscriber.status]}
            </Badge>
          }
        />
        <Row label="Език" value={subscriber.locale.toUpperCase()} />
        <Row label="Записан на" value={formatDateTime(subscriber.createdAt, "bg")} />
        <Row
          label="Потвърдил на"
          value={
            subscriber.confirmedAt
              ? formatDateTime(subscriber.confirmedAt, "bg")
              : "не е потвърдил"
          }
        />
        {subscriber.unsubscribedAt ? (
          <Row
            label="Отписан на"
            value={formatDateTime(subscriber.unsubscribedAt, "bg")}
          />
        ) : null}
        <Row label="IP при записване" value={subscriber.ip ?? "не е записано"} />
      </dl>

      {/* ── Доказателството ── */}
      <section className="mt-12 max-w-2xl" aria-labelledby="saglasie">
        <h2 id="saglasie" className="font-title text-xl font-semibold">
          Доказателство за съгласие
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Това показваме при проверка: кога човекът е поискал бюлетина, кога е
          потвърдил и по коя версия на текста (чл. 7, ал. 1 GDPR).
        </p>

        {subscriber.consents.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Няма записано съгласие. Това е нередност — абонат без съгласие не
            бива да получава писма.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {subscriber.consents.map((consent) => (
              <li key={consent.id} className="border-l-2 border-border pl-4 text-sm">
                <p className="font-medium">Версия {consent.textVersion}</p>
                <p className="text-muted-foreground">
                  Поискано: {formatDateTime(consent.requestedAt, "bg")}
                </p>
                <p className="text-muted-foreground">
                  Потвърдено:{" "}
                  {consent.confirmedAt
                    ? formatDateTime(consent.confirmedAt, "bg")
                    : "не"}
                </p>
                {consent.revokedAt ? (
                  <p className="text-muted-foreground">
                    Оттеглено: {formatDateTime(consent.revokedAt, "bg")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {subscriber.status === "UNSUBSCRIBED" ? null : (
        <form action={unsubscribeAction} className="mt-8">
          <input type="hidden" name="id" value={subscriber.id} />
          <Button type="submit" variant="outline">
            Отпиши от бюлетина
          </Button>
        </form>
      )}

      <DeleteSection
        action={deleteSubscriberAction}
        id={subscriber.id}
        blocked={null}
        what="записа"
        consequence="Абонаментът изчезва напълно. Записът в дневника за съгласие ОСТАВА — той е доказателството, че сме имали право да пишем, и се пази отделно. Ако човекът просто не иска повече писма, по-добре го отпиши."
      />
    </>
  );
}
