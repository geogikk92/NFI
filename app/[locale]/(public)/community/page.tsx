// Задача 3b — Общност.
//
// Структурата е готова; съдържанието идва от Василена.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { AwaitingLegalText } from "@/components/content/legal-page";
import { EmptyState } from "@/components/content/states";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { communityCopy } from "@/lib/i18n/pages/community";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = communityCopy(toLocale(locale));

  return {
    alternates: localeAlternates(toLocale(locale), "community"),
    title: t.metaTitle, description: t.metaDescription };
}

export default async function CommunityPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = communityCopy(locale);

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">{t.kicker}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.lead}</p>
      </header>

      <div className="prose mt-14">
        {/* Указанията в AwaitingLegalText са бележка към екипа, не текст за
            посетителя — затова остават на немски. */}
        <h2>{t.cafeHeading}</h2>
        <AwaitingLegalText
          what="Beschreibung, Termine und Anmeldung für das Sprachcafé"
          who="der Kundin"
        />

        <h2>{t.groupsHeading}</h2>
        <AwaitingLegalText
          what="Wie Lerngruppen entstehen und wie man mitmacht"
          who="der Kundin"
        />
      </div>

      {/* Събитията ще идват от CMS в задача 18c. Дотогава празното
          състояние показва честно, че още няма насрочени. */}
      <section className="mt-16" aria-labelledby="termine">
        <h2 id="termine" className="font-title text-2xl">
          {t.datesHeading}
        </h2>
        <EmptyState
          className="mt-6"
          title={t.emptyTitle}
          description={t.emptyBody}
          action={
            <Button asChild variant="outline">
              <Link href={`/${locale}/kontakt`}>{t.emptyCta}</Link>
            </Button>
          }
        />
      </section>
    </main>
  );
}
