// Задача 6 — тест за ниво.
//
// ЧИСТ модул: без база, за да може да се импортира от клиентски компонент
// и да се тества до последната точка. Заявките са в level-test-db.ts.
//
// Тестът завършва със заявка за обаждане (източник LEVEL_TEST) — целта не
// е да дадем оценка, а разговор. Затова резултатът е винаги позитивен и
// винаги предлага следваща стъпка.

import { z } from "zod";

export type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const LEVELS: readonly CourseLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  position: number;
  prompt: string;
  options: QuizOption[];
  points: number;
  level: CourseLevel;
}

/** Отговорите, както идват от формата: id на въпроса → id на опцията. */
export const answersSchema = z.record(
  z.string().min(1).max(64),
  z.string().min(1).max(64),
);

export type Answers = z.infer<typeof answersSchema>;

export interface ScoredAnswer {
  questionId: string;
  chosenOptionId: string | null;
  correctOptionId: string | null;
  correct: boolean;
  points: number;
  earned: number;
  level: CourseLevel;
}

export interface TestResult {
  score: number;
  maxScore: number;
  /** 0..1 */
  ratio: number;
  resultLevel: CourseLevel;
  answers: ScoredAnswer[];
  /** Колко верни на ниво — показва се като разбивка. */
  byLevel: Record<CourseLevel, { earned: number; possible: number }>;
}

/**
 * Точкува теста.
 *
 * Правило за нивото: човекът получава **най-високото ниво, на което е
 * отговорил вярно на поне 60%** от въпросите, но не по-високо от нивото
 * непосредствено след първото, което е пропаднал. Иначе един случайно
 * познат C2 въпрос би пратил начинаещ в най-горния курс.
 */
export const PASS_RATIO = 0.6;

export function scoreTest(
  questions: readonly QuizQuestion[],
  answers: Answers,
): TestResult {
  const byLevel = Object.fromEntries(
    LEVELS.map((level) => [level, { earned: 0, possible: 0 }]),
  ) as TestResult["byLevel"];

  const scored: ScoredAnswer[] = questions.map((question) => {
    const chosen = answers[question.id] ?? null;
    const correctOption = question.options.find((option) => option.correct);
    const correct = chosen !== null && correctOption?.id === chosen;
    const earned = correct ? question.points : 0;

    byLevel[question.level].possible += question.points;
    byLevel[question.level].earned += earned;

    return {
      questionId: question.id,
      chosenOptionId: chosen,
      correctOptionId: correctOption?.id ?? null,
      correct,
      points: question.points,
      earned,
      level: question.level,
    };
  });

  const score = scored.reduce((sum, answer) => sum + answer.earned, 0);
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

  return {
    score,
    maxScore,
    ratio: maxScore > 0 ? score / maxScore : 0,
    resultLevel: resolveLevel(byLevel),
    answers: scored,
    byLevel,
  };
}

/**
 * Най-високото ниво с поне 60% верни, БЕЗ прескакане на пропаднало.
 *
 * Върви отдолу нагоре и спира на първото ниво, което не е минато — така
 * случайно познат въпрос от по-горно ниво не вдига резултата.
 * Ниво без въпроси не прекъсва веригата (просто се пропуска).
 */
export function resolveLevel(
  byLevel: TestResult["byLevel"],
): CourseLevel {
  let best: CourseLevel = "A1";

  for (const level of LEVELS) {
    const bucket = byLevel[level];
    if (bucket.possible === 0) continue;

    if (bucket.earned / bucket.possible >= PASS_RATIO) {
      best = level;
    } else {
      break;
    }
  }

  return best;
}

/** Немският текст на резултата. Винаги окуражаващ, винаги с покана. */
export function resultCopy(level: CourseLevel): {
  headline: string;
  body: string;
} {
  const copy: Record<CourseLevel, { headline: string; body: string }> = {
    A1: {
      headline: "Sie starten bei A1",
      body: "Ein guter Anfang — bei A1 lernen Sie die Grundlagen für den Alltag. Wir zeigen Ihnen den passenden Kurs.",
    },
    A2: {
      headline: "Ihr Niveau liegt bei A2",
      body: "Sie haben schon Grundlagen. Bei A2 bauen Sie darauf auf und meistern alltägliche Gespräche.",
    },
    B1: {
      headline: "Ihr Niveau liegt bei B1",
      body: "Sie kommen im Alltag zurecht. Bei B1 wird Ihr Deutsch sicherer — auch für Arbeit und Behörden.",
    },
    B2: {
      headline: "Ihr Niveau liegt bei B2",
      body: "Sie sprechen fortgeschritten. B2 ist das Niveau, das viele Arbeitgeber und Hochschulen verlangen.",
    },
    C1: {
      headline: "Ihr Niveau liegt bei C1",
      body: "Sehr stark. Bei C1 geht es um Feinheiten, Fachsprache und Prüfungsvorbereitung.",
    },
    C2: {
      headline: "Ihr Niveau liegt bei C2",
      body: "Beeindruckend — nahe am muttersprachlichen Niveau. Wir beraten Sie zu Prüfungen und Spezialkursen.",
    },
  };

  return copy[level];
}

/**
 * Прогресът в проценти за индикатора. Отделна функция, защото се ползва
 * и от aria-valuenow, и от ширината на лентата — двете не бива да се
 * разминават.
 */
export function progressPercent(current: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((current / total) * 100);
}
