// АДМИН · един резултат от теста.
//
// Разбивката по нива е по-полезна от общия сбор: 18 от 30 не казва нищо,
// а „A1 и A2 пълни, B1 наполовина, B2 нула" казва точно откъде да тръгне
// човекът. Затова тя стои най-отгоре.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin/guard";
import { getTestResult } from "@/lib/admin/test-results";
import { formatDateTime, formatNumber } from "@/lib/intl";

export const metadata: Metadata = {
  title: "Резултат от теста",
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

export default async function TestResultPage({ params }: Props) {
  await requireAdmin();

  const { id } = await params;
  const result = await getTestResult(id);
  if (!result) notFound();

  const correct = result.answers.filter((answer) => answer.correct).length;
  const unanswered = result.answers.filter(
    (answer) => answer.chosenOptionId === null,
  ).length;

  return (
    <>
      <header className="max-w-2xl">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/testove"
            className="underline underline-offset-4 hover:text-primary"
          >
            Резултати от теста
          </Link>{" "}
          / {formatDateTime(result.createdAt, "bg")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {result.name ?? result.email ?? "без име"}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
          <Badge variant="secondary">{result.resultLevel}</Badge>
          <span>
            {formatNumber(result.score, "bg")} от{" "}
            {formatNumber(result.maxScore, "bg")} точки
          </span>
        </p>
      </header>

      <dl className="mt-8 max-w-2xl border-t border-border">
        <Row label="Имейл" value={result.email ?? "не е посочен"} />
        <Row
          label="Профил на сайта"
          value={result.userEmail ?? "няма (правил е теста като гост)"}
        />
        <Row label="Кога" value={formatDateTime(result.createdAt, "bg")} />
        {/* Отговорите идват от Json колона. Стар запис в друг формат се
            чете като празен масив — тогава „0 от 0" би било лъжа, затова
            се казва честно, че ги няма. */}
        <Row
          label="Верни отговори"
          value={
            result.answers.length > 0
              ? `${formatNumber(correct, "bg")} от ${formatNumber(result.answers.length, "bg")}`
              : "отговорите не са записани в четим вид"
          }
        />
        {unanswered > 0 ? (
          <Row
            label="Пропуснати въпроси"
            value={formatNumber(unanswered, "bg")}
          />
        ) : null}
      </dl>

      {result.byLevel.length > 0 ? (
        <section className="mt-12 max-w-2xl" aria-labelledby="po-niva">
          <h2 id="po-niva" className="font-title text-xl font-semibold">
            Точки по нива
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Тук се вижда докъде стига човекът и къде започва да губи.
          </p>

          <ul className="mt-4 space-y-3">
            {/* Ниво без нито един въпрос се ПРОПУСКА: „0 / 0 (0%)" с празна
                лента се чете като „провалил се е на C2", а всъщност значи
                „за C2 изобщо не е питан". */}
            {result.byLevel
              .filter((cell) => cell.possible > 0)
              .map((cell) => {
              const share =
                cell.possible > 0
                  ? Math.round((cell.earned / cell.possible) * 100)
                  : 0;

              return (
                <li key={cell.level}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{cell.level}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatNumber(cell.earned, "bg")} /{" "}
                      {formatNumber(cell.possible, "bg")} ({share}%)
                    </span>
                  </div>
                  {/* Лентата е ДОПЪЛНЕНИЕ към числата отгоре — числата са
                      носителят, за да се чете и без цвят. */}
                  <div
                    className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
              })}
          </ul>
        </section>
      ) : null}

      {result.answers.length > 0 ? (
        <section className="mt-12 max-w-2xl" aria-labelledby="otgovori">
          <h2 id="otgovori" className="font-title text-xl font-semibold">
            Отговорите
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Пазят се, за да може спорна оценка да се провери.
          </p>

          <ol className="mt-4 space-y-2">
            {result.answers.map((answer, index) => (
              <li
                key={answer.questionId || index}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2 text-sm"
              >
                <span>
                  {index + 1}.{" "}
                  {answer.level ? (
                    <span className="text-muted-foreground">{answer.level}</span>
                  ) : null}
                </span>
                <span>
                  {/* Думата е носителят, цветът е допълнение (WCAG 1.4.1) —
                      затова верният отговор не е само зелена точка. */}
                  {answer.chosenOptionId === null ? (
                    <span className="text-muted-foreground">без отговор</span>
                  ) : answer.correct ? (
                    <span className="font-medium">вярно</span>
                  ) : (
                    <span className="text-destructive">грешно</span>
                  )}{" "}
                  <span className="tabular-nums text-muted-foreground">
                    ({formatNumber(answer.earned, "bg")}/
                    {formatNumber(answer.points, "bg")})
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
