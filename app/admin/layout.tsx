// АДМИН · задача 17a — обвивката на панела.
//
// НЯМА публична навигация: SiteShell чете количка и бисквитка за съгласие,
// а тук няма нито едното. Няма и превключвател на езика — админът е само на
// български (виж коментара в lib/i18n/config.ts).

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { AdminNav } from "./(components)/admin-nav";
import { signOut } from "@/app/auth-actions";

export const metadata: Metadata = {
  title: {
    default: "Администрация",
    template: "%s · Администрация",
  },
  // Наследява се от ВСИЧКИ страници под /admin, така че панелът не може да
  // изтече в търсачка заради забравен ред в нова страница. Тук не е
  // временно, както в app/layout.tsx — админът остава noindex завинаги.
  robots: { index: false, follow: false },
};

// Данните са актуални към заявката, не към билда. Без това Next се опитва
// да пре-рендира таблото по време на `next build` — тоест иска жива база и
// показва вкаменени числа.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // Пазачът е ТУК и в началото на всяка страница. Двойно е нарочно: layout
  // може да бъде подминат при бъдещи route handlers под /admin, а една
  // забравена проверка отваря лични данни.
  const admin = await requireAdmin();

  return (
    // `lang="bg"` НЕ е излишно: app/layout.tsx е замразен с <html lang="de">
    // и без този атрибут екранният четец изговаря целия админ (кирилица) с
    // немски глас — WCAG 2.1 AA, 3.1.2 „Език на частите". Точно затова
    // app/[locale]/layout.tsx също слага езика на <div>, а не на <html>.
    //
    // Тъмната тема на админа е ПОДГОТВЕНА, но не се налага: класът `.dark`
    // (app/tokens.css) се слага на този <div> — една дума — щом Василена
    // реши. Дотогава панелът наследява светлата тема на <html> и не се
    // разминава с публичния сайт при обща снимка на екрана.
    <div lang="bg" className="min-h-dvh bg-background text-foreground">
      {/* Първото във фокусната верига — WCAG 2.4.1. Страничната лента е
          дълга и без тази връзка всеки Tab минава през нея. */}
      <a
        href="#admin-sadarzhanie"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Към съдържанието
      </a>

      <div className="mx-auto flex min-h-dvh w-full max-w-[100rem] flex-col lg:flex-row">
        <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-baseline gap-2 px-6 py-5">
            {/* Временният знак „N" — сменя се, когато дойде логото. */}
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-md bg-red-600 font-title text-base text-white"
            >
              N
            </span>
            <span className="font-title text-lg font-semibold">
              Администрация
            </span>
          </div>

          <AdminNav />

          {/* Кой е влязъл се вижда постоянно: панелът показва лични данни и
              човекът трябва да знае с чий профил работи. */}
          <div className="border-t border-sidebar-border px-6 py-4">
            <p className="text-xs text-muted-foreground">
              Профил
              <br />
              <span className="text-sidebar-foreground">
                {admin.name ?? admin.email}
              </span>
            </p>

            {/* Форма, а не връзка: изходът променя състояние и не бива да
                става с GET. Виж коментара в app/auth-actions.ts. */}
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="text-xs font-medium text-sidebar-foreground underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Изход
              </button>
            </form>
          </div>
        </aside>

        <main
          id="admin-sadarzhanie"
          className="min-w-0 flex-1 px-6 py-10 lg:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
