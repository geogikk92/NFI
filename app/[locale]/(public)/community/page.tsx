// Задача 3b — Общност.
//
// Структурата е готова; съдържанието идва от Василена.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/content/block";
import { isDraftPreview } from "@/lib/content/preview";
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
  const draft = await isDraftPreview();

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
        {/* Указанията в бележката са към екипа, не текст за посетителя —
            затова остават на немски. */}
        <h2>{t.cafeHeading}</h2>
        <Block
          k="community.cafe"
          locale={locale}
          draft={draft}
          awaiting="Beschreibung, Termine und Anmeldung für das Sprachcafé"
        />

        <h2>{t.groupsHeading}</h2>
        <Block
          k="community.groups"
          locale={locale}
          draft={draft}
          awaiting="Wie Lerngruppen entstehen und wie man mitmacht"
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
