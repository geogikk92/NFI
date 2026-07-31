// АДМИН · заявките за превод на документи.
//
// НАЙ-ЧУВСТВИТЕЛНИЯТ СПИСЪК В ПАНЕЛА: имена, имейли и брой лични
// документи. Затова тук няма нищо повече от нужното за работа — самите
// документи се отварят чак в заявката, а токенът за достъп не се показва
// никъде (виж lib/admin/translations.ts).

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import {
  TRANSLATION_OPEN_STATUSES,
  TRANSLATION_STATUSES,
  TRANSLATION_STATUS_LABELS,
  countTranslationsByStatus,
  listTranslations,
  parseTranslationStatus,
} from "@/lib/admin/queries";
import { formatDate, formatNumber, toDateTimeAttribute } from "@/lib/intl";
import { formatMoney } from "@/lib/money";
import { startReview } from "./actions";

export const metadata: Metadata = {
  title: "Преводи",
  robots: { index: false, follow: false },
};

const FLASH = {
  vpregled: "Заявката е отбелязана като „в преглед“.",
  zapisana: "Промените са записани.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminTranslationsPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const status = parseTranslationStatus(query.status);

  const [requests, counts] = await Promise.all([
    listTranslations({ status }),
    countTranslationsByStatus(),
  ]);

  const open = TRANSLATION_OPEN_STATUSES.reduce(
    (sum, key) => sum + counts[key],
    0,
  );
  const total = TRANSLATION_STATUSES.reduce((sum, key) => sum + counts[key], 0);

  const now = new Date();

  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Преводи</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Заявки за заверен превод на документи. Чакат работа:{" "}
          {formatNumber(open, "bg")} от {formatNumber(total, "bg")}.
        </p>
      </header>

      <Flash
        query={query}
        success={FLASH}
        errors={commonFlashErrors("Заявката")}
      />

      {/* Филтърът е връзки, не форма: състоянието е в адреса, значи се
          споделя и се отваря в нов раздел. */}
      <nav aria-label="Филтър по състояние" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/admin/prevodi"
              aria-current={status === null ? "page" : undefined}
              className={
                status === null
                  ? "rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-sm hover:border-primary"
              }
            >
              Всички ({formatNumber(total, "bg")})
            </Link>
          </li>
          {TRANSLATION_STATUSES.filter((key) => counts[key] > 0).map((key) => (
            <li key={key}>
              <Link
                href={`/admin/prevodi?status=${key}`}
                aria-current={status === key ? "page" : undefined}
                className={
                  status === key
                    ? "rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground"
                    : "rounded-full border border-border px-3 py-1 text-sm hover:border-primary"
                }
              >
                {TRANSLATION_STATUS_LABELS[key]} (
                {formatNumber(counts[key], "bg")})
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {requests.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={status ? "Няма заявки в това състояние" : "Още няма заявки за превод"}
          description={
            status
              ? "Смени филтъра, за да видиш останалите."
              : "Заявките идват от клиентите през сайта. Този екран не създава заявки — заявка без клиент няма кой да е дал съгласие за документите си."
          }
        />
      ) : (
        <div
          className="mt-8 overflow-x-auto rounded-xl border border-border"
          tabIndex={0}
          role="region"
          aria-label="Заявки за превод"
        >
          {/* tabIndex={0} + role="region": контейнерът СЕ ПРЕВЪРТА
            настрани (overflow-x), а превъртаща се област, до която не се
            стига с Tab, е недостъпна за човек без мишка — WCAG 2.1.1
            „Клавиатура". Ролята и името са задължителни заедно с
            tabIndex: спирка на Tab, която четецът обявява само като
            „група", не казва нищо. */}
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Заявки за превод с клиент, езикова двойка, оферта, състояние и
              срок за изтриване на документите
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Номер и клиент
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Езици
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Документи
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Оферта
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Състояние
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Триене по GDPR
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                // Срокът за изтриване не е подробност, а задължение
                // (чл. 5, ал. 1, б. „д" GDPR). Изтеклият се вижда веднага.
                const overdue =
                  request.purgeAfter !== null && request.purgeAfter < now;

                return (
                  <tr
                    key={request.id}
                    className="border-t border-border align-top"
                  >
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link
                        href={`/admin/prevodi/${request.id}`}
                        className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {request.number}
                      </Link>
                      <span className="mt-0.5 block text-xs font-normal">
                        {request.name}
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {request.email}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        <time dateTime={toDateTimeAttribute(request.createdAt)}>
                          {formatDate(request.createdAt, "bg")}
                        </time>
                      </span>
                    </th>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {request.sourceLang.toUpperCase()} →{" "}
                      {request.targetLang.toUpperCase()}
                      {request.certified ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          заверен
                        </span>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatNumber(request.documentCount, "bg")}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {request.quotedCents === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatMoney(request.quotedCents, "bg-BG")
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant={
                          TRANSLATION_OPEN_STATUSES.includes(request.status)
                            ? "default"
                            : "outline"
                        }
                      >
                        {TRANSLATION_STATUS_LABELS[request.status]}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {request.purgeAfter === null ? (
                        <span className="text-muted-foreground">
                          не е насрочено
                        </span>
                      ) : (
                        <time
                          dateTime={toDateTimeAttribute(request.purgeAfter)}
                          className={overdue ? "font-medium text-destructive" : ""}
                        >
                          {formatDate(request.purgeAfter, "bg")}
                          {overdue ? " · просрочено" : ""}
                        </time>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {request.status === "SUBMITTED" ? (
                        <form action={startReview}>
                          <input type="hidden" name="id" value={request.id} />
                          <button
                            type="submit"
                            className="rounded-md px-2 py-1 text-sm font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            Поеми
                            <span className="sr-only">
                              {" "}
                              заявка {request.number}
                            </span>
                          </button>
                        </form>
                      ) : (
                        // Оферта, отказ и предаване НЕ се правят с едно
                        // натискане от списък — те са решения.
                        <span className="text-xs text-muted-foreground">
                          отвори заявката
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
