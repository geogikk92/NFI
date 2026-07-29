// ТЕРИТОРИЯ НА БОБИ · задача 4 — списък на курсовете.
// Писано от Жоро, докато Боби е в отпуск.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/content/course-card";
import { EmptyState } from "@/components/content/states";
import {
  COURSE_LEVELS,
  LEVEL_LABELS,
  countCoursesByLevel,
  listCourses,
  parseFormat,
  parseLevel,
} from "@/lib/cms/courses";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kurse",
  description:
    "Deutschkurse von A1 bis C2 — Präsenz, Online und Hybrid. Kleine Gruppen, Prüfungsvorbereitung.",
};

export const revalidate = 300;

type Props = {
  searchParams: Promise<{ level?: string; format?: string }>;
};

export default async function CoursesPage({ searchParams }: Props) {
  const params = await searchParams;
  // Непозната стойност в адреса се игнорира, вместо да гърми — адресите
  // се споделят и редактират на ръка.
  const level = parseLevel(params.level);
  const format = parseFormat(params.format);

  const [courses, counts] = await Promise.all([
    listCourses({ level, format }),
    countCoursesByLevel(),
  ]);

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">Kurse</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Deutsch lernen in Nürnberg
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Von den ersten Wörtern bis zur Prüfung — in kleinen Gruppen, mit
          Lehrkräften, die beide Sprachen kennen.
        </p>
      </header>

      {/* Филтърът е връзки, не бутони: състоянието живее в адреса, значи
          страницата се споделя и работи без JavaScript. */}
      <nav aria-label="Nach Niveau filtern" className="mt-12">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/kurse"
              aria-current={!level ? "true" : undefined}
              className={cn(
                "inline-flex rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                !level
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              Alle
            </Link>
          </li>
          {COURSE_LEVELS.map((item) => {
            const count = counts[item];
            const active = level === item;

            return (
              <li key={item}>
                <Link
                  href={`/kurse?level=${item}`}
                  aria-current={active ? "true" : undefined}
                  aria-disabled={count === 0 ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : count === 0
                        ? "pointer-events-none border-border text-subtle"
                        : "border-border hover:bg-muted",
                  )}
                >
                  {item}
                  <span className="text-xs opacity-70">({count})</span>
                  <span className="sr-only">
                    {" "}
                    — {LEVEL_LABELS[item]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Броят на резултатите се обявява — иначе при филтриране екранният
          четец не разбира, че съдържанието се е сменило. */}
      <p role="status" aria-live="polite" className="mt-8 text-sm text-muted-foreground">
        {courses.length === 1
          ? "1 Kurs gefunden"
          : `${courses.length} Kurse gefunden`}
      </p>

      {courses.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Für dieses Niveau ist gerade kein Kurs geplant"
          description="Melden Sie sich — wir informieren Sie, sobald ein passender Kurs startet, oder finden eine andere Lösung."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/kontakt">Beratung anfragen</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/kurse">Alle Kurse zeigen</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      )}

      <section className="mt-20 rounded-xl border border-border bg-surface-sunken px-6 py-10 text-center">
        <h2 className="font-display text-2xl">
          Sie wissen nicht, welches Niveau passt?
        </h2>
        <p className="mx-auto mt-3 max-w-prose text-muted-foreground">
          Der Einstufungstest dauert etwa zehn Minuten und sagt Ihnen, wo Sie
          stehen.
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/einstufungstest">Zum Einstufungstest</Link>
        </Button>
      </section>
    </main>
  );
}
