// Задача 6 — резултатът от теста.
//
// Резултатът се чете по id от адреса, за да може линкът да се сподели и
// да се отвори пак. НЕ съдържа лични данни, докато човекът не остави
// имейл — затова е достъпен без вход, но е noindex.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CourseCard } from "@/components/content/course-card";
import { CallRequestForm } from "@/components/content/call-request-form";
import { db } from "@/lib/db";
import { LEVELS, type CourseLevel } from "@/lib/cms/level-test";
import { suggestCoursesForLevel } from "@/lib/cms/level-test-db";
import { toLocale } from "@/lib/i18n/config";
import { levelLabel } from "@/lib/i18n/pages/courses";
import { levelTestCopy, testResultCopy } from "@/lib/i18n/pages/level-test";
import { percent } from "@/lib/i18n/pages/formats";
import { submitCallRequest } from "../../../kontakt/actions";

// Двете полета идват от един адрес — /de/einstufungstest/ergebnis/<id>.
type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: levelTestCopy(toLocale(locale)).result.metaTitle,
    // Личен резултат — не влиза в търсачките.
    robots: { index: false, follow: false },
  };
}

export default async function ErgebnisPage({ params }: Props) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  const t = levelTestCopy(locale).result;

  const result = await db.levelTestResult.findUnique({
    where: { id },
    select: {
      id: true,
      score: true,
      maxScore: true,
      resultLevel: true,
      answers: true,
      createdAt: true,
    },
  });

  if (!result) notFound();

  const level = result.resultLevel as CourseLevel;
  const copy = testResultCopy(locale, level);
  const courses = await suggestCoursesForLevel(level);
  const ratio = result.maxScore > 0 ? result.score / result.maxScore : 0;

  // Разбивката по нива е в Json полето. Чете се защитно — стар запис от
  // предишна версия на теста не бива да събаря страницата.
  const stored = result.answers as { byLevel?: Record<string, { earned: number; possible: number }> } | null;
  const byLevel = stored?.byLevel ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <span className="flagline w-20" aria-hidden />

      <header className="mt-6">
        <p className="kicker">{t.kicker}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {copy.headline}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{copy.body}</p>
      </header>

      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t.estimatedLevel}</p>
            <p className="mt-1 font-display text-3xl">
              {levelLabel(locale, level)}
            </p>
          </div>
          <Badge variant="secondary" className="text-base">
            {t.score(result.score, result.maxScore)} ·{" "}
            {percent(locale, ratio)}
          </Badge>
        </div>

        {byLevel ? (
          <>
            <Separator className="my-6" />
            <h2 className="text-sm font-semibold">{t.byLevelHeading}</h2>
            <ul className="mt-4 space-y-2">
              {LEVELS.filter((item) => (byLevel[item]?.possible ?? 0) > 0).map(
                (item) => {
                  const bucket = byLevel[item];
                  const share = bucket.possible > 0 ? bucket.earned / bucket.possible : 0;

                  return (
                    <li key={item} className="flex items-center gap-3 text-sm">
                      <span className="w-8 shrink-0 font-medium">{item}</span>
                      <span
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(share * 100)}%` }}
                        />
                      </span>
                      {/* Числото е текстово, не само лента — WCAG 1.4.1. */}
                      <span className="w-24 shrink-0 text-right text-muted-foreground">
                        {t.outOf(bucket.earned, bucket.possible)}
                      </span>
                    </li>
                  );
                },
              )}
            </ul>
          </>
        ) : null}

        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          {t.disclaimer}
        </p>
      </div>

      {courses.length > 0 ? (
        <section className="mt-14" aria-labelledby="passende-kurse">
          <h2 id="passende-kurse" className="font-display text-2xl">
            {t.matchingCourses}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2">
            {courses.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-14 rounded-xl border border-border bg-surface-sunken px-6 py-8">
          <h2 className="font-display text-xl">{t.noCourseTitle(level)}</h2>
          <p className="mt-2 text-muted-foreground">{t.noCourseBody}</p>
          <Button asChild className="mt-5">
            <Link href={`/${locale}/kurse`}>{t.allCourses}</Link>
          </Button>
        </section>
      )}

      {/* Третият източник на заявки за обаждане (LEVEL_TEST). */}
      <section className="mt-16" aria-labelledby="beratung">
        <h2 id="beratung" className="font-display text-2xl">
          {t.callbackTitle}
        </h2>
        <p className="mt-3 max-w-prose text-muted-foreground">
          {t.callbackBody}
        </p>

        <div className="mt-8">
          <CallRequestForm
            action={submitCallRequest}
            source="LEVEL_TEST"
            locale={locale}
          />
        </div>
      </section>
    </main>
  );
}
