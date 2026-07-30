// НАЧАЛНАТА СТРАНИЦА · задача 3a — ПРЕНОС ОТ МОКЪПА.
// Източник: https://borisgudev.github.io/nfi-website-mockup/index.html
//
// Осемте секции следват мокъпа по ред и по съдържание. Текстовете са в
// lib/i18n/pages/home.ts, където БЪЛГАРСКИЯТ е източникът — мокъпът е на
// български, защото целевата група са българи в Германия.
//
// Нивата са A1–C1, БЕЗ C2: така е в мокъпа. Списъкът е статичен нарочно —
// той описва програмата на института, а не наличните в момента курсове.
// Истинските курсове от базата се показват в /kurse.

import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { homeCopy } from "@/lib/i18n/pages/home";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = homeCopy(locale);

  return {
    alternates: localeAlternates(locale, ""),
    title: t.metaTitle,
    description: t.hero.lede,
  };
}

export default async function HomePage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = homeCopy(locale);
  const p = (path: string) => `/${locale}${path}`;

  return (
    <main>
      {/* ── 1 · HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-(--container-page) items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <p className="kicker">
              <span className="kicker-sq" aria-hidden />
              {t.hero.kicker}
            </p>

            <h1 className="mt-5 font-title text-(length:--text-display-xl) font-bold leading-(--leading-display) tracking-tighter">
              {t.hero.titleLead}{" "}
              <em className="not-italic text-primary">{t.hero.titleAccent}</em>
            </h1>

            <p className="mt-6 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
              {t.hero.lede}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href={p("/kontakt")}>{t.hero.ctaPrimary}</Link>
              </Button>
              {/* Мокъпът ползва „ghost" връзка с червено подчертаване, не
                  втори плътен бутон — за да е ясно кое е основното действие. */}
              <Link
                href={p("/einstufungstest")}
                className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-sm font-semibold transition-[gap] hover:gap-3"
              >
                {t.hero.ctaSecondary}
                <span aria-hidden>→</span>
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap items-center gap-3">
              <li className="tag tag-red">{t.hero.badgeLive}</li>
              <li className="tag">{t.hero.badgeLevels}</li>
            </ul>
          </div>

          {/* Портретът на Василена. НЕ е duotone: в мокъпа .duo се ползва
              само за снимката на общността, а героят е в цвят — драматичният
              червено-златен фон е част от кадъра и обработката би го убила.
              Съотношението 3/3.6 е от мокъпа. */}
          <div className="relative">
            <figure className="relative aspect-[3/3.6] w-full overflow-hidden bg-ink">
              <Image
                src="/img/vasilena-hero.jpg"
                alt={t.hero.portraitAlt}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </figure>

            {/* Двата надписа излизат извън кадъра — както в мокъпа. */}
            <span className="absolute -right-3 top-4 bg-white px-3.5 py-2 font-title text-sm font-bold shadow-md">
              Vasilena <span className="text-primary">♥</span>
            </span>

            <span className="tag tag-solid absolute -left-3.5 bottom-6 shadow-md">
              {t.hero.startLabel} {t.hero.startValue}
            </span>
          </div>
        </div>
      </section>

      {/* ── 2 · ЗАЩО ПРИ НАС ─────────────────────────────────────── */}
      <section
        aria-labelledby="why"
        className="border-t border-border bg-surface-sunken py-16 lg:py-20"
      >
        <div className="mx-auto max-w-(--container-page) px-6">
          <p className="kicker">
            <span className="kicker-sq" aria-hidden />
            {t.why.kicker}
          </p>
          <h2
            id="why"
            className="mt-4 max-w-3xl font-title text-(length:--text-display-l) font-bold leading-tight"
          >
            {t.why.title}
          </h2>
          <p className="mt-5 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
            {t.why.lede}
          </p>

          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {t.why.items.map((item) => (
              <li
                key={item.title}
                className="border border-border bg-card p-7 shadow-sm"
              >
                <span className="tag tag-red">{item.tag}</span>
                <h3 className="mt-5 font-title text-(length:--text-display-m) font-bold leading-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 3 · НИВА НА КУРСОВЕТЕ ────────────────────────────────── */}
      <section aria-labelledby="levels" className="py-16 lg:py-20">
        <div className="mx-auto max-w-(--container-page) px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="kicker">
                <span className="kicker-sq" aria-hidden />
                {t.courses.kicker}
              </p>
              <h2
                id="levels"
                className="mt-4 max-w-2xl font-title text-(length:--text-display-l) font-bold leading-tight"
              >
                {t.courses.title}
              </h2>
            </div>
            <Link
              href={p("/kurse")}
              className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-sm font-semibold transition-[gap] hover:gap-3"
            >
              {t.courses.all}
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Нивата водят към филтрирания списък — /kurse?level=A1 работи. */}
          <ul className="mt-10 divide-y divide-border border-y border-border">
            {t.courses.levels.map((lvl) => (
              <li key={lvl.level}>
                <Link
                  href={p(`/kurse?level=${lvl.level}`)}
                  className="group flex flex-wrap items-center gap-x-8 gap-y-2 py-6 transition-colors hover:bg-muted/60"
                >
                  <span className="w-14 font-title text-3xl font-bold text-primary">
                    {lvl.level}
                  </span>
                  <span className="min-w-40 font-title text-xl font-bold">
                    {lvl.name}
                  </span>
                  <span className="flex-1 text-sm text-muted-foreground">
                    {lvl.body}
                  </span>
                  <span className="font-mono text-2xs uppercase tracking-kicker text-subtle">
                    {lvl.note}
                  </span>
                  <span
                    aria-hidden
                    className="text-primary transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 4 · 5 СТЪПКИ КЪМ ЖИВОТА В ГЕРМАНИЯ ──────────────────── */}
      <section
        aria-labelledby="rules"
        className="border-t border-border bg-surface-sunken py-16 lg:py-20"
      >
        <div className="mx-auto max-w-(--container-page) px-6">
          <p className="kicker">
            <span className="kicker-sq kicker-sq-gold" aria-hidden />
            {t.rules.kicker}
          </p>
          <h2
            id="rules"
            className="mt-4 max-w-2xl font-title text-(length:--text-display-l) font-bold leading-tight"
          >
            {t.rules.title}
          </h2>
          <p className="mt-5 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
            {t.rules.lede}
          </p>

          {/* Нумериран списък: това е ПЪТ и редът значи нещо. Номерът е
              декоративен, а редът се чете текстово от четеца. */}
          <ol className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
            {t.rules.steps.map((step, index) => (
              <li key={step.n} className="bg-card p-6">
                <span
                  aria-hidden
                  className="font-mono text-2xl font-medium text-primary"
                >
                  {step.n}
                </span>
                <h3 className="mt-4 font-title text-lg font-bold leading-snug">
                  <span className="sr-only">
                    {t.rules.stepLabel} {index + 1}:{" "}
                  </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 5 · ПРЕВОД НА ДОКУМЕНТИ (тъмна секция) ──────────────── */}
      <section
        aria-labelledby="translation"
        className="dark bg-ink py-16 text-paper lg:py-20"
      >
        <div className="mx-auto grid max-w-(--container-page) items-center gap-12 px-6 lg:grid-cols-[auto_1fr]">
          {/* Печатът от мокъпа — кръгъл, наклонен, с двоен кант. */}
          <div className="stamp mx-auto size-44 shrink-0 border-primary text-primary lg:mx-0">
            <span className="stamp-title">{t.translation.stampTitle}</span>
            <span className="stamp-sub">{t.translation.stampSub}</span>
          </div>

          <div>
            <h2
              id="translation"
              className="max-w-2xl font-title text-(length:--text-display-l) font-bold leading-tight"
            >
              {t.translation.title}
            </h2>
            <p className="mt-5 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
              {t.translation.lede}
            </p>
            {/* Преводната услуга е задача 14 и още няма страница —
                затова води към контакта, не към 404. */}
            <Button asChild size="lg" className="mt-8">
              <Link href={p("/kontakt")}>{t.translation.cta}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── 6 · ОТЗИВИ ──────────────────────────────────────────── */}
      <section aria-labelledby="reviews" className="py-16 lg:py-20">
        <div className="mx-auto max-w-(--container-page) px-6">
          <p className="kicker">
            <span className="kicker-sq kicker-sq-green" aria-hidden />
            {t.reviews.kicker}
          </p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <h2
              id="reviews"
              className="max-w-2xl font-title text-(length:--text-display-l) font-bold leading-tight"
            >
              {t.reviews.title}
            </h2>

            <p className="flex items-center gap-3">
              <span className="font-title text-3xl font-bold">
                {t.reviews.rating}
              </span>
              {/* Звездите са декорация; оценката е текстово до тях. */}
              <span aria-hidden className="text-primary">
                ★★★★★
              </span>
              <span className="sr-only">{t.reviews.ratingLabel}</span>
            </p>
          </div>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {t.reviews.items.map((review) => (
              <li key={review.author} className="border border-border bg-card p-7">
                <blockquote className="text-lg leading-relaxed">
                  „{review.quote}“
                </blockquote>
                <p className="mt-4 font-mono text-2xs uppercase tracking-kicker text-muted-foreground">
                  {review.author} · {review.city}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-8 font-mono text-2xs uppercase tracking-kicker text-subtle">
            {t.reviews.community}
          </p>
        </div>
      </section>

      {/* ── 7 · БЕЗПЛАТНО ОБАЖДАНЕ ──────────────────────────────── */}
      <section
        aria-labelledby="callback"
        className="border-t border-border bg-surface-sunken py-16 lg:py-20"
      >
        <div className="mx-auto max-w-(--container-page) px-6">
          <p className="kicker">
            <span className="kicker-sq" aria-hidden />
            {t.callback.kicker}
          </p>
          <h2
            id="callback"
            className="mt-4 max-w-2xl font-title text-(length:--text-display-l) font-bold leading-tight"
          >
            {t.callback.title}
          </h2>
          <p className="mt-5 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
            {t.callback.lede}
          </p>

          {/* Формата живее на /kontakt заедно с honeypot-а и лимита по IP —
              да я дублирам тук значи два пътя за спам вместо един. */}
          <Button asChild size="lg" className="mt-8">
            <Link href={p("/kontakt")}>{t.hero.ctaPrimary}</Link>
          </Button>
        </div>
      </section>

      {/* ── 8 · ОБЩНОСТ ─────────────────────────────────────────── */}
      {/* Тук duotone-ът е на място: в мокъпа .duo се ползва точно за тази
          снимка, а текстът стои ВЪРХУ нея с тъмен градиент отляво. */}
      <section aria-labelledby="community" className="py-12 lg:py-16">
        <div className="mx-auto max-w-(--container-page) px-6">
          <div className="duo duo-ink relative flex min-h-[clamp(18.75rem,42vw,26.25rem)] items-end shadow-md">
            <Image
              src="/img/community.jpg"
              alt={t.community.imageAlt}
              fill
              sizes="(min-width: 1200px) 1200px, 100vw"
              className="object-cover"
            />

            {/* Градиентът пази контраста на текста върху снимката —
                без него белите букви падат върху светли петна. */}
            <div
              aria-hidden
              className="absolute inset-0 z-[1] bg-linear-90 from-[rgba(10,8,6,0.88)] via-[rgba(10,8,6,0.55)] to-[rgba(10,8,6,0.18)]"
            />

            <div className="relative z-[2] max-w-[34ch] p-[clamp(1.75rem,4vw,3.25rem)] text-paper">
              <h2
                id="community"
                className="font-title text-(length:--text-display-l) font-bold leading-tight"
              >
                {t.community.title}
              </h2>
              <Link
                href={p("/community")}
                className="mt-5 inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-sm font-semibold text-paper transition-[gap] hover:gap-3"
              >
                {t.community.cta}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
