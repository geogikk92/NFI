// АДМИН · задача 17e — резултатите от теста за ниво.
//
// Това е лийд списък: всеки ред е човек, който току-що е разбрал на какво
// ниво е и най-вероятно чака да го потърсят. Колоната „заявка" казва дали
// е оставил телефон — самата заявка се работи в „Заявки за обаждане".

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/content/states";
import { requireAdmin } from "@/lib/admin/guard";
import {
  TEST_RESULT_LIMIT,
  countTestResultsByLevel,
  listTestResults,
} from "@/lib/admin/test-results";
import { COURSE_LEVELS, type CourseLevel } from "@/lib/admin/queries";
import { formatDateTime, formatNumber } from "@/lib/intl";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Резултати от теста",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function Missing({ children = "няма" }: { children?: string }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export default async function AdminTestResultsPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const raw = Array.isArray(query.nivo) ? query.nivo[0] : query.nivo;
  // Непозната стойност се подминава като „без филтър", вместо да гърми.
  const level = COURSE_LEVELS.includes(raw as CourseLevel)
    ? (raw as CourseLevel)
    : null;

  const [results, counts] = await Promise.all([
    listTestResults({ level }),
    countTestResultsByLevel(),
  ]);

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Резултати от теста
        </h1>
        <p className="mt-2 text-muted-foreground">
          Всеки ред е човек, който е разбрал на какво ниво е. Записът не се
          редактира — той е доказателство какво е отговорил.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Филтър по ниво">
        <FilterLink
          label="Всички"
          count={total}
          active={!level}
          href="/admin/testove"
        />
        {COURSE_LEVELS.map((item) => (
          <FilterLink
            key={item}
            label={item}
            count={counts[item] ?? 0}
            active={level === item}
            href={`/admin/testove?nivo=${item}`}
          />
        ))}
      </nav>

      {results.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={level ? "Няма резултати с това ниво" : "Още никой не е правил теста"}
          description="Тестът е на страница „Тест за ниво“ и завършва със заявка за обаждане."
        />
      ) : (
        <>
          <div
            className="mt-8 overflow-x-auto rounded-xl border border-border"
            tabIndex={0}
            role="region"
            aria-label="Резултати от теста"
          >
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">
                Резултати с име, имейл, точки, ниво и дата
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Човек
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Точки
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Ниво
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Кога
                  </th>
                  <th scope="col" className="px-4 py-3 text-left font-medium">
                    Заявка
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-t border-border align-top">
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link
                        href={`/admin/testove/${result.id}`}
                        className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {result.name ?? result.email ?? "без име"}
                      </Link>
                      {result.email && result.name ? (
                        <span className="mt-0.5 block text-xs font-normal break-all text-muted-foreground">
                          {result.email}
                        </span>
                      ) : null}
                      {result.hasAccount ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          има профил
                        </span>
                      ) : null}
                    </th>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {formatNumber(result.score, "bg")} /{" "}
                      {formatNumber(result.maxScore, "bg")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{result.resultLevel}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDateTime(result.createdAt, "bg")}
                    </td>
                    {/* Заявките нямат детайлна страница, затова тук стои
                        само ДАЛИ има заявка. Връзка към общия списък би
                        обещала, че води до тази конкретна заявка. */}
                    <td className="px-4 py-3">
                      {result.callRequestId ? (
                        "остави телефон"
                      ) : (
                        <Missing>без заявка</Missing>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.length === TEST_RESULT_LIMIT ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Показани са последните {formatNumber(TEST_RESULT_LIMIT, "bg")}.
              За по-стари стесни с филтъра по ниво.
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
    <Link
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
    </Link>
  );
}
