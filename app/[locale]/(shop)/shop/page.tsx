// ТЕРИТОРИЯ НА ЖОРО · задача M9 — каталог.

import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { listProducts } from "@/lib/commerce/catalog";
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
  const products = await listProducts();

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

      {products.length === 0 ? (
        <p className="mt-16 rounded-lg border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          {t.empty}
        </p>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              <li key={product.id}>
                {/* `relative` е ЗАДЪЛЖИТЕЛНО: заглавието разпъва
                    `after:inset-0` върху цялата карта и без позициониран
                    родител то се мери спрямо целия документ. Досега това
                    не се виждаше само защото Card има `overflow-hidden` и
                    го отрязва — тоест работеше по случайност. */}
                <Card className="relative flex h-full flex-col">
                  <CardContent className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-title text-xl leading-snug">
                        <Link
                          href={`/${locale}/shop/${product.slug}`}
                          className="after:absolute after:inset-0 hover:text-primary"
                        >
                          {title}
                        </Link>
                      </h2>
                      <Badge variant={product.type === "DIGITAL" ? "secondary" : "outline"}>
                        {product.type === "DIGITAL"
                          ? t.badgeDownload
                          : t.badgeShipping}
                      </Badge>
                    </div>

                    {description ? (
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                        {description}
                      </p>
                    ) : null}
                  </CardContent>

                  <CardFooter className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">
                        {formatMoney(product.priceCents, moneyTag(locale))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.vatNote}
                      </p>
                    </div>

                    {soldOut ? (
                      <Badge variant="outline">{t.soldOut}</Badge>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/${locale}/shop/${product.slug}`}>
                          {t.details}
                          {/* „Details" сам по себе си не казва за кой
                              продукт — четецът обявява целия ред. */}
                          <span className="sr-only">
                            {" "}
                            {t.detailsFor(title)}
                          </span>
                        </Link>
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
