// Задача 6 — тест за ниво, достъп до базата.
//
// Отделен от level-test.ts, защото внася Prisma. Клиентски компонент,
// който импортира оттук, влачи pg в браузърния бъндъл.

import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import type { Answers, CourseLevel, QuizOption, QuizQuestion, TestResult } from "./level-test";

/**
 * `options` е Json в схемата. Парсва се защитно: сгрешен запис от админа
 * не бива да събаря публичната страница.
 *
 * Връща null за въпрос, който не може да се ползва — извикващият го
 * пропуска, вместо да показва счупен въпрос.
 */
function parseOptions(raw: unknown): QuizOption[] | null {
  if (!Array.isArray(raw)) return null;

  const options: QuizOption[] = [];

  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) return null;
    const value = entry as Record<string, unknown>;
    if (typeof value.id !== "string" || value.id.length === 0) return null;
    if (typeof value.text !== "string") return null;
    options.push({
      id: value.id,
      text: value.text,
      correct: value.correct === true,
    });
  }

  // Въпрос без отговори или без точно един верен е неизползваем: с нула
  // верни никой не може да го познае, с два — точкуването става случайно.
  if (options.length < 2) return null;
  if (options.filter((option) => option.correct).length !== 1) return null;

  return options;
}

/** Активните въпроси, подредени. Счупените се пропускат мълчаливо. */
export async function listQuizQuestions(): Promise<QuizQuestion[]> {
  const rows = await db.levelTestQuestion.findMany({
    where: { active: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      prompt: true,
      options: true,
      points: true,
      level: true,
    },
  });

  const questions: QuizQuestion[] = [];

  for (const row of rows) {
    const options = parseOptions(row.options);
    if (!options) continue;

    questions.push({
      id: row.id,
      position: row.position,
      prompt: row.prompt,
      options,
      points: row.points,
      level: row.level as CourseLevel,
    });
  }

  return questions;
}

export async function saveTestResult(input: {
  result: TestResult;
  rawAnswers: Answers;
  email?: string | null;
  name?: string | null;
  userId?: string | null;
}): Promise<{ id: string }> {
  return db.levelTestResult.create({
    data: {
      userId: input.userId ?? null,
      email: input.email || null,
      name: input.name || null,
      score: input.result.score,
      maxScore: input.result.maxScore,
      resultLevel: input.result.resultLevel,
      // Пазят се пълните отговори, за да може резултатът да се преразгледа
      // и да се провери спорна оценка. Кастът е нужен, защото Prisma
      // Json не приема произволен интерфейс, а структурата е сериализуема.
      answers: {
        raw: input.rawAnswers,
        scored: input.result.answers,
        byLevel: input.result.byLevel,
      } as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}

/** Курсовете, подходящи за резултата — показват се веднага след теста. */
export async function suggestCoursesForLevel(
  level: CourseLevel,
  limit = 3,
) {
  return db.course.findMany({
    where: { published: true, level },
    take: limit,
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      titleDe: true,
      summary: true,
      summaryDe: true,
      level: true,
      format: true,
      priceCents: true,
      durationWeeks: true,
      hoursPerWeek: true,
      maxParticipants: true,
      startsAt: true,
      coverMediaId: true,
    },
  });
}
