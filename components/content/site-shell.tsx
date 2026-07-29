// ТЕРИТОРИЯ НА БОБИ · задача 2b.
// Писано от Жоро, докато Боби е в отпуск.
//
// Обвивката на публичната част. Нарочно НЕ е в app/layout.tsx — той е
// замразен и важи и за админа, който няма нужда от тази навигация.
// Ползва се от app/(public)/layout.tsx и app/(shop)/layout.tsx.

import type { ReactNode } from "react";
import { readCart } from "@/lib/commerce/cart-cookie";
import { countItems } from "@/lib/commerce/cart";
import { readConsent } from "@/lib/consent-cookie";
import { needsDecision } from "@/lib/consent";
import {
  acceptAllCookies,
  rejectAllCookies,
  saveCookieSelection,
} from "@/app/(public)/consent-actions";
import { CookieBanner } from "./cookie-banner";
import { SiteNav, type NavLink } from "./site-nav";
import { SiteFooter } from "./site-footer";

// Минава през CMS в задача 18c. Дотогава е тук, на едно място.
const NAV_LINKS: readonly NavLink[] = [
  { href: "/kurse", label: "Kurse" },
  { href: "/uebersetzungen", label: "Übersetzungen" },
  { href: "/shop", label: "Shop" },
  { href: "/materialien", label: "Materialien" },
  { href: "/ueber-uns", label: "Über uns" },
];

export async function SiteShell({ children }: { children: ReactNode }) {
  const [cart, consent] = await Promise.all([readCart(), readConsent()]);

  return (
    <>
      {/* Първото нещо във фокусната верига — изискване по WCAG 2.4.1.
          Скрит е, докато не се фокусира с Tab. */}
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Zum Inhalt springen
      </a>

      <SiteNav links={NAV_LINKS} cartCount={countItems(cart)} />

      <div id="inhalt">{children}</div>

      <SiteFooter />

      {/* Банерът се рендира само докато няма решение — иначе виси в DOM-а
          и се обявява от екранния четец на всяка страница. */}
      {needsDecision(consent) ? (
        <CookieBanner
          onAcceptAll={acceptAllCookies}
          onRejectAll={rejectAllCookies}
          onSaveSelection={saveCookieSelection}
        />
      ) : null}
    </>
  );
}
