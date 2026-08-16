// АДМИН · задача 17a — заявките за обаждане.
//
// Това е работният екран на института: посетителят е оставил телефон и чака
// да го потърсят. Затова редът е най-новите първо, а филтърът живее в
// адреса — филтриран изглед се препраща и се отваря същият.

import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import {
  CALL_REQUEST_LIMIT,
  CALL_REQUEST_SOURCE_LABELS,
  CALL_REQUEST_STATUSES,
  CALL_REQUEST_STATUS_LABELS,
  countCallRequestsByStatus,
  listCallRequests,
  parseCallRequestStatus,
} from "@/lib/admin/queries";
import { formatDateTime, formatNumber, toDateTimeAttribute } from "@/lib/intl";
import { cn } from "@/lib/utils";
import { CallRequestStatusBadge } from "./status-badge";
import { markContacted } from "./actions";

export const metadata: Metadata = {
  title: "Заявки за обаждане",
  robots: { index: false, follow: false },
};

/** Съобщенията след бързото действие. Идват през адреса — виж Flash. */
const FLASH = {
  potarsen: "Заявката е отбелязана като „Потърсен“.",
};

/** Липсващата стойност се ИЗПИСВА. Тире четецът обявява като нищо. */
function Missing({ children = "няма" }: { children?: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCallRequestsPage({ searchParams }: Props) {
  await requireAdmin();

  const params = await searchParams;
  // Адресите се редактират на ръка и се препращат — непозната стойност се
  // подминава като „без филтър", вместо да гърми с 500.
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = parseCallRequestStatus(raw);

  const [requests, counts] = await Promise.all([
    listCallRequests({ status }),
    countCallRequestsByStatus(),
  ]);

  const total = CALL_REQUEST_STATUSES.reduce(
    (sum, item) => sum + counts[item],
    0,
  );

  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Заявки за обаждане
        </h1>
        <p className="mt-2 text-muted-foreground">
          Най-новите са най-горе. Заявките със статус „Спам“ НЕ се крият —
          скрит списък означава изгубена истинска заявка, сложена там по
          погрешка.
        </p>
      </header>

      <Flash
        query={params}
        success={FLASH}
        errors={commonFlashErrors("Заявката")}
      />

      {/* Филтърът е връзки, не бутони: състоянието е в адреса, значи екранът
          работи и без JavaScript и може да се препрати. */}
      <nav aria-label="Филтър по статус" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/admin/anketi"
              aria-current={!status ? "true" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                !status
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              Всички
              <span className="text-xs opacity-70 tabular-nums">
                ({formatNumber(total, "bg")})
              </span>
            </Link>
          </li>

          {CALL_REQUEST_STATUSES.map((item) => {
            const active = status === item;

            return (
              <li key={item}>
                {/* Без aria-disabled при нула резултата: това прави връзката
                    „unavailable" за четеца, докато с мишка работи. Броят в
                    скобите казва същото, без да лъже. */}
                <Link
                  href={`/admin/anketi?status=${item}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {CALL_REQUEST_STATUS_LABELS[item]}
                  <span className="text-xs opacity-70 tabular-nums">
                    ({formatNumber(counts[item], "bg")})
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Броят се обявява: при смяна на филтъра четецът иначе не разбира, че
          съдържанието се е сменило. */}
      <p
        role="status"
        aria-live="polite"
        className="mt-6 text-sm text-muted-foreground"
      >
        {requests.length === 1
          ? "1 заявка"
          : `${formatNumber(requests.length, "bg")} заявки`}
        {requests.length === CALL_REQUEST_LIMIT
          ? ` — показани са първите ${formatNumber(CALL_REQUEST_LIMIT, "bg")}`
          : ""}
      </p>

      {requests.length === 0 ? (
        <EmptyState
          className="mt-4"
          title={
            status
              ? `Няма заявки със статус „${CALL_REQUEST_STATUS_LABELS[status]}“`
              : "Още няма заявки за обаждане"
          }
          description={
            status
              ? "Махни филтъра, за да видиш всички заявки."
              : "Тук влиза всяка попълнена форма от страница на курс, от „Контакти“ и от теста за ниво."
          }
          action={
            status ? (
              <Link
                href="/admin/anketi"
                className="underline underline-offset-2 hover:no-underline"
              >
                Всички заявки
              </Link>
            ) : null
          }
        />
      ) : (
        <div
          className="mt-4 overflow-x-auto rounded-xl border border-border"
          tabIndex={0}
          role="region"
          aria-label="Заявки за обаждане"
        >
          {/* tabIndex={0} + role="region": контейнерът СЕ ПРЕВЪРТА
            настрани (overflow-x), а превъртаща се област, до която не се
            стига с Tab, е недостъпна за човек без мишка — WCAG 2.1.1
            „Клавиатура". Ролята и името са задължителни заедно с
            tabIndex: спирка на Tab, която четецът обявява само като
            „група", не казва нищо. */}
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Заявки за обаждане, най-новите първо
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Име
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Имейл
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Телефон
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Предпочитан час
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Източник
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Курс
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Получена
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Статус
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-t border-border align-top"
                >
                  {/* Името е заглавие на реда: така четецът обявява „Иван
                      Петров, телефон, +49…" вместо голи стойности. */}
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-medium whitespace-nowrap"
                  >
                    <Link
                      href={`/admin/anketi/${request.id}`}
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      {request.name}
                    </Link>
                  </th>

                  <td className="px-4 py-3">
                    <a
                      href={`mailto:${request.email}`}
                      className="underline underline-offset-2 hover:no-underline"
                    >
                      {request.email}
                    </a>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {request.phone ? (
                      <a
                        href={`tel:${request.phone.replace(/[^+\d]/g, "")}`}
                        className="underline underline-offset-2 hover:no-underline"
                      >
                        {request.phone}
                      </a>
                    ) : (
                      <Missing />
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {request.preferredTime ?? <Missing>без</Missing>}
                  </td>

                  <td className="px-4 py-3">
                    {CALL_REQUEST_SOURCE_LABELS[request.source]}
                  </td>

                  <td className="px-4 py-3">
                    {/* Заглавието на курса, не slug-ът: списъкът се чете от
                        човек. Без връзка към публичната страница — курсът
                        може да е непубликуван и връзката да е 404. */}
                    {request.course ? request.course.title : <Missing />}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* `dateTime` е задължителен при показана дата — четците
                        и сортирането четат него, не текста. */}
                    <time dateTime={toDateTimeAttribute(request.createdAt)}>
                      {formatDateTime(request.createdAt, "bg")}
                    </time>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <CallRequestStatusBadge status={request.status} />
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {request.status === "NEW" ? (
                      <form action={markContacted}>
                        <input type="hidden" name="id" value={request.id} />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-sm font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          Потърсен
                          {/* Бутоните на всички редове пишат едно и също —
                              без името четецът обявява двайсет пъти
                              „Потърсен" и не се разбира кой ред е това. */}
                          <span className="sr-only"> — {request.name}</span>
                        </button>
                      </form>
                    ) : (
                      // „Насрочено", „Затворена" и „Спам" са преценки — те
                      // искат отваряне на заявката, не едно натискане.
                      <span className="text-xs text-muted-foreground">
                        отвори заявката
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
