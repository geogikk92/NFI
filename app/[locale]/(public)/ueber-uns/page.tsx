// Задача 3b — За нас.
//
// Структурата е готова; ТЕКСТЪТ и снимките идват от Василена (риск
// „съдържанието идва отвън" в ПЛАН.md). Не се измисля история на
// институт — тя е негова, не наша.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { AwaitingLegalText } from "@/components/content/legal-page";

export const metadata: Metadata = {
  title: "Über uns",
  description:
    "Das Nürnberger Fremdsprachen Institut — Sprachunterricht von Lehrkräften, die beide Sprachen kennen.",
};

export default function UeberUnsPage() {
  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">Über uns</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Zwei Sprachen, ein Institut
        </h1>
        {/* Двуезичността е обещанието на марката, не украса. */}
        <div className="duo mt-6 text-lg">
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
        <h2>Wer wir sind</h2>
        <AwaitingLegalText
          what="Geschichte des Instituts, Gründung, Selbstverständnis"
          who="der Kundin"
        />

        <h2>Unsere Lehrkräfte</h2>
        <AwaitingLegalText
          what="Vorstellung der Lehrkräfte mit Foto und Qualifikation"
          who="der Kundin"
        />

        <h2>Wie wir unterrichten</h2>
        <AwaitingLegalText
          what="Methodik, Gruppengrößen, Materialien"
          who="der Kundin"
        />
      </div>

      <section className="mt-20 rounded-xl border border-border bg-surface-sunken px-6 py-10">
        <h2 className="font-display text-2xl">Lernen Sie uns kennen</h2>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Der schnellste Weg ist ein Gespräch. Wir klären Ihr Niveau und sagen
          offen, ob wir die Richtigen für Sie sind.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/kontakt">Beratung anfragen</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/einstufungstest">Niveau testen</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
