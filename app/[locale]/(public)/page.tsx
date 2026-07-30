// Задача 3a — НАЧАЛНАТА страница.
//
// Седем секции, подредени като разговор с човек, който още не знае дали
// това е мястото за него: кои сме → какъв е пътят → какво има днес →
// защо ние → двуезичността → не знаеш нивото си → да поговорим.
//
// Водещият мотив е „червената нишка" (der rote Faden): пътят от първата
// дума до сертификата И до документите. Затова стъпките са <ol> — редът
// им носи смисъл, това не е списък с предимства.
//
// Текстовете са в речника (ключ `home`); тук не се пише съдържание.
// Липсващото — заглавие за търсачките, етикет на стъпката, празно
// състояние — е в lib/i18n/pages/home.ts.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCard } from "@/components/content/course-card";
import { EmptyState } from "@/components/content/states";
import { listCourses } from "@/lib/cms/courses";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { DUO_PAIR, getHomeCopy } from "@/lib/i18n/pages/home";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = toLocale(locale);

  return {
    alternates: localeAlternates(toLocale(locale), ""),
    title: getHomeCopy(l).metaTitle,
    // Описанието е водещият текст на страницата — един текст, едно място.
    description: getDictionary(l).home.heroLead,
  };
}

// `robots: index:false` живее в app/layout.tsx и се маха в задача 22 —
// тук не се пипа.

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const l = toLocale(locale);
  const t = getDictionary(l).home;
  const copy = getHomeCopy(l);

  // `take: 3` в заявката, не slice след това — иначе се тегли целият
  // каталог, за да се покажат три карти.
  const courses = await listCourses({ take: 3 });

  const steps = [
    { title: t.step1Title, body: t.step1Body },
    { title: t.step2Title, body: t.step2Body },
    { title: t.step3Title, body: t.step3Body },
    { title: t.step4Title, body: t.step4Body },
  ];

  const reasons = [
    { title: t.why1Title, body: t.why1Body },
    { title: t.why2Title, body: t.why2Body },
    { title: t.why3Title, body: t.why3Body },
  ];

  return (
    <main>
      {/* ── 1 · Hero ─────────────────────────────────────────────────
          `grain` иска позициониран родител — текстурата се лепи по inset. */}
      <section className="grain relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-(--container-page) px-6 py-20 md:py-28">
          <span className="flagline w-28" aria-hidden />

          <p className="kicker mt-8">{t.kicker}</p>
          <h1 className="mt-3 max-w-4xl text-(length:--text-hero) font-semibold tracking-tighter">
            {t.heroTitle}
          </h1>
          <p className="mt-6 max-w-prose text-lg text-muted-foreground">
            {t.heroLead}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/${l}/kurse`}>{t.heroPrimary}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/${l}/einstufungstest`}>{t.heroSecondary}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2 · Червената нишка ──────────────────────────────────── */}
      <section
        aria-labelledby="thread-title"
        className="mx-auto max-w-(--container-page) px-6 py-20"
      >
        <div className="max-w-2xl">
          <h2 id="thread-title" className="text-3xl font-semibold">
            {t.threadTitle}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t.threadLead}</p>
        </div>

        {/* <ol>, защото това е ПЪТ: стъпка 3 без стъпка 1 не значи нищо.
            Номерът се вижда като кръгче (декоративно, aria-hidden), а за
            екранния четец е в самото заглавие — редът не бива да се носи
            само от разположението. */}
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="border-l-2 border-nfi-red-600 pl-5"
            >
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full bg-nfi-red-600 font-display text-sm font-semibold text-white"
              >
                {index + 1}
              </span>
              <h3 className="mt-4 font-display text-xl leading-snug">
                <span className="sr-only">
                  {copy.stepLabel} {index + 1}:{" "}
                </span>
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 3 · Курсове ─────────────────────────────────────────────
          Истински курсове от базата. Нито един измислен ред. */}
      <section
        aria-labelledby="courses-title"
        className="border-y border-border bg-surface-sunken"
      >
        <div className="mx-auto max-w-(--container-page) px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 id="courses-title" className="text-3xl font-semibold">
                {t.coursesTitle}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t.coursesLead}
              </p>
            </div>
            {courses.length > 0 ? (
              <Button asChild variant="outline" size="lg">
                <Link href={`/${l}/kurse`}>{t.coursesAll}</Link>
              </Button>
            ) : null}
          </div>

          {courses.length === 0 ? (
            <EmptyState
              className="mt-12"
              title={copy.coursesEmptyTitle}
              description={copy.coursesEmptyBody}
              action={
                <Button asChild>
                  <Link href={`/${l}/kontakt`}>{copy.coursesEmptyCta}</Link>
                </Button>
              }
            />
          ) : (
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <li key={course.id}>
                  {/* `locale` е задължителен: картата не разчита езика сама. */}
                  <CourseCard course={course} locale={l} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── 4 · Защо NFI ────────────────────────────────────────── */}
      <section
        aria-labelledby="why-title"
        className="mx-auto max-w-(--container-page) px-6 py-20"
      >
        <h2 id="why-title" className="text-3xl font-semibold">
          {t.whyTitle}
        </h2>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {reasons.map((reason) => (
            <li key={reason.title}>
              <Card className="h-full">
                <CardContent>
                  {/* CardTitle рендира <div> — истинското заглавие е <h3>,
                      иначе секцията липсва в дървото на заглавията. */}
                  <h3 className="font-display text-xl leading-snug">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {reason.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 5 · Двуезичността ───────────────────────────────────────
          Двойката НЕ е превод на текущия език: показва се немското и
          българското изречение едно под друго, защото точно това е
          обещанието. Всяко носи `lang` — екранният четец сменя гласа, а
          :lang(de) в globals.css включва пренасянето на съставните думи. */}
      <section
        aria-labelledby="duo-title"
        className="border-y border-border bg-surface-sunken"
      >
        <div className="mx-auto max-w-(--container-page) px-6 py-20">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <h2 id="duo-title" className="text-3xl font-semibold">
                {copy.duoTitle}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {copy.duoLead}
              </p>
            </div>

            <div className="duo text-xl md:text-2xl">
              <p lang="de">{DUO_PAIR.de}</p>
              <p lang="bg">{DUO_PAIR.bg}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 · Тест за ниво ────────────────────────────────────── */}
      <section
        aria-labelledby="test-title"
        className="mx-auto max-w-(--container-page) px-6 py-20"
      >
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <span className="flagline mx-auto w-20" aria-hidden />
          <h2 id="test-title" className="mt-6 text-3xl font-semibold">
            {t.testTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-prose text-lg text-muted-foreground">
            {t.testLead}
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href={`/${l}/einstufungstest`}>{t.testCta}</Link>
          </Button>
        </div>
      </section>

      {/* ── 7 · Контакт ─────────────────────────────────────────── */}
      <section
        aria-labelledby="contact-title"
        className="border-t border-border bg-surface-sunken"
      >
        <div className="mx-auto max-w-(--container-page) px-6 py-20">
          <div className="max-w-2xl">
            <h2 id="contact-title" className="text-3xl font-semibold">
              {t.contactTitle}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t.contactLead}
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href={`/${l}/kontakt`}>{t.contactCta}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
