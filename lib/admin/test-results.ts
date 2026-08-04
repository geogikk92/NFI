import "server-only";

// АДМИН · задача 17e — резултатите от теста за ниво.
//
// САМО ЧЕТЕНЕ, нарочно. Резултатът е запис на нещо, което се е случило:
// човекът е отговорил така на този ден. Редакция би значела промяна на
// чужд отговор, а не поправка на данни — и би обезсмислила спора, заради
// който резултатът изобщо се пази („аз отговорих вярно на този въпрос").
//
// Затова тук няма нито update, нито delete. Изтриването на лични данни
// минава през GDPR потока на Жоро (задача 21), не през този екран.

import { db } from "@/lib/db";
import type { CourseLevel } from "@/lib/admin/queries";

export const TEST_RESULT_LIMIT = 200;

export interface AdminTestResultRow {
  id: string;
  name: string | null;
  email: string | null;
  score: number;
  maxScore: number;
  resultLevel: CourseLevel;
  createdAt: Date;
  /** Тестът завършва със заявка за обаждане — това е връзката към нея. */
  callRequestId: string | null;
  /** Има ли профил на сайта: подсказва дали е познат курсист. */
  hasAccount: boolean;
}

export async function listTestResults(options: {
  level?: CourseLevel | null;
} = {}): Promise<AdminTestResultRow[]> {
  const rows = await db.levelTestResult.findMany({
    where: options.level ? { resultLevel: options.level } : {},
    orderBy: { createdAt: "desc" },
    take: TEST_RESULT_LIMIT,
    select: {
      id: true,
      name: true,
      email: true,
      score: true,
      maxScore: true,
      resultLevel: true,
      createdAt: true,
      callRequestId: true,
      userId: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    score: row.score,
    maxScore: row.maxScore,
    resultLevel: row.resultLevel as CourseLevel,
    createdAt: row.createdAt,
    callRequestId: row.callRequestId,
    hasAccount: Boolean(row.userId),
  }));
}

export async function countTestResultsByLevel(): Promise<
  Record<string, number>
> {
  const rows = await db.levelTestResult.groupBy({
    by: ["resultLevel"],
    _count: { _all: true },
  });

  return Object.fromEntries(
    rows.map((row) => [row.resultLevel as string, row._count._all]),
  );
}

/** Един отговор, както го е дал човекът. */
export interface ScoredAnswerView {
  questionId: string;
  chosenOptionId: string | null;
  correct: boolean;
  earned: number;
  points: number;
  level?: string;
}

export interface AdminTestResultDetail {
  id: string;
  name: string | null;
  email: string | null;
  score: number;
  maxScore: number;
  resultLevel: CourseLevel;
  createdAt: Date;
  callRequestId: string | null;
  userEmail: string | null;
  /** Точки по ниво — така се вижда КЪДЕ се е спънал. */
  byLevel: { level: string; earned: number; possible: number }[];
  answers: ScoredAnswerView[];
}

/**
 * Json колоната се чете ЗАЩИТЕНО.
 *
 * Структурата е записана от нашия код, но е Json в базата: стар запис
 * отпреди промяна във формата не бива да вали екрана с 500. Липсващото
 * се показва като празно, а не като грешка.
 */
function readAnswers(raw: unknown): {
  byLevel: AdminTestResultDetail["byLevel"];
  answers: ScoredAnswerView[];
} {
  const empty = { byLevel: [], answers: [] };
  if (typeof raw !== "object" || raw === null) return empty;

  const bag = raw as Record<string, unknown>;

  const byLevel =
    typeof bag.byLevel === "object" && bag.byLevel !== null
      ? Object.entries(bag.byLevel as Record<string, unknown>).map(
          ([level, value]) => {
            const cell = (value ?? {}) as { earned?: number; possible?: number };
            return {
              level,
              earned: Number(cell.earned ?? 0),
              possible: Number(cell.possible ?? 0),
            };
          },
        )
      : [];

  const answers = Array.isArray(bag.scored)
    ? (bag.scored as Record<string, unknown>[]).map((item) => ({
        questionId: String(item.questionId ?? ""),
        chosenOptionId:
          item.chosenOptionId == null ? null : String(item.chosenOptionId),
        correct: Boolean(item.correct),
        earned: Number(item.earned ?? 0),
        points: Number(item.points ?? 0),
        level: item.level == null ? undefined : String(item.level),
      }))
    : [];

  return { byLevel, answers };
}

export async function getTestResult(
  id: string,
): Promise<AdminTestResultDetail | null> {
  const row = await db.levelTestResult.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      score: true,
      maxScore: true,
      resultLevel: true,
      createdAt: true,
      callRequestId: true,
      answers: true,
      user: { select: { email: true } },
    },
  });
  if (!row) return null;

  const { byLevel, answers } = readAnswers(row.answers);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    score: row.score,
    maxScore: row.maxScore,
    resultLevel: row.resultLevel as CourseLevel,
    createdAt: row.createdAt,
    callRequestId: row.callRequestId,
    userEmail: row.user?.email ?? null,
    byLevel,
    answers,
  };
}
