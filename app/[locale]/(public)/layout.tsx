import type { ReactNode } from "react";
import { SiteShell } from "@/components/content/site-shell";
import { toLocale } from "@/lib/i18n/config";

export default async function PublicLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <SiteShell locale={toLocale(locale)}>{children}</SiteShell>;
}
