// Задача 6 — тест за ниво.

import type { Metadata } from "next";
import { LevelTestQuiz } from "@/components/content/level-test-quiz";
import { EmptyState } from "@/components/content/states";
import { listQuizQuestions } from "@/lib/cms/level-test-db";
import { submitLevelTest } from "./actions";

export const metadata: Metadata = {
  title: "Einstufungstest",
  description:
    "In zehn Minuten wissen Sie, auf welchem Niveau Sie stehen — kostenlos und ohne Anmeldung.",
};

export default async function EinstufungstestPage() {
  const questions = await listQuizQuestions();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">Einstufungstest</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Wo stehen Sie im Deutschen?
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Acht Fragen, etwa zehn Minuten. Keine Anmeldung, kein Ergebnis, das
          Sie festlegt — nur ein Ausgangspunkt für das Gespräch.
        </p>
      </header>

      <div className="mt-12">
        {questions.length === 0 ? (
          <EmptyState
            title="Der Test ist gerade nicht verfügbar"
            description="Wir stellen die Fragen zusammen. Melden Sie sich — wir schätzen Ihr Niveau auch im Gespräch ein."
          />
        ) : (
          <LevelTestQuiz questions={questions} action={submitLevelTest} />
        )}
      </div>
    </main>
  );
}
