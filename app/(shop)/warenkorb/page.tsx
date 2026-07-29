// ТЕРИТОРИЯ НА ЖОРО · задача M9 — количка.
//
// Сумите се смятат наново при всяко зареждане от цените в базата.
// Бисквитката носи само какво и колко.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { readCart } from "@/lib/commerce/cart-cookie";
import { priceCartFromDb } from "@/lib/commerce/catalog";
import { isCheckoutable } from "@/lib/commerce/pricing";
import { formatMoney } from "@/lib/money";
import { removeFromCartForm, updateCartQuantityForm } from "../actions";

export const metadata: Metadata = {
  title: "Warenkorb",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const lines = await readCart();
  // Държавата идва от checkout-а (M10). Дотогава — Германия, където са
  // клиентите; сумата се преизчислява при въвеждане на адреса.
  const cart = await priceCartFromDb({ items: lines, countryCode: "DE" });

  const isEmpty = cart.lines.length === 0;

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <span className="flagline w-16" aria-hidden />
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Warenkorb</h1>

      {isEmpty ? (
        <div className="mt-12 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <p className="text-muted-foreground">Ihr Warenkorb ist leer.</p>
          <Button asChild className="mt-6">
            <Link href="/shop">Zum Shop</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
          <section aria-labelledby="positionen">
            <h2 id="positionen" className="sr-only">
              Positionen
            </h2>

            <ul className="divide-y divide-border border-y border-border">
              {cart.lines.map((line) => (
                <li
                  key={line.productId}
                  className="flex flex-wrap items-center gap-4 py-5"
                >
                  <div className="min-w-48 flex-1">
                    <p className="font-medium">{line.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatMoney(line.unitPriceCents)} · Stück
                      {line.discountCents > 0 ? (
                        <span className="text-success">
                          {" "}
                          − {formatMoney(line.discountCents)} Rabatt
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <form action={updateCartQuantityForm} className="flex items-center gap-2">
                    <input type="hidden" name="productId" value={line.productId} />
                    <label
                      htmlFor={`qty-${line.productId}`}
                      className="text-sm text-muted-foreground"
                    >
                      Menge
                    </label>
                    <input
                      id={`qty-${line.productId}`}
                      name="quantity"
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={line.quantity}
                      className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Ändern
                    </Button>
                  </form>

                  <p className="w-24 text-right font-medium">
                    {formatMoney(line.netOfDiscountCents)}
                  </p>

                  <form action={removeFromCartForm}>
                    <input type="hidden" name="productId" value={line.productId} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      Entfernen
                      <span className="sr-only"> — {line.title}</span>
                    </Button>
                  </form>
                </li>
              ))}
            </ul>

            {cart.problems.length > 0 ? (
              <ul className="mt-6 space-y-2" role="alert">
                {cart.problems.map((problem) => (
                  <li
                    key={problem.code + problem.message}
                    className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                  >
                    {problem.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-xl">Zusammenfassung</h2>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Zwischensumme</dt>
                  <dd>{formatMoney(cart.subtotalCents)}</dd>
                </div>

                {cart.discountCents > 0 ? (
                  <div className="flex justify-between gap-4 text-success">
                    <dt>Rabatt {cart.appliedDiscountCode}</dt>
                    <dd>− {formatMoney(cart.discountCents)}</dd>
                  </div>
                ) : null}

                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Versand</dt>
                  <dd>
                    {cart.requiresShipping
                      ? cart.shippingCents === 0
                        ? "kostenlos"
                        : formatMoney(cart.shippingCents)
                      : "entfällt"}
                  </dd>
                </div>
              </dl>

              <Separator className="my-5" />

              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium">Gesamt</span>
                <span className="text-2xl font-semibold">
                  {formatMoney(cart.totalCents)}
                </span>
              </div>
              <p className="mt-1 text-right text-xs text-muted-foreground">
                inkl. {formatMoney(cart.vatCents)} MwSt.
              </p>

              <Button
                className="mt-6 w-full"
                size="lg"
                disabled={!isCheckoutable(cart)}
              >
                Zur Kasse
              </Button>

              {/* Бутонът с „zahlungspflichtig bestellen" е в края на
                  checkout-а (M10), не тук — тук договор още не се сключва. */}
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Alle Preise inkl. gesetzlicher MwSt. Versandkosten werden nach
                Eingabe der Lieferadresse endgültig berechnet.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
