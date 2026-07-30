"use server";

// Задача 6 — обработка на теста.

import { redirect } from "next/navigation";
import { answersSchema, scoreTest, type Answers } from "@/lib/cms/level-test";
import { listQuizQuestions, saveTestResult } from "@/lib/cms/level-test-db";
import { toLocale } from "@/lib/i18n/config";
import { LOCALE_FIELD } from "@/lib/auth/register";

/**
 * Точкува и записва, после пренасочва към резултата.
 *
 * Точкуването е на СЪРВЪРА: клиентът праща само избраните опции. Ако
 * нивото се смяташе в браузъра, всеки можеше да си обяви C2 — а от
 * резултата зависи какъв курс препоръчваме и колко струва.
 */
export async function submitLevelTest(formData: FormData): Promise<void> {
  const raw: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:")) continue;
    const questionId = key.slice("answer:".length);
    if (questionId) raw[questionId] = String(value);
  }

  const parsed = answersSchema.safeParse(raw);
  const answers: Answers = parsed.success ? parsed.data : {};

  const questions = await listQuizQuestions();
  const result = scoreTest(questions, answers);

  const saved = await saveTestResult({ result, rawAnswers: answers });

  // Резултатът се чете по id от адреса, не се носи в сесия — така линкът
  // може да се сподели и да се отвори пак.
  // С езиков префикс. Без него middleware-ът преизчислява езика от
  // Accept-Language и човек, попълнил цял тест на немски, вижда резултата
  // си на български — виж коментара в (shop)/actions.ts.
  const locale = toLocale(formData.get(LOCALE_FIELD));
  redirect(`/${locale}/einstufungstest/ergebnis/${saved.id}`);
}
