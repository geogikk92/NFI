"use client";

// Превключвател на езика · падащо меню.
//
// Всеки език е ОТДЕЛНА ВРЪЗКА, не бутон с JavaScript: така работи без
// скриптове, търсачките виждат трите версии, а човек може да отвори
// друг език в нов таб.
//
// Затова менюто е нативен `<details>`, а НЕ Radix DropdownMenu: Radix
// държи съдържанието в портал и го рендира чак при отваряне — без
// скрипт другите два езика просто ги няма в HTML-а. Тук трите връзки са
// в документа винаги, само свити. e2e/ezik.mjs проверява точно това с
// изключен JavaScript.
//
// Имената са на своя език („Deutsch", не „Немски") — така всеки
// разпознава своя, без да знае текущия. Без флагчета: знамето е държава,
// не език (английският не е британски), а на Windows емоджи-флаговете
// изобщо не се рендират.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
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

  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  // Escape и клик навън затварят. Това е УДОБСТВО отгоре, не условие:
  // без скрипт браузърът пак отваря и затваря менюто сам.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const details = detailsRef.current;
      if (!details?.open) return;

      details.open = false;
      // Фокусът се връща на спусъка. Без връщането той пада в началото
      // на документа и човекът с клавиатура се губи.
      summaryRef.current?.focus();
    }

    function onPointerDown(event: PointerEvent) {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (!details.contains(event.target as Node)) details.open = false;
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  // Смяната на страница затваря менюто — иначе то остава отворено над
  // новия език, който вече е избран.
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname, searchParams]);

  return (
    <nav aria-label={label} className="relative">
      <details ref={detailsRef} className="group">
        {/* `list-none` и правилото за WebKit махат триъгълничето на
            браузъра — стрелката е наша и се обръща при отваряне.
            `<summary>` е бутон по подразбиране: браузърът сам обявява
            „свито/разгънато", затова тук няма ръчно aria-expanded. */}
        <summary
          ref={summaryRef}
          className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden"
        >
          <span className="sr-only">{label}: </span>
          <span lang={LOCALE_TAGS[current]} className="hidden sm:inline">
            {LOCALE_NAMES[current]}
          </span>
          {/* На телефон само кодът: пълното име изяжда лентата. */}
          <span aria-hidden className="uppercase sm:hidden">
            {current}
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 shrink-0 transition-transform group-open:rotate-180"
          />
        </summary>

        <ul className="absolute top-full right-0 z-50 mt-1 min-w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {LOCALES.map((locale) => {
            const active = locale === current;

            return (
              <li key={locale}>
                <Link
                  href={switchLocalePath(
                    pathname,
                    locale,
                    searchParams.toString(),
                  )}
                  // hreflang казва на търсачката и на четеца какъв е целевият
                  // език, а lang — на какъв език е самият надпис.
                  hrefLang={locale}
                  lang={LOCALE_TAGS[locale]}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent font-medium text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {/* Отметката пази ширината и когато я няма — иначе
                      редовете подскачат един спрямо друг. */}
                  <Check
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {LOCALE_NAMES[locale]}
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
    </nav>
  );
}
