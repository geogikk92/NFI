// ПОТВЪРЖДЕНИЕ НА БЮЛЕТИНА · задача 7 — вторият клик на double opt-in.
//
// Server component, който ПИШЕ при GET — нарушение на буквата на HTTP,
// но точно това е конвенцията на всички double opt-in линкове: кликът в
// писмото Е потвърждението. Идемпотентно е: втори клик дава „already".

import Link from "next/link";
import type { Metadata } from "next";
import { toLocale } from "@/lib/i18n/config";
import { newsletterCopy } from "@/lib/i18n/pages/newsletter";
import { confirmSubscription } from "@/lib/cms/newsletter-db";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string; token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return {
    title: newsletterCopy(locale).confirm.metaTitle,
    // Токен в адреса — страницата няма работа в индекса на никоя търсачка.
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmPage({ params }: Props) {
  const { locale: rawLocale, token } = await params;
  const locale = toLocale(rawLocale);
  const t = newsletterCopy(locale).confirm;

  const outcome = await confirmSubscription(token);
  const copy =
    outcome === "confirmed"
      ? t.confirmed
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
      <Button asChild size="lg" className="mt-8">
        <Link href={`/${locale}`}>{t.backHome}</Link>
      </Button>
    </main>
  );
}
