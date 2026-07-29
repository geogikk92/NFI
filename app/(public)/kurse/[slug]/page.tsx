// ТЕРИТОРИЯ НА БОБИ · задача 4 — детайл на курса.
// Писано от Жоро, докато Боби е в отпуск.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CourseCard } from "@/components/content/course-card";
import {
  FORMAT_LABELS,
  LEVEL_LABELS,
  getCourseBySlug,
  listRelatedCourses,
} from "@/lib/cms/courses";
import {
  formatCourseDuration,
  formatDateLong,
  formatNumber,
  toDateTimeAttribute,
} from "@/lib/intl";
import { formatMoney } from "@/lib/money";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) return { title: "Kurs nicht gefunden" };

  return {
    title: course.titleDe ?? course.title,
    description: course.summaryDe ?? course.summary ?? undefined,
  };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) notFound();

  const related = await listRelatedCourses(course);

  const title = course.titleDe ?? course.title;
  const summary = course.summaryDe ?? course.summary;
  const description = course.descriptionDe ?? course.description;
  const duration = formatCourseDuration(
    course.durationWeeks,
    course.hoursPerWeek,
  );

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <nav aria-label="Brotkrumen" className="text-sm text-muted-foreground">
        <Link href="/kurse" className="hover:text-primary">
          Kurse
        </Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{title}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_340px]">
        <article>
          <span className="flagline w-16" aria-hidden />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{LEVEL_LABELS[course.level]}</Badge>
            <Badge variant="outline">{FORMAT_LABELS[course.format]}</Badge>
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{title}</h1>

          {summary ? (
            <p className="mt-5 max-w-prose text-lg leading-relaxed text-muted-foreground">
              {summary}
            </p>
          ) : null}

          {description ? (
            <div className="prose mt-10">
              {/* Обикновен текст засега. Богатият текст идва с CMS-а в 18c. */}
              {description.split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {course.reviewCount > 0 && course.averageRating !== null ? (
            <section className="mt-12" aria-labelledby="bewertungen">
              <h2 id="bewertungen" className="font-display text-2xl">
                Bewertungen
              </h2>
              <p className="mt-3 text-muted-foreground">
                {formatNumber(course.averageRating, "de", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{" "}
                von 5 · {course.reviewCount}{" "}
                {course.reviewCount === 1 ? "Bewertung" : "Bewertungen"}
              </p>
            </section>
          ) : null}
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-6">
            {course.priceCents !== null ? (
              <>
                <p className="text-3xl font-semibold">
                  {formatMoney(course.priceCents)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  inkl. MwSt. · gesamter Kurs
                </p>
              </>
            ) : (
              <p className="text-xl font-semibold">Preis auf Anfrage</p>
            )}

            <Separator className="my-6" />

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Niveau</dt>
                <dd className="text-right">{LEVEL_LABELS[course.level]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="text-right">{FORMAT_LABELS[course.format]}</dd>
              </div>
              {duration ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Umfang</dt>
                  <dd className="text-right">{duration}</dd>
                </div>
              ) : null}
              {course.startsAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Start</dt>
                  <dd className="text-right">
                    <time dateTime={toDateTimeAttribute(course.startsAt)}>
                      {formatDateLong(course.startsAt)}
                    </time>
                  </dd>
                </div>
              ) : null}
              {course.maxParticipants ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Gruppengröße</dt>
                  <dd className="text-right">
                    max. {course.maxParticipants}
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* Записването минава през заявка за обаждане (задача 5), не
                през количката — курсът иска разговор преди плащане. */}
            <Button asChild className="mt-6 w-full" size="lg">
              <Link href={`/kontakt?kurs=${course.slug}`}>
                Beratung anfragen
              </Link>
            </Button>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Wir rufen Sie zurück, klären Ihr Niveau und reservieren Ihren
              Platz. Keine Zahlung an dieser Stelle.
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-24" aria-labelledby="weitere">
          <h2 id="weitere" className="font-display text-2xl">
            Weitere Kurse auf {course.level}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <CourseCard course={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
