// ТЕРИТОРИЯ НА ЖОРО · задача M9 — каталог.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ProductCover } from "@/components/commerce/product-cover";
import { listProducts } from "@/lib/commerce/catalog";
import { DataUnavailable } from "@/components/content/data-unavailable";
import { loadOrExplain } from "@/lib/db-health";
import { formatMoney } from "@/lib/money";
import { pick, toLocale } from "@/lib/i18n/config";
import { shopCopy } from "@/lib/i18n/pages/shop";
import { moneyTag } from "@/lib/i18n/pages/formats";
import { localeAlternates } from "@/lib/i18n/alternates";

// БЕЗ revalidate: SiteShell чете бисквитки (брояч на количката, cookie
// решение), а `cookies()` прави маршрута динамичен — какъвто и кеш да се
// обяви тук, той не действа. Проверено в изхода на `npm run build`:
// маршрутът е ƒ (Dynamic), не ○ (Static).
//
// Не е загуба за checkout-а — цената така или иначе се сверява наново от
// базата при всяко плащане (виж lib/commerce/pricing.ts).

// Данните идват от базата, а Prisma заявките НЕ се кешират като fetch —
// без това страницата се изпича веднъж при билда и остава такава завинаги.
// Тоест курс, добавен от админ панела, никога не се появява на сайта.
//
// 300 s е компромис: списъкът с курсове не се мени всеки час, а половин
// час застояване е неприемливо за цена. Втори ефект: ако при билда база
// е липсвала, страницата се самоизлекува 5 минути след като се появи,
// вместо да чака нов деплой.
export const revalidate = 300;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = shopCopy(toLocale(locale)).list;

  return {
    alternates: localeAlternates(toLocale(locale), "shop"),
    title: t.metaTitle, description: t.metaDescription };
}

export default async function ShopPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = shopCopy(locale).list;
  const loaded = await loadOrExplain(() => listProducts());
  const products = loaded.ok ? loaded.data : [];

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">{t.kicker}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-muted-foreground">{t.lead}</p>
      </header>

      {!loaded.ok ? (
        <div className="mt-12">
          <DataUnavailable locale={locale} reason={loaded.reason} />
        </div>
      ) : products.length === 0 ? (
        <p className="mt-16 rounded-lg border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          {t.empty}
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-border border-y border-border">
          {products.map((product) => {
            const soldOut = product.stock !== null && product.stock <= 0;
            const title = pick(locale, {
              bg: product.title,
              de: product.titleDe,
              en: product.titleEn,
            });
            const description = pick(locale, {
              bg: product.description,
              de: product.descriptionDe,
              en: product.descriptionEn,
            });

            return (
              <li
                key={product.id}
                className="flex flex-wrap gap-5 py-6 sm:flex-nowrap"
              >
                {/* Типографската корица — материалите нямат снимки.
                    Декоративна е: всичко в нея се повтаря като истински
                    текст отдясно, затова е aria-hidden. */}
                <div className="w-[clamp(5.5rem,27%,7.5rem)] shrink-0">
                  <ProductCover
                    color={product.coverColor}
                    brand={product.coverBrand}
                    eyebrow={product.coverEyebrow}
                    coverTitle={product.coverTitle}
                    meta={product.coverMeta}
                    fallback={{
                      bg: product.title,
                      de: product.titleDe,
                      en: product.titleEn,
                    }}
                    locale={locale}
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="font-mono text-2xs uppercase tracking-kicker text-muted-foreground">
                    {product.type === "DIGITAL" ? t.badgeDownload : t.badgeShipping}
                  </p>

                  <h2 className="font-title text-xl font-bold leading-tight sm:text-2xl">
                    <Link
                      href={`/${locale}/shop/${product.slug}`}
                      className="hover:text-primary"
                    >
                      {title}
                    </Link>
                  </h2>

                  {description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <span className="font-title text-xl font-bold">
                      {formatMoney(product.priceCents, moneyTag(locale))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.vatNote}
                    </span>

                    {soldOut ? (
                      <span className="tag">{t.soldOut}</span>
                    ) : (
                      <Button asChild size="sm">
                        <Link href={`/${locale}/shop/${product.slug}`}>
                          {t.details}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
