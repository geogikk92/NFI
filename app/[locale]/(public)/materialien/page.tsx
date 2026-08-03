// БЕЗПЛАТНИТЕ МАТЕРИАЛИ · задача 8 — списъкът.
//
// Оформлението следва мокъпа (bezplatni-materiali.html): широки
// редакторски редове, не решетка от еднакви карти. Видът и нивото са
// типографски етикети — материалите нямат снимки и не им трябват:
// заглавието Е витрината.

import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileText, Headphones, Link2, PlayCircle } from "lucide-react";
import { Reveal, RevealGroup } from "@/components/content/reveal";
import { DataUnavailable } from "@/components/content/data-unavailable";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale, pick } from "@/lib/i18n/config";
import { materialsCopy } from "@/lib/i18n/pages/materials";
import { loadOrExplain } from "@/lib/db-health";
import { listFreeMaterials } from "@/lib/cms/free-materials-db";
import type { MaterialKind } from "@/lib/cms/free-materials";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = materialsCopy(locale);
  return {
    alternates: localeAlternates(locale, "/materialien"),
    title: t.metaTitle,
    description: t.metaDescription,
  };
}

const KIND_ICON: Record<MaterialKind, typeof FileText> = {
  PDF: FileText,
  VIDEO_VIMEO: PlayCircle,
  VIDEO_GOTO: PlayCircle,
  AUDIO: Headphones,
  LINK: Link2,
};

export default async function MaterialsPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = materialsCopy(locale);
  const p = (path: string) => `/${locale}${path}`;

  // Разграничава „няма материали" от „няма база" — както на /kurse.
  const loaded = await loadOrExplain(() => listFreeMaterials());

  return (
    <main>
      <section className="mx-auto max-w-(--container-page) px-6 pb-10 pt-16 lg:pt-24">
        <p
          className="kicker hero-rise"
          style={{ "--rise-delay": "0ms" } as React.CSSProperties}
        >
          <span className="kicker-sq kicker-sq-gold" aria-hidden />
          {t.hero.kicker}
        </p>
        <h1
          className="hero-rise mt-5 max-w-3xl font-title text-(length:--text-display-l) font-bold leading-tight"
          style={{ "--rise-delay": "90ms" } as React.CSSProperties}
        >
          {t.hero.title}
        </h1>
        <p
          className="hero-rise mt-5 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground"
          style={{ "--rise-delay": "180ms" } as React.CSSProperties}
        >
          {t.hero.lede}
        </p>
      </section>

      <section className="mx-auto max-w-(--container-page) px-6 pb-20">
        {!loaded.ok ? (
          <DataUnavailable locale={locale} reason={loaded.reason} />
        ) : loaded.data.length === 0 ? (
          <div className="border border-border bg-surface-sunken px-8 py-14 text-center">
            <h2 className="font-title text-xl font-bold">{t.empty.title}</h2>
            <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
              {t.empty.body}
            </p>
          </div>
        ) : (
          <RevealGroup step={80}>
            <ul className="divide-y divide-border border-y border-border">
              {loaded.data.map((material, index) => {
                const Icon = KIND_ICON[material.kind];
                return (
                  <Reveal as="li" key={material.id} index={index}>
                    <Link
                      href={p(`/materialien/${material.slug}`)}
                      className="row-link group flex flex-wrap items-center gap-x-7 gap-y-3 py-7 hover:bg-muted/50"
                    >
                      {/* Иконата на вида — в кръг с кант, като печат. */}
                      <span
                        aria-hidden
                        className="grid size-12 flex-none place-items-center border border-border text-muted-foreground transition-colors group-hover:border-red-600 group-hover:text-red-600"
                      >
                        <Icon className="size-5" strokeWidth={1.75} />
                      </span>

                      <span className="min-w-0 flex-1 basis-64">
                        <span className="block font-title text-xl font-bold leading-snug">
                          {pick(locale, {
                            bg: material.title,
                            de: material.titleDe,
                            en: material.titleEn,
                          })}
                        </span>
                        {(() => {
                          // pick() ПРЕДИ проверката: иначе празно българско
                          // описание крие съществуващия немски превод.
                          const picked = pick(locale, {
                            bg: material.description,
                            de: material.descriptionDe,
                            en: material.descriptionEn,
                          });
                          return picked ? (
                            <span className="mt-1 block max-w-prose text-sm leading-relaxed text-muted-foreground">
                              {picked}
                            </span>
                          ) : null;
                        })()}
                      </span>

                      <span className="flex flex-none items-center gap-3">
                        <span className="tag tag-gold">{t.kinds[material.kind]}</span>
                        {material.level ? (
                          <span className="tag">{material.level}</span>
                        ) : null}
                        <span
                          aria-hidden
                          className="row-link-arrow text-red-600"
                        >
                          <ArrowRight className="size-5" />
                        </span>
                      </span>
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </RevealGroup>
        )}
      </section>
    </main>
  );
}
