// ТЕРИТОРИЯ НА БОБИ · задача 4 — списък на курсовете.
// Писано от Жоро, докато Боби е в отпуск.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/content/course-card";
import { EmptyState } from "@/components/content/states";
import {
  COURSE_LEVELS,
  countCoursesByLevel,
  listCourses,
  parseFormat,
  parseLevel,
} from "@/lib/cms/courses";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { coursesCopy, levelLabel } from "@/lib/i18n/pages/courses";
import { cn } from "@/lib/utils";

// БЕЗ revalidate — той няма да подейства и само заблуждава.
// SiteShell чете бисквитки (брояч на количката, cookie решение), а
// `cookies()` прави целия маршрут динамичен. Затова страницата се
// рендира при всяка заявка, каквото и да пише тук.
//
// Ако това стане проблем при реален трафик, изходите са три: брояч на
// количката в клиентски компонент, Partial Prerendering, или кеш на
// заявките с unstable_cache. Решението е на Боби — това е негова
// територия и зависи от дизайна на навигацията.

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ level?: string; format?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = coursesCopy(toLocale(locale)).list;

  return {
    alternates: localeAlternates(toLocale(locale), "kurse"),
    title: t.metaTitle, description: t.metaDescription };
}

export default async function CoursesPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  const query = await searchParams;
  const t = coursesCopy(locale);

  // Непозната стойност в адреса се игнорира, вместо да гърми — адресите
  // се споделят и редактират на ръка.
  const level = parseLevel(query.level);
  const format = parseFormat(query.format);

  const [courses, counts] = await Promise.all([
    listCourses({ level, format }),
    // Броевете уважават филтъра по формат — иначе „A1 (1)" стои над нула
    // резултата при ?format=ONLINE.
    countCoursesByLevel({ format }),
  ]);

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      {/* Заглавието, подзаглавието и блокът „Накратко" са пренесени от
          мокъпа: там страницата отговаря на четирите въпроса, които човек
          задава първи — кога, как, колко голяма група, по кои дни. */}
      <header className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="max-w-2xl">
          <span className="flagline w-20" aria-hidden />
          <p className="kicker mt-6">
            <span className="kicker-sq" aria-hidden />
            {t.list.kicker}
          </p>
          <h1 className="mt-4 font-title text-(length:--text-display-l) font-bold leading-tight">
            {t.list.mockupTitle}
          </h1>
          <p className="mt-5 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
            {t.list.mockupLede}
          </p>
        </div>

        <div className="border border-border bg-card p-6">
          <h2 className="font-mono text-2xs uppercase tracking-kicker text-muted-foreground">
            {t.list.factsHeading}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {t.list.facts.map((fact) => (
              <div
                key={fact.label}
                className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd className="text-right font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mt-16">
        <h2 className="font-title text-(length:--text-display-m) font-bold leading-tight">
          {t.list.pickHeading}
        </h2>
        <p className="mt-3 text-muted-foreground">{t.list.pickLede}</p>
      </div>

      {/* Филтърът е връзки, не бутони: състоянието живее в адреса, значи
          страницата се споделя и работи без JavaScript.

          Връзките ПАЗЯТ другия филтър — иначе избор на ниво тихо изхвърля
          избрания формат и човекът вижда резултати, които не е поискал. */}
      <nav aria-label={t.list.filterLabel} className="mt-12">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href={
                format
                  ? `/${locale}/kurse?format=${format}`
                  : `/${locale}/kurse`
              }
              aria-current={!level ? "true" : undefined}
              className={cn(
                "inline-flex rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                !level
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              {t.list.all}
            </Link>
          </li>
          {COURSE_LEVELS.map((item) => {
            const count = counts[item];
            const active = level === item;
            const href = format
              ? `/${locale}/kurse?level=${item}&format=${format}`
              : `/${locale}/kurse?level=${item}`;

            return (
              <li key={item}>
                {/* Без aria-disabled и без pointer-events-none: те правеха
                    връзката недостъпна за мишка, но напълно работеща от
                    клавиатура, а четецът я обявяваше като „unavailable".
                    Броят в скобите казва същото, без да лъже. */}
                <Link
                  href={href}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : count === 0
                        ? "border-border text-subtle hover:bg-muted"
                        : "border-border hover:bg-muted",
                  )}
                >
                  {item}
                  <span className="text-xs opacity-70">({count})</span>
                  <span className="sr-only">
                    {" "}
                    — {levelLabel(locale, item)}
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
        {t.list.found(courses.length)}
      </p>

      {courses.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={t.list.emptyTitle}
          description={t.list.emptyBody}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href={`/${locale}/kontakt`}>{t.list.emptyContact}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/kurse`}>{t.list.emptyShowAll}</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} locale={locale} />
            </li>
          ))}
        </ul>
      )}

      <section className="mt-20 rounded-xl border border-border bg-surface-sunken px-6 py-10 text-center">
        <h2 className="font-title text-2xl">{t.list.testTitle}</h2>
        <p className="mx-auto mt-3 max-w-prose text-muted-foreground">
          {t.list.testLead}
        </p>
        <Button asChild size="lg" className="mt-6">
          <Link href={`/${locale}/einstufungstest`}>{t.list.testCta}</Link>
        </Button>
      </section>
    </main>
  );
}
