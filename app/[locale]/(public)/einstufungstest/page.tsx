// Задача 6 — тест за ниво.

import type { Metadata } from "next";
import { LevelTestQuiz } from "@/components/content/level-test-quiz";
import { EmptyState } from "@/components/content/states";
import { listQuizQuestions } from "@/lib/cms/level-test-db";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { levelTestCopy } from "@/lib/i18n/pages/level-test";
import { submitLevelTest } from "./actions";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = levelTestCopy(toLocale(locale)).test;

  return {
    alternates: localeAlternates(toLocale(locale), "einstufungstest"),
    title: t.metaTitle, description: t.metaDescription };
}

export default async function EinstufungstestPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = levelTestCopy(locale).test;
  const questions = await listQuizQuestions();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header>
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">{t.kicker}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.lead}</p>
      </header>

      <div className="mt-12">
        {questions.length === 0 ? (
          <EmptyState
            title={t.unavailableTitle}
            description={t.unavailableBody}
          />
        ) : (
          // Самите въпроси идват от базата на немски, а обвивката на
          // въпросника е чужда територия (задача 6) — тя се превежда там.
          <LevelTestQuiz questions={questions} action={submitLevelTest} />
        )}
      </div>
    </main>
  );
}
