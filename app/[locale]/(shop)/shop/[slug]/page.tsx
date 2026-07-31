// ТЕРИТОРИЯ НА ЖОРО · задача M9 — детайл на продукта.
//
// Информацията над бутона е правно изискване, не оформление: §312j Abs. 3
// BGB иска основните характеристики, общата цена с ДДС и разходите за
// доставка да са видими непосредствено преди поръчката. Изискването важи
// и за преведените версии — затова текстовете са пълни и на трите езика.

import Link from "next/link";
import { notFound } from "next/navigation";
import { DataUnavailable } from "@/components/content/data-unavailable";
import { loadOrExplain } from "@/lib/db-health";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getProductBySlug } from "@/lib/commerce/catalog";
import { formatMoney } from "@/lib/money";
import { WITHDRAWAL_PERIOD_DAYS } from "@/lib/legal";
import { pick, toLocale } from "@/lib/i18n/config";
import { localeAlternates } from "@/lib/i18n/alternates";
import { shopCopy } from "@/lib/i18n/pages/shop";
import { moneyTag } from "@/lib/i18n/pages/formats";
import { addToCartForm } from "../../actions";

// Двете полета идват от един адрес — /de/shop/lehrbuch-a1.
type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const product = await getProductBySlug(slug);

  if (!product) return { title: shopCopy(locale).product.notFound };

  return {
    title: pick(locale, {
      bg: product.title,
      de: product.titleDe,
      en: product.titleEn,
    }),
    description:
      pick(locale, {
        bg: product.description,
        de: product.descriptionDe,
        en: product.descriptionEn,
      }) || undefined,
    // Виж бележката в kurse/[slug]/page.tsx — същата причина.
    alternates: localeAlternates(locale, `shop/${slug}`),
  };
}

export default async function ProductPage({ params }: Params) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const loaded = await loadOrExplain(() => getProductBySlug(slug));
  const product = loaded.ok ? loaded.data : null;

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

  if (!product) notFound();

  const t = shopCopy(locale).product;
  const isDigital = product.type === "DIGITAL";
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
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <nav aria-label={t.breadcrumb} className="text-sm text-muted-foreground">
        <Link href={`/${locale}/shop`} className="hover:text-primary">
          {t.shopLink}
        </Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{title}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
        <article>
          <span className="flagline w-16" aria-hidden />
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">{title}</h1>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={isDigital ? "secondary" : "outline"}>
              {isDigital ? t.badgeInstantDownload : t.badgeShipping}
            </Badge>
            {product.weightGrams ? (
              <Badge variant="outline">{product.weightGrams} g</Badge>
            ) : null}
          </div>

          {description ? (
            <p className="mt-8 max-w-prose text-lg leading-relaxed">
              {description}
            </p>
          ) : null}

          {product.files.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-sm font-semibold">{t.filesHeading}</h2>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                {product.files.map((file) => (
                  <li key={file.label}>{file.label}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>

        {/* Всичко, което §312j иска да е видимо преди поръчката. */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-3xl font-semibold">
              {formatMoney(product.priceCents, moneyTag(locale))}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.vatNote} ·{" "}
              {isDigital ? t.shippingFree : t.shippingCalculated}
            </p>

            <Separator className="my-6" />

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t.delivery}</dt>
                <dd className="text-right">
                  {isDigital ? t.deliveryDigital : t.deliveryPhysical}
                </dd>
              </div>
              {product.stock !== null ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t.availability}</dt>
                  <dd className="text-right">
                    {soldOut ? t.soldOut : t.inStock(product.stock)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t.withdrawal}</dt>
                <dd className="text-right">
                  {t.withdrawalDays(WITHDRAWAL_PERIOD_DAYS)}
                </dd>
              </div>
            </dl>

            {/* Формуляр, не onClick — работи и без JavaScript. */}
            <form action={addToCartForm} className="mt-6">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="quantity" value={1} />
              <Button type="submit" className="w-full" size="lg" disabled={soldOut}>
                {soldOut ? t.soldOutButton : t.addToCart}
              </Button>
            </form>

            {isDigital ? (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                {t.digitalWithdrawalNote}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
