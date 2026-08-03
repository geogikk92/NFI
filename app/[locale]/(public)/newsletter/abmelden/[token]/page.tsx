// ОТПИСВАНЕ ОТ БЮЛЕТИНА · задача 7.
//
// Оттеглянето е ЕДИН клик (Art. 7(3) GDPR: „толкова лесно, колкото
// даването"). Никакви „сигурен ли си", никакви форми за причина.

import Link from "next/link";
import type { Metadata } from "next";
import { toLocale } from "@/lib/i18n/config";
import { newsletterCopy } from "@/lib/i18n/pages/newsletter";
import { unsubscribe } from "@/lib/cms/newsletter-db";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return {
    title: newsletterCopy(locale).unsubscribe.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function UnsubscribePage({ params }: Props) {
  const { locale: rawLocale, token } = await params;
  const locale = toLocale(rawLocale);
  const t = newsletterCopy(locale).unsubscribe;

  const outcome = await unsubscribe(token);
  const copy =
    outcome === "unsubscribed"
      ? t.done
      : outcome === "already"
        ? t.already
        : t.notFound;

  return (
    <main className="mx-auto flex min-h-[55vh] max-w-(--container-page) flex-col items-start justify-center px-6 py-20">
      <span className="flagline w-24" aria-hidden />
      <h1 className="mt-8 max-w-2xl font-title text-(length:--text-display-l) font-bold leading-tight">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
        {copy.body}
      </p>
      <Button asChild variant="outline" size="lg" className="mt-8">
        <Link href={`/${locale}`}>{t.backHome}</Link>
      </Button>
    </main>
  );
}
