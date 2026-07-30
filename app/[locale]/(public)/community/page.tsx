// Задача 3b — Общност.
//
// Структурата е готова; съдържанието идва от Василена.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { AwaitingLegalText } from "@/components/content/legal-page";
import { EmptyState } from "@/components/content/states";

export const metadata: Metadata = {
  title: "Community",
  description:
    "Sprachcafé, Lerngruppen und Veranstaltungen am Nürnberger Fremdsprachen Institut.",
};

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">Community</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Sprache lebt vom Sprechen
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Ein Kurs allein macht niemanden sicher. Deshalb gibt es bei uns
          Gelegenheiten, außerhalb des Unterrichts zu üben.
        </p>
      </header>

      <div className="prose mt-14">
        <h2>Sprachcafé</h2>
        <AwaitingLegalText
          what="Beschreibung, Termine und Anmeldung für das Sprachcafé"
          who="der Kundin"
        />

        <h2>Lerngruppen</h2>
        <AwaitingLegalText
          what="Wie Lerngruppen entstehen und wie man mitmacht"
          who="der Kundin"
        />
      </div>

      {/* Събитията ще идват от CMS в задача 18c. Дотогава празното
          състояние показва честно, че още няма насрочени. */}
      <section className="mt-16" aria-labelledby="termine">
        <h2 id="termine" className="font-display text-2xl">
          Nächste Termine
        </h2>
        <EmptyState
          className="mt-6"
          title="Noch keine Termine veröffentlicht"
          description="Sobald die nächsten Treffen feststehen, finden Sie sie hier. Fragen Sie uns gern direkt."
          action={
            <Button asChild variant="outline">
              <Link href="/kontakt">Nachfragen</Link>
            </Button>
          }
        />
      </section>
    </main>
  );
}
