// ТЕРИТОРИЯ НА ЖОРО · задача M9 — детайл на продукта.
//
// Информацията над бутона е правно изискване, не оформление: §312j Abs. 3
// BGB иска основните характеристики, общата цена с ДДС и разходите за
// доставка да са видими непосредствено преди поръчката.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getProductBySlug } from "@/lib/commerce/catalog";
import { formatMoney } from "@/lib/money";
import { WITHDRAWAL_PERIOD_DAYS } from "@/lib/legal";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Produkt nicht gefunden" };

  return {
    title: product.titleDe ?? product.title,
    description: product.descriptionDe ?? product.description ?? undefined,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const isDigital = product.type === "DIGITAL";
  const soldOut = product.stock !== null && product.stock <= 0;
  const title = product.titleDe ?? product.title;

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <nav aria-label="Brotkrumen" className="text-sm text-muted-foreground">
        <Link href="/shop" className="hover:text-primary">
          Shop
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
              {isDigital ? "Sofort-Download" : "Versand"}
            </Badge>
            {product.weightGrams ? (
              <Badge variant="outline">{product.weightGrams} g</Badge>
            ) : null}
          </div>

          {product.descriptionDe || product.description ? (
            <p className="mt-8 max-w-prose text-lg leading-relaxed">
              {product.descriptionDe ?? product.description}
            </p>
          ) : null}

          {product.files.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-sm font-semibold">Enthaltene Dateien</h2>
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
              {formatMoney(product.priceCents)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              inkl. MwSt.
              {isDigital
                ? " · keine Versandkosten"
                : " · zzgl. Versand, wird im Warenkorb berechnet"}
            </p>

            <Separator className="my-6" />

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Lieferung</dt>
                <dd className="text-right">
                  {isDigital ? "sofort per Download" : "2–4 Werktage"}
                </dd>
              </div>
              {product.stock !== null ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Verfügbarkeit</dt>
                  <dd className="text-right">
                    {soldOut ? "ausverkauft" : `${product.stock} auf Lager`}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Widerrufsrecht</dt>
                <dd className="text-right">{WITHDRAWAL_PERIOD_DAYS} Tage</dd>
              </div>
            </dl>

            <Button className="mt-6 w-full" size="lg" disabled={soldOut}>
              {soldOut ? "Ausverkauft" : "In den Warenkorb"}
            </Button>

            {isDigital ? (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Bei digitalen Inhalten erlischt das Widerrufsrecht, sobald Sie
                dem sofortigen Beginn der Ausführung ausdrücklich zustimmen und
                den Verlust bestätigen. Die Zustimmung wird im Bestellvorgang
                eingeholt.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
