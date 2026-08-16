"use client";

// АДМИН · задача 17a — навигацията на страничната лента.
//
// Клиентски компонент е САМО заради `usePathname` — активният раздел трябва
// да се разпознае, а layout-ът не получава пътя. Нищо друго не се внася:
// файл, който води до lib/admin/queries.ts, би вкарал Prisma в браузърния
// бъндъл.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  id: string;
  title: string;
  items: readonly NavItem[];
}

// ПРАВИЛО: тук влиза само СЪЩЕСТВУВАЩА страница. Връзка към ненаправен
// екран е 404 и е по-лоша от липсваща връзка. Чакат: поръчките и
// фактурите (търговският админ на Жоро, M14).
const SECTIONS: readonly NavSection[] = [
  {
    id: "admin-nav-obshto",
    title: "Общ преглед",
    items: [
      { href: "/admin", label: "Табло" },
      { href: "/admin/tarsene", label: "Търсене" },
      { href: "/admin/dnevnik", label: "Дневник на промените" },
    ],
  },
  {
    id: "admin-nav-sadarzhanie",
    title: "Съдържание",
    items: [
      { href: "/admin/anketi", label: "Заявки за обаждане" },
      { href: "/admin/testove", label: "Резултати от теста" },
      { href: "/admin/tekstove", label: "Текстове" },
      { href: "/admin/kursove", label: "Курсове" },
      { href: "/admin/sertifikati", label: "Сертификати" },
      { href: "/admin/recenzii", label: "Отзиви" },
      { href: "/admin/materiali", label: "Безплатни материали" },
      { href: "/admin/mediya", label: "Медия" },
      { href: "/admin/abonati", label: "Абонати" },
    ],
  },
  {
    id: "admin-nav-magazin",
    title: "Магазин",
    items: [
      { href: "/admin/produkti", label: "Продукти" },
      { href: "/admin/promocii", label: "Промоции" },
    ],
  },
  {
    id: "admin-nav-uslugi",
    title: "Услуги",
    items: [{ href: "/admin/prevodi", label: "Преводи" }],
  },
];

/**
 * „/admin" се сверява ТОЧНО, останалите с префикс.
 *
 * С префикс за таблото всеки подраздел би светил и него, а тогава
 * `aria-current="page"` сочи две места и престава да значи нещо.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Активният раздел, изписан с думи — надписът на сгънатата навигация.
 *
 * На телефон човек трябва да вижда КЪДЕ е, преди да разгъне списъка.
 * „Меню" не казва нищо; „Отзиви" казва всичко.
 */
function currentLabel(pathname: string): string {
  for (const section of SECTIONS) {
    for (const item of section.items) {
      if (isActive(pathname, item.href)) return item.label;
    }
  }
  return "Раздели";
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── На телефон: сгънато ──
          Списъкът е 13 връзки в четири групи. Разгънат над всяка страница
          той изяжда целия първи екран и всяко зареждане започва с дълъг
          скрол покрай меню, което човекът вече е ползвал.

          `<details>` е НАТИВЕН: отваря се и без JavaScript, помни
          състоянието си при отваряне и не иска нито ред логика. */}
      {/* `key={pathname}`: layout-ът НЕ се премонтира при навигация в
          Next, тоест без този ключ менюто остава отворено след избора и
          новата страница се отваря под 13 връзки. Смяната на ключа
          премонтира <details> в началното му (затворено) състояние. */}
      <details
        key={pathname}
        className="group border-b border-sidebar-border lg:hidden"
      >
        <summary className="flex cursor-pointer items-center justify-between px-6 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <span>
            <span className="text-muted-foreground">Раздел:</span>{" "}
            {currentLabel(pathname)}
          </span>
          {/* Стрелката е единственият чисто украсен елемент — състоянието
              се чува и от нативното `<summary>`. */}
          <span aria-hidden className="transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>

        <div className="pb-3">
          <NavSections pathname={pathname} />
        </div>
      </details>

      {/* ── От таблет нагоре: винаги отворено ── */}
      <div className="hidden lg:block">
        <NavSections pathname={pathname} />
      </div>
    </>
  );
}

function NavSections({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Административни раздели" className="px-3">
      {SECTIONS.map((section) => (
        <div key={section.id} className="mb-4">
          {/* Заглавието на раздела НЕ е <h2>: единственият <h1> на екрана е
              заглавието на страницата и списъкът със заглавия за екранния
              четец не бива да започва със странична лента. Затова етикетът
              е <p>, а списъкът получава име през aria-labelledby — четецът
              обявява „Съдържание, списък от 2 елемента". */}
          <p
            id={section.id}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {section.title}
          </p>

          <ul aria-labelledby={section.id} className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
