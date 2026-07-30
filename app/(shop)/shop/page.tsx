// ТЕРИТОРИЯ НА ЖОРО · задача M9 — каталог.

import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { listProducts } from "@/lib/commerce/catalog";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Shop",
  description: "Lehrbücher, Arbeitshefte und digitale Materialien des NFI.",
};

// БЕЗ revalidate: SiteShell чете бисквитки (брояч на количката, cookie
// решение), а `cookies()` прави маршрута динамичен — какъвто и кеш да се
// обяви тук, той не действа. Проверено в изхода на `npm run build`:
// маршрутът е ƒ (Dynamic), не ○ (Static).
//
// Не е загуба за checkout-а — цената така или иначе се сверява наново от
// базата при всяко плащане (виж lib/commerce/pricing.ts).

export default async function ShopPage() {
  const products = await listProducts();

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">Shop</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Lehrbücher und Materialien
        </h1>
        <p className="mt-4 text-muted-foreground">
          Alle Preise inkl. MwSt. Versandkosten werden im Warenkorb berechnet.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="mt-16 rounded-lg border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          Zurzeit sind keine Produkte verfügbar.
        </p>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const soldOut = product.stock !== null && product.stock <= 0;

            return (
              <li key={product.id}>
                <Card className="flex h-full flex-col">
                  <CardContent className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-xl leading-snug">
                        <Link
                          href={`/shop/${product.slug}`}
                          className="after:absolute after:inset-0 hover:text-primary"
                        >
                          {product.titleDe ?? product.title}
                        </Link>
                      </h2>
                      <Badge variant={product.type === "DIGITAL" ? "secondary" : "outline"}>
                        {product.type === "DIGITAL" ? "Download" : "Versand"}
                      </Badge>
                    </div>

                    {product.descriptionDe || product.description ? (
                      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                        {product.descriptionDe ?? product.description}
                      </p>
                    ) : null}
                  </CardContent>

                  <CardFooter className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">
                        {formatMoney(product.priceCents)}
                      </p>
                      <p className="text-xs text-muted-foreground">inkl. MwSt.</p>
                    </div>

                    {soldOut ? (
                      <Badge variant="outline">Ausverkauft</Badge>
                    ) : (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/shop/${product.slug}`}>
                          Details
                          <span className="sr-only">
                            {" "}
                            zu {product.titleDe ?? product.title}
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
