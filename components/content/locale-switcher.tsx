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
import { usePathname, useSearchParams } from "next/navigation";
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
  // Query-то е състоянието на страницата (филтри, предварително избран
  // курс) и трябва да преживее смяната на езика. Хукът е безопасен тук,
  // защото SiteShell чете бисквитки и прави всеки такъв маршрут
  // динамичен. Стане ли някой ден статичен, Next ще поиска <Suspense> —
  // и тогава fallback-ът трябва да е СЪЩИЯТ превключвател с празно query,
  // не null: иначе връзките към другите езици изчезват от HTML-а.
  const searchParams = useSearchParams();

  return (
    <nav aria-label={label} className="flex items-center gap-0.5">
      {LOCALES.map((locale) => {
        const active = locale === current;

        return (
          <Link
            key={locale}
            href={switchLocalePath(pathname, locale, searchParams.toString())}
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
