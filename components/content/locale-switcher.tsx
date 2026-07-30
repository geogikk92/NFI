"use client";

// Превключвател на езика.
//
// Всеки език е ОТДЕЛНА ВРЪЗКА, не бутон с JavaScript: така работи без
// скриптове, търсачките виждат трите версии, а човек може да отвори
// друг език в нов таб.
//
// Имената са на своя език („Deutsch", не „Немски") — така всеки
// разпознава своя, без да знае текущия.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LOCALES,
  LOCALE_NAMES,
  LOCALE_TAGS,
  switchLocalePath,
  type Locale,
} from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({
  current,
  label,
}: {
  current: Locale;
  label: string;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex items-center gap-0.5">
      {LOCALES.map((locale) => {
        const active = locale === current;

        return (
          <Link
            key={locale}
            href={switchLocalePath(pathname, locale)}
            // hreflang казва на търсачката и на четеца какъв е целевият
            // език, а lang — на какъв език е самият надпис.
            hrefLang={locale}
            lang={LOCALE_TAGS[locale]}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium uppercase transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {locale}
            <span className="sr-only"> — {LOCALE_NAMES[locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
