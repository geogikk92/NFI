"use client";

// ТЕРИТОРИЯ НА БОБИ · задача 2b — мобилна и настолна навигация.
//
// Писано от Жоро, докато Боби е в отпуск. Клон zhoro/za-bobi-dizajn-sistema.
//
// Клиентски компонент е само защото мобилното меню има състояние. Съдържанието
// на връзките идва отвън, за да може да мине през CMS в задача 18c.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
}

interface SiteNavProps {
  links: readonly NavLink[];
  cartCount?: number;
}

export function SiteNav({ links, cartCount = 0 }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);

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

  // Смяната на страница затваря менюто. Иначе при навигация с браузърните
  // бутони то остава отворено над новото съдържание.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Флаг-линията е знакът на марката и стои над всичко. */}
      <span className="flagline block w-full rounded-none" aria-hidden />

      <div className="mx-auto flex max-w-(--container-page) items-center gap-6 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl font-semibold"
        >
          {/* Временният знак „N" — сменя се за минути, когато дойде логото. */}
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-md bg-nfi-red-600 font-display text-lg text-white"
          >
            N
          </span>
          <span className="hidden sm:inline">NFI</span>
          <span className="sr-only">Nürnberger Fremdsprachen Institut</span>
        </Link>

        {/* Настолна навигация */}
        <nav aria-label="Hauptnavigation" className="ml-auto hidden lg:block">
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
          <Button asChild variant="ghost" size="sm">
            <Link href="/warenkorb">
              Warenkorb
              {cartCount > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              ) : null}
              <span className="sr-only">
                {cartCount > 0
                  ? `, ${cartCount} Artikel`
                  : ", leer"}
              </span>
            </Link>
          </Button>

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/kontakt">Beratung</Link>
          </Button>

          {/* Мобилен превключвател */}
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
              {open ? "Menü schließen" : "Menü öffnen"}
            </span>
          </Button>
        </div>
      </div>

      {/* Мобилно меню. Рендира се само отворено — затворено не бива да е
          във фокусната верига, а `hidden` елемент няма как да се фокусира
          случайно. */}
      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Hauptnavigation"
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
            <li className="px-3 py-3 sm:hidden">
              <Button asChild className="w-full">
                <Link href="/kontakt" onClick={() => setOpen(false)}>
                  Beratung
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
