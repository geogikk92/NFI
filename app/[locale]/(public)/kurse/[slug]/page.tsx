// ТЕРИТОРИЯ НА БОБИ · задача 4 — детайл на курса.
// Писано от Жоро, докато Боби е в отпуск.

import Link from "next/link";
import { notFound } from "next/navigation";
import { DataUnavailable } from "@/components/content/data-unavailable";
import { loadOrExplain } from "@/lib/db-health";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CourseCard } from "@/components/content/course-card";
import { JsonLd } from "@/components/content/json-ld";
import { getCourseBySlug, listRelatedCourses } from "@/lib/cms/courses";
import { toDateTimeAttribute } from "@/lib/intl";
import { pick, toLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/alternates";
import {
  courseDuration,
  coursesCopy,
  formatLabel,
  levelLabel,
} from "@/lib/i18n/pages/courses";
import { dateLong, decimal } from "@/lib/i18n/pages/formats";
import {
  breadcrumbSchema,
  courseSchema,
  graph,
} from "@/lib/seo/structured-data";

// Двете полета идват от един и същ адрес — /de/kurse/a1-abendkurs.
type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const course = await getCourseBySlug(slug);

  if (!course) return { title: coursesCopy(locale).detail.notFound };

  return {
    title: pick(locale, {
      bg: course.title,
      de: course.titleDe,
      en: course.titleEn,
    }),
    description:
      pick(locale, {
        bg: course.summary,
        de: course.summaryDe,
        en: course.summaryEn,
      }) || undefined,
    // Без това търсачката вижда /de/kurse/<slug>, /bg/... и /en/... като
    // три почти еднакви страници и решава САМА коя да покаже. Списъчните
    // страници го имаха отдавна; детайлните — точно тези, които водят
    // трафик — бяха пропуснати.
    alternates: localeAlternates(locale, `kurse/${slug}`),
  };
}

export default async function CoursePage({ params }: Props) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const loaded = await loadOrExplain(() => getCourseBySlug(slug, locale));
  const course = loaded.ok ? loaded.data : null;

    // При недостъпна база НЕ се вика notFound(): 404 казва „такъв курс няма",
  // което е лъжа — курсът си съществува, ние не можем да го прочетем. А и
  // търсачката приема 404 буквално и маха адреса от индекса.
  if (!loaded.ok) {
    return (
      <main className="mx-auto max-w-(--container-page) px-6 py-16">
        <DataUnavailable locale={locale} reason={loaded.reason} />
      </main>
    );
  }

  if (!course) notFound();

  const related = await listRelatedCourses(course);
  const t = coursesCopy(locale).detail;

  const title = pick(locale, {
    bg: course.title,
    de: course.titleDe,
    en: course.titleEn,
  });
  const summary = pick(locale, {
    bg: course.summary,
    de: course.summaryDe,
    en: course.summaryEn,
  });
  const description = pick(locale, {
    bg: course.description,
    de: course.descriptionDe,
    en: course.descriptionEn,
  });
  const duration = courseDuration(
    locale,
    course.durationWeeks,
    course.hoursPerWeek,
  );

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      {/* Course + CourseInstance е двойката за образователни rich
          results. БЕЗ offers/price: цената нарочно не се показва на
          страницата, значи не бива да е и в markup-а. */}
      <JsonLd
        data={graph(
          courseSchema(locale, {
            slug: course.slug,
            name: title,
            description: summary,
            level: course.level,
            format: course.format,
            durationWeeks: course.durationWeeks,
            hoursPerWeek: course.hoursPerWeek,
            maxParticipants: course.maxParticipants,
            startsAt: course.startsAt,
          }),
          breadcrumbSchema([
            { name: t.coursesLink, path: `/${locale}/kurse` },
            { name: title, path: `/${locale}/kurse/${course.slug}` },
          ]),
        )}
      />

      <nav aria-label={t.breadcrumb} className="text-sm text-muted-foreground">
        <Link href={`/${locale}/kurse`} className="hover:text-primary">
          {t.coursesLink}
        </Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{title}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_340px]">
        <article>
          <span className="flagline w-16" aria-hidden />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{levelLabel(locale, course.level)}</Badge>
            <Badge variant="outline">{formatLabel(locale, course.format)}</Badge>
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
              <h2 id="bewertungen" className="font-title text-2xl">
                {t.reviewsHeading}
              </h2>
              <p className="mt-3 text-muted-foreground">
                {t.reviews(
                  decimal(locale, course.averageRating, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  }),
                  course.reviewCount,
                )}
              </p>

              {/* Самите отзиви. Списъкът е на езика на посетителя — затова
                  може да е празен, докато средната оценка не е: тя брои
                  всички езици. */}
              {course.reviews.length > 0 ? (
                <ul className="mt-6 space-y-5">
                  {course.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="border-l-2 border-primary/40 pl-5"
                    >
                      <p className="text-lg leading-relaxed">
                        „{review.body}“
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {review.authorName}
                        <span className="sr-only">
                          {" "}
                          — {review.rating} / 5
                        </span>
                        <span aria-hidden className="ml-2 text-primary">
                          {"★".repeat(review.rating)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </article>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-6">
            {/* БЕЗ цена — мокъпът я оставя за разговора. Курсът не се
                купува онлайн: единственото действие е заявка за обаждане,
                значи няма поръчка и PAngV не иска цена тук. */}
            <p className="font-title text-xl font-bold leading-snug">
              {t.priceInTalk}
            </p>

            <Separator className="my-6" />

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t.level}</dt>
                <dd className="text-right">{levelLabel(locale, course.level)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t.format}</dt>
                <dd className="text-right">
                  {formatLabel(locale, course.format)}
                </dd>
              </div>
              {duration ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t.scope}</dt>
                  <dd className="text-right">{duration}</dd>
                </div>
              ) : null}
              {course.startsAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t.start}</dt>
                  <dd className="text-right">
                    <time dateTime={toDateTimeAttribute(course.startsAt)}>
                      {dateLong(locale, course.startsAt)}
                    </time>
                  </dd>
                </div>
              ) : null}
              {course.maxParticipants ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t.groupSize}</dt>
                  <dd className="text-right">
                    {t.maxParticipants(course.maxParticipants)}
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* Записването минава през заявка за обаждане (задача 5), не
                през количката — курсът иска разговор преди плащане. */}
            <Button asChild className="mt-6 w-full" size="lg">
              <Link href={`/${locale}/kontakt?kurs=${course.slug}`}>
                {t.cta}
              </Link>
            </Button>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t.ctaNote}
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section className="mt-24" aria-labelledby="weitere">
          <h2 id="weitere" className="font-title text-2xl">
            {t.related(course.level)}
          </h2>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <li key={item.id}>
                <CourseCard course={item} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
