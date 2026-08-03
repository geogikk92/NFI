// БЕЗПЛАТНИТЕ МАТЕРИАЛИ · задача 8 — детайлът.
//
// Трите поведения, нарочно различни (следват мокъпа):
//   • VIMEO: гледа се направо тук — но зад ConsentGate, защото iframe
//     праща IP към Vimeo (бележката на Жоро в consent-gate.tsx).
//   • GOTO/ВРЪЗКА: външен https:// линк, без iframe и без гейт — на
//     нашата страница не се зарежда нищо чуждо.
//   • PDF/АУДИО: зад формата. Токенът идва веднага на екрана — не чака
//     имейл (имейлите са задача 23m).
// При съдържание „на страницата" формата е lead: „искам още такива".

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ConsentGate } from "@/components/content/consent-gate";
import { MaterialAccessForm } from "@/components/content/material-access-form";
import { localeAlternates } from "@/lib/i18n/alternates";
import { pick, toLocale } from "@/lib/i18n/config";
import { materialsCopy } from "@/lib/i18n/pages/materials";
import { type MaterialKind } from "@/lib/cms/free-materials";
import { getFreeMaterialBySlug } from "@/lib/cms/free-materials-db";
import { requestMaterialAccess } from "../actions";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  const material = await getFreeMaterialBySlug(slug);

  if (!material) return {};

  return {
    alternates: localeAlternates(locale, `/materialien/${slug}`),
    title: pick(locale, {
      bg: material.title,
      de: material.titleDe,
      en: material.titleEn,
    }),
    description:
      pick(locale, {
        bg: material.description,
        de: material.descriptionDe,
        en: material.descriptionEn,
      }) || undefined,
  };
}

export default async function MaterialDetailPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  const t = materialsCopy(locale);

  const material = await getFreeMaterialBySlug(slug);
  if (!material) notFound();

  const kind = material.kind as MaterialKind;
  // „На страницата" = видео ИЛИ външна връзка: формата тогава е lead,
  // не ключалка, и успехът ѝ не бива да обещава бутон за сваляне.
  const isVideo = kind === "VIDEO_VIMEO" || kind === "VIDEO_GOTO" || kind === "LINK";
  const title = pick(locale, {
    bg: material.title,
    de: material.titleDe,
    en: material.titleEn,
  });
  const description = pick(locale, {
    bg: material.description,
    de: material.descriptionDe,
    en: material.descriptionEn,
  });

  return (
    <main className="mx-auto max-w-(--container-page) px-6 pb-20 pt-12 lg:pt-16">
      <Link
        href={`/${locale}/materialien`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t.detail.backToAll}
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="tag tag-gold">{t.kinds[kind]}</span>
        {material.level ? <span className="tag">{material.level}</span> : null}
      </div>

      <h1 className="mt-4 max-w-4xl font-title text-(length:--text-display-l) font-bold leading-tight">
        {title}
      </h1>

      {description ? (
        <p className="mt-5 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {kind === "VIDEO_VIMEO" && material.externalId ? (
        <div className="mt-10 max-w-4xl">
          <ConsentGate
            category="functional"
            locale={locale}
            provider="Vimeo"
            title={title}
          >
            <div className="aspect-video w-full bg-ink shadow-md">
              <iframe
                // dnt=1: казва на Vimeo да не следи — съгласието
                // покрива зареждането, не рекламния профил.
                src={`https://player.vimeo.com/video/${encodeURIComponent(material.externalId)}?dnt=1`}
                title={title}
                className="size-full"
                allow="fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </ConsentGate>
        </div>
      ) : null}

      {/* GoTo записи и външни връзки: обикновен <a>, БЕЗ ConsentGate —
          на нашата страница не се зарежда нищо чуждо, значи няма какво
          да се гейтва. Рендира се само https:// — втората бариера срещу
          javascript: URI, ако валидацията в админа някога пропусне. */}
      {(kind === "VIDEO_GOTO" || kind === "LINK") &&
      material.externalId?.startsWith("https://") ? (
        <div className="mt-10">
          <a
            href={material.externalId}
            target="_blank"
            rel="noopener noreferrer"
            className="draw-link inline-flex items-center gap-2 pb-1 text-sm font-semibold"
          >
            {kind === "LINK" ? t.detail.open : t.detail.watch} ↗
          </a>
        </div>
      ) : null}

      <section className="mt-12 max-w-2xl border border-border bg-surface-raised p-7 shadow-sm lg:p-9">
        <h2 className="font-title text-(length:--text-display-m) font-bold">
          {t.form.heading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isVideo ? t.form.videoLede : t.form.lede}
        </p>
        <div className="mt-6">
          <MaterialAccessForm
            action={requestMaterialAccess}
            slug={material.slug}
            locale={locale}
            isVideo={isVideo}
          />
        </div>
      </section>
    </main>
  );
}
