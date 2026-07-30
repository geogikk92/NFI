// АДМИН · задача 17a — таблото.
//
// Само реални числа от базата. Без графики и без „+12% спрямо миналия
// месец": измислена статистика в админ панел се приема за истина и после се
// решава по нея.

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import {
  CALL_REQUEST_STATUSES,
  CALL_REQUEST_STATUS_LABELS,
  DASHBOARD_RECENT_WINDOW_DAYS,
  SUBSCRIBER_STATUSES,
  SUBSCRIBER_STATUS_LABELS,
  getDashboardStats,
} from "@/lib/admin/queries";
import { formatNumber } from "@/lib/intl";

export const metadata: Metadata = {
  title: "Табло",
  robots: { index: false, follow: false },
};

/**
 * Едно число с етикет.
 *
 * `<dt>`/`<dd>` вътре в `<dl>`, а не два `<div>`-а: така четецът обявява
 * „Курсове, общо: 12" вместо два несвързани текста. Обвивката `<div>` в
 * `<dl>` е позволена от HTML и позволява рамката на плочката.
 */
function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tabular-nums">
        {formatNumber(value, "bg")}
      </dd>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const stats = await getDashboardStats();

  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Табло</h1>
        <p className="mt-2 text-muted-foreground">
          Всички числа идват от базата в момента на отварянето на страницата.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Заявки за обаждане</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          За обработване: {formatNumber(stats.callRequests.open, "bg")} (нови и
          потърсени). Общо: {formatNumber(stats.callRequests.total, "bg")}.
        </p>

        <div className="mt-4 max-w-xl overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Заявки за обаждане по статус, с брой
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-2 text-left font-medium"
                >
                  Статус
                </th>
                <th
                  scope="col"
                  className="px-4 py-2 text-right font-medium"
                >
                  Брой
                </th>
              </tr>
            </thead>
            <tbody>
              {CALL_REQUEST_STATUSES.map((status) => (
                <tr key={status} className="border-t border-border">
                  {/* Статусът е заглавие на РЕДА — иначе четецът чете
                      голото число без да казва на какво е брой. */}
                  <th
                    scope="row"
                    className="px-4 py-2 text-left font-normal"
                  >
                    {/* Връзка към вече филтрирания списък: това е първото,
                        което човек прави, като види числото. */}
                    <Link
                      href={`/admin/anketi?status=${status}`}
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      {CALL_REQUEST_STATUS_LABELS[status]}
                    </Link>
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatNumber(stats.callRequests.byStatus[status], "bg")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-sm">
          <Link
            href="/admin/anketi"
            className="underline underline-offset-2 hover:no-underline"
          >
            Всички заявки
          </Link>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Съдържание</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Курсове"
            value={stats.courses.total}
            hint={`Публикувани: ${formatNumber(stats.courses.published, "bg")}`}
          />
          <Stat
            label="Продукти в магазина"
            value={stats.products.total}
            hint={`Публикувани: ${formatNumber(stats.products.published, "bg")}`}
          />
          <Stat
            label="Резултати от теста за ниво"
            value={stats.levelTests.total}
            hint={`Последните ${DASHBOARD_RECENT_WINDOW_DAYS} дни: ${formatNumber(
              stats.levelTests.last30Days,
              "bg",
            )}`}
          />
          <Stat
            label="Абонати за бюлетина"
            value={stats.subscribers.total}
            hint={`Потвърдени: ${formatNumber(
              stats.subscribers.byStatus.CONFIRMED,
              "bg",
            )}`}
          />
        </dl>

        <p className="mt-3 text-sm">
          <Link
            href="/admin/kursove"
            className="underline underline-offset-2 hover:no-underline"
          >
            Списък на курсовете
          </Link>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Бюлетин</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Абонат се брои чак след потвърждение по имейл (double opt-in) —
          „очаква потвърждение“ още не е абонат и не получава писма.
        </p>

        <div className="mt-4 max-w-xl overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Абонати по статус, с брой</caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium">
                  Статус
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Брой
                </th>
              </tr>
            </thead>
            <tbody>
              {SUBSCRIBER_STATUSES.map((status) => (
                <tr key={status} className="border-t border-border">
                  <th scope="row" className="px-4 py-2 text-left font-normal">
                    {SUBSCRIBER_STATUS_LABELS[status]}
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatNumber(stats.subscribers.byStatus[status], "bg")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
