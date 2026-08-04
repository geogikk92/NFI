// Обвивката на публичната част.
//
// Нарочно НЕ е в app/layout.tsx — той важи и за админа, който няма нужда
// от тази навигация и е винаги на български.
// Ползва се от app/[locale]/(public)/layout.tsx и (shop)/layout.tsx.

import type { ReactNode } from "react";
import { readCart } from "@/lib/commerce/cart-cookie";
import { countItems } from "@/lib/commerce/cart";
import { readConsent } from "@/lib/consent-cookie";
import { currentUser } from "@/lib/auth/session-db";
import { needsDecision } from "@/lib/consent";
import { PreviewBar } from "@/components/content/preview-bar";
import { isDraftPreview } from "@/lib/content/preview";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import {
  acceptAllCookies,
  rejectAllCookies,
  saveCookieSelection,
} from "@/app/[locale]/(public)/consent-actions";
import { signOut } from "@/app/auth-actions";
import { CookieBanner } from "./cookie-banner";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";
import { MobileCta } from "./mobile-cta";
import { homeCopy } from "@/lib/i18n/pages/home";

export async function SiteShell({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  // `currentUser()` не прави страницата динамична — тя вече е такава заради
  // двете бисквитки по-долу. Тоест цената е една заявка към базата, не смяна
  // на стратегията за рендиране.
  const [cart, consent, user, draft] = await Promise.all([
    readCart(),
    readConsent(),
    currentUser(),
    isDraftPreview(),
  ]);
  const t = getDictionary(locale);

  return (
    <>
      {/* Preview лентата е ПЪРВОТО нещо на страницата: гледаш ли чернова,
          трябва да го знаеш, преди да си прочел каквото и да е. */}
      {draft ? <PreviewBar /> : null}

      {/* Първото нещо във фокусната верига — WCAG 2.4.1. Скрито е,
          докато не се фокусира с Tab. */}
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t.nav.skipToContent}
      </a>

      <SiteNav
        locale={locale}
        cartCount={countItems(cart)}
        account={
          user
            ? {
                // Показва се името, а при липса — имейлът. Имейлът в хедъра
                // е видим за всеки през рамото, затова името е първо.
                label: user.name ?? user.email,
                isAdmin: user.role === "ADMIN",
              }
            : null
        }
        onSignOut={signOut}
      />

      <div id="inhalt">{children}</div>

      {/* Лепкавото действие на телефон · виж mobile-cta.tsx. */}
      <MobileCta locale={locale} label={homeCopy(locale).hero.ctaPrimary} />

      <SiteFooter locale={locale} />

      {/* Банерът се рендира само докато няма решение — иначе виси в DOM-а
          и се обявява от четеца на всяка страница. */}
      {needsDecision(consent) ? (
        <CookieBanner
          locale={locale}
          onAcceptAll={acceptAllCookies}
          onRejectAll={rejectAllCookies}
          onSaveSelection={saveCookieSelection}
        />
      ) : null}
    </>
  );
}
