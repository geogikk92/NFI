// Регистрация и вход ползват СЪЩАТА обвивка като публичната част.
//
// Нарочно: „гола" страница за вход изглежда като чужд сайт и е повод за
// колебание точно там, където се въвежда парола. Навигацията и футърът с
// правните връзки остават на място.

import type { ReactNode } from "react";
import { SiteShell } from "@/components/content/site-shell";
import { toLocale } from "@/lib/i18n/config";

export default async function AuthLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <SiteShell locale={toLocale(locale)}>{children}</SiteShell>;
}
