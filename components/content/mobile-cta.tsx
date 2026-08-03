"use client";

// ТЕРИТОРИЯ НА БОБИ · UX — лепкавото действие на телефон.
//
// На телефон hero бутонът изчезва след първия екран, а решението „ще се
// обадя" идва точно докато човек чете надолу. Лентата се появява СЛЕД
// като hero-то е отминало (иначе дублира бутона пред очите му) и не
// съществува на страници, които САМИ са действието (контакт, тест,
// количка, checkout) — там тя би бутала човека встрани от целта.
//
// Само на телефон (lg:hidden): на десктоп навигацията се вижда винаги.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";

/** Страници, където лентата пречи вместо да помага. */
const EXCLUDED = ["/kontakt", "/einstufungstest", "/warenkorb", "/anmelden", "/registrieren"];

export function MobileCta({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const excluded = EXCLUDED.some((path) => pathname?.includes(path));

  useEffect(() => {
    if (excluded) return;

    // Появява се след един екран скрол; крие се най-горе И при футъра —
    // иначе лентата ляга върху бюлетина и правните връзки, до които
    // човек тъкмо се е дотъркалял.
    const onScroll = () => {
      const pastHero = window.scrollY > window.innerHeight * 0.9;
      const nearBottom =
        window.scrollY + window.innerHeight >
        document.documentElement.scrollHeight - 480;
      setVisible(pastHero && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [excluded]);

  if (excluded) return null;

  return (
    <div
      // inert, докато е скрита: иначе Tab стига до бутон, който не се вижда.
      inert={!visible ? true : undefined}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 ease-out lg:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link
        href={`/${locale}/kontakt`}
        className="flex w-full items-center justify-center gap-2 bg-primary px-6 py-3.5 font-title text-base font-bold text-primary-foreground"
      >
        <Phone aria-hidden className="size-4" />
        {label}
      </Link>
    </div>
  );
}
