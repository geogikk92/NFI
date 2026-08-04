// Задача 3b — За нас.
//
// Структурата е готова; ТЕКСТЪТ и снимките идват от Василена (риск
// „съдържанието идва отвън" в ПЛАН.md). Не се измисля история на
// институт — тя е негова, не наша.
//
// От задача 18: трите раздела вече не са жълта бележка, а РЕДАКТИРУЕМИ
// блокове. Тя ги пише сама от /admin/tekstove. Докато не ги напише за
// даден език, бележката си остава — и продължава да спира деплоя.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Block } from "@/components/content/block";
import { isDraftPreview } from "@/lib/content/preview";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { aboutCopy } from "@/lib/i18n/pages/about";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = aboutCopy(toLocale(locale));

  return {
    alternates: localeAlternates(toLocale(locale), "ueber-uns"),
    title: t.metaTitle, description: t.metaDescription };
}

export default async function UeberUnsPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = aboutCopy(locale);
  const draft = await isDraftPreview();

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">{t.kicker}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {t.title}
        </h1>
        {/* Двуезичността е обещанието на марката, не украса — затова тези
            два реда стоят на двата езика при всеки избран език. */}
        <div className="bilingual mt-6 text-lg">
          <p lang="de">
            Wir unterrichten Deutsch für Menschen, die in Deutschland ankommen
            wollen — nicht nur sprachlich.
          </p>
          <p lang="bg">
            Преподаваме немски на хора, които искат да се установят в Германия —
            не само езиково.
          </p>
        </div>
      </header>

      <div className="prose mt-14">
        {/* Указанията в бележката са към екипа, не текст за посетителя —
            затова остават на немски. */}
        <h2>{t.whoHeading}</h2>
        <Block
          k="about.who"
          locale={locale}
          draft={draft}
          awaiting="Geschichte des Instituts, Gründung, Selbstverständnis"
        />

        <h2>{t.teachersHeading}</h2>
        <Block
          k="about.teachers"
          locale={locale}
          draft={draft}
          awaiting="Vorstellung der Lehrkräfte mit Foto und Qualifikation"
        />

        <h2>{t.methodHeading}</h2>
        <Block
          k="about.method"
          locale={locale}
          draft={draft}
          awaiting="Methodik, Gruppengrößen, Materialien"
        />
      </div>

      <section className="mt-20 rounded-xl border border-border bg-surface-sunken px-6 py-10">
        <h2 className="font-title text-2xl">{t.ctaTitle}</h2>
        <p className="mt-3 max-w-prose text-muted-foreground">{t.ctaBody}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href={`/${locale}/kontakt`}>{t.ctaContact}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}/einstufungstest`}>{t.ctaTest}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
