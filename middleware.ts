// Език в адреса.
//
// Езикът е в ПЪТЯ (/de/kurse), не в бисквитка: търсачките трябва да
// индексират трите версии отделно, а човек трябва да може да сподели
// линк, който се отваря на същия език.
//
// Админът НАРОЧНО е извън тази машинария — /admin е само на български.

import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALES,
  isLocale,
  localeFromAcceptLanguage,
} from "@/lib/i18n/config";

/** Пътища, които не носят език и не се пренасочват. */
const BYPASS = [
  "/admin",
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (BYPASS.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Файл с разширение (изображение, шрифт) минава без език.
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);

  // Вече има език → нищо не се прави. Изричният избор на посетителя
  // НЕ се пренаписва от Accept-Language.
  if (segments.length > 0 && isLocale(segments[0])) {
    const response = NextResponse.next();
    // Езикът се дава на layout-а през глава: сървърните компоненти не
    // виждат params на middleware, а дублирането на разчитането в
    // няколко места се разминава.
    response.headers.set("x-nfi-locale", segments[0]);
    return response;
  }

  // Голият път се пренасочва към предпочитания език.
  const preferred = localeFromAcceptLanguage(
    request.headers.get("accept-language"),
  );

  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;

  // 307, не 308: изборът на език по глава е предположение и не бива да
  // се кешира завинаги от браузъра.
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Всичко без статичните файлове и вътрешните пътища на Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export { LOCALES, DEFAULT_LOCALE };
