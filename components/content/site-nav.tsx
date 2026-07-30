"use client";

// Настолна и мобилна навигация.
//
// Клиентски компонент е само защото мобилното меню има състояние.
// Речникът се подава готов от сървъра — така преводите не пътуват два пъти.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { LocaleSwitcher } from "./locale-switcher";
import { cn } from "@/lib/utils";

interface SiteNavProps {
  locale: Locale;
  cartCount?: number;
  /** null = никой не е влязъл. Идва от сървъра — виж SiteShell. */
  account?: { label: string; isAdmin: boolean } | null;
  /** Server action. Подава се отгоре, защото този файл е клиентски. */
  onSignOut?: () => Promise<void>;
}

export function SiteNav({
  locale,
  cartCount = 0,
  account = null,
  onSignOut,
}: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const t = getDictionary(locale);

  // ПРАВИЛО: тук влиза само СЪЩЕСТВУВАЩА страница. Връзка към ненаправена
  // страница е 404 и е по-лоша от липсваща връзка. Чакат:
  // /uebersetzungen (задача 14), /materialien (8).
  const links = [
    { href: `/${locale}/kurse`, label: t.nav.courses },
    { href: `/${locale}/einstufungstest`, label: t.nav.levelTest },
    { href: `/${locale}/shop`, label: t.nav.shop },
    { href: `/${locale}/ueber-uns`, label: t.nav.about },
    { href: `/${locale}/kontakt`, label: t.nav.contact },
  ];

  const isActive = (href: string) => pathname.startsWith(href);

  // Escape затваря менюто и връща фокуса на бутона. Без връщането фокусът
  // пада в началото на документа и човекът с клавиатура се губи.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Смяната на страница затваря менюто — иначе при навигация с браузърните
  // бутони то остава отворено над новото съдържание.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Флаг-линията е знакът на марката и стои над всичко. */}
      <span className="flagline block w-full rounded-none" aria-hidden />

      <div className="mx-auto flex max-w-(--container-page) items-center gap-4 px-6 py-4">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 font-title text-xl font-semibold"
        >
          {/* Временният знак „N" — сменя се за минути, когато дойде логото. */}
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-md bg-red-600 font-title text-lg text-white"
          >
            N
          </span>
          <span className="hidden sm:inline">NFI</span>
          <span className="sr-only">Nürnberger Fremdsprachen Institut</span>
        </Link>

        <nav aria-label={t.nav.mainNav} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <div className="hidden sm:block">
            <LocaleSwitcher current={locale} label={t.nav.languageLabel} />
          </div>

          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/warenkorb`}>
              <span className="hidden sm:inline">{t.nav.cart}</span>
              <span className="sm:hidden" aria-hidden>
                🛒
              </span>
              {cartCount > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
              <span className="sr-only">
                {t.nav.cart}
                {cartCount > 0
                  ? `, ${cartCount} ${t.nav.cartItems}`
                  : `, ${t.nav.cartEmpty}`}
              </span>
            </Link>
          </Button>

          {/* Вход/изход. До 30.07.2026 нито едната връзка я нямаше никъде в
              сайта — страниците съществуваха, но не се стигаха отникъде. */}
          {account ? (
            <div className="hidden items-center gap-2 md:flex">
              {account.isAdmin ? (
                <Button asChild variant="ghost" size="sm">
                  {/* Админът е само на български и е извън /[locale]/. */}
                  <Link href="/admin">{t.nav.adminPanel}</Link>
                </Button>
              ) : null}
              <Link
                href={`/${locale}/profil`}
                className="max-w-32 truncate rounded-md px-2 py-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <span className="sr-only">{t.nav.signedInAs} </span>
                {account.label}
              </Link>
              <form action={onSignOut}>
                <Button type="submit" variant="ghost" size="sm">
                  {t.nav.signOut}
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href={`/${locale}/anmelden`}>{t.nav.signIn}</Link>
            </Button>
          )}

          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href={`/${locale}/kontakt`}>{t.nav.consultation}</Link>
          </Button>

          <Button
            ref={toggleRef}
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
            <span className="sr-only">
              {open ? t.nav.menuClose : t.nav.menuOpen}
            </span>
          </Button>
        </div>
      </div>

      {/* Мобилното меню се рендира само отворено — затворено не бива да е
          във фокусната верига. */}
      {open ? (
        <nav
          id="mobile-nav"
          aria-label={t.nav.mainNav}
          className="border-t border-border lg:hidden"
        >
          <ul className="mx-auto max-w-(--container-page) px-4 py-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-md px-3 py-3 text-base font-medium",
                    isActive(link.href)
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="flex items-center justify-between px-3 py-3 sm:hidden">
              <span className="text-sm text-muted-foreground">
                {t.nav.languageLabel}
              </span>
              <LocaleSwitcher current={locale} label={t.nav.languageLabel} />
            </li>
            {/* Същото и в мобилното меню: на телефон горните бутони са
                скрити, а вход, който съществува само на голям екран, не
                съществува за половината посетители. */}
            {account ? (
              <>
                {account.isAdmin ? (
                  <li>
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
                    >
                      {t.nav.adminPanel}
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link
                    href={`/${locale}/profil`}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
                  >
                    {t.nav.myAccount}
                  </Link>
                </li>
                <li className="px-3 py-3">
                  <p className="text-sm text-muted-foreground">
                    {t.nav.signedInAs}{" "}
                    <span className="font-medium text-foreground">
                      {account.label}
                    </span>
                  </p>
                  <form action={onSignOut} className="mt-2">
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      onClick={() => setOpen(false)}
                    >
                      {t.nav.signOut}
                    </Button>
                  </form>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href={`/${locale}/anmelden`}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-base font-medium hover:bg-muted"
                >
                  {t.nav.signIn}
                </Link>
              </li>
            )}

            <li className="px-3 py-3 md:hidden">
              <Button asChild className="w-full">
                <Link href={`/${locale}/kontakt`} onClick={() => setOpen(false)}>
                  {t.nav.consultation}
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
