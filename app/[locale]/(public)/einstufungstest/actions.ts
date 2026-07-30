"use server";

// Задача 6 — обработка на теста.

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { answersSchema, scoreTest, type Answers } from "@/lib/cms/level-test";
import { listQuizQuestions, saveTestResult } from "@/lib/cms/level-test-db";
import { toLocale } from "@/lib/i18n/config";
import { LOCALE_FIELD } from "@/lib/auth/register";
import { clientIp } from "@/lib/request-ip";
import { RATE_ACTIONS, RATE_LIMITS, isOverLimit, recordEvent } from "@/lib/rate-limit-db";

/**
 * Точкува и записва, после пренасочва към резултата.
 *
 * Точкуването е на СЪРВЪРА: клиентът праща само избраните опции. Ако
 * нивото се смяташе в браузъра, всеки можеше да си обяви C2 — а от
 * резултата зависи какъв курс препоръчваме и колко струва.
 */
/**
 * Таван на приеманите отговори.
 *
 * `answersSchema` ограничава ДЪЛЖИНАТА на всеки ключ и стойност, но не и
 * БРОЯ им. Без този таван едно тяло от 1 MB (лимитът на Next) минава
 * валидацията с хиляди двойки по 32 знака и всичките влизат дословно в
 * Json колоната — а те не отговарят на нито един въпрос и не участват в
 * точкуването, което чете само по question.id.
 *
 * Числото е с голям запас над реалния тест (8 въпроса в сийда): таванът
 * пази от машина, не стеснява теста.
 */
const MAX_ANSWERS = 100;

export async function submitLevelTest(formData: FormData): Promise<void> {
  const locale = toLocale(formData.get(LOCALE_FIELD));

  const raw: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("answer:")) continue;
    if (Object.keys(raw).length >= MAX_ANSWERS) break;
    const questionId = key.slice("answer:".length);
    if (questionId) raw[questionId] = String(value);
  }

  const parsed = answersSchema.safeParse(raw);
  const answers: Answers = parsed.success ? parsed.data : {};

  const [ip, store] = await Promise.all([clientIp(), headers()]);

  // Формата няма нито honeypot, нито време за попълване — за разлика от
  // съседните две. А всяко извикване е гарантиран запис в базата: дори при
  // провалила се валидация `answers` пада на {} и редът пак се създава.
  //
  // При надхвърлен лимит се пренасочва към самия тест, а не се хвърля:
  // човек, попаднал тук зад общ адрес, вижда страницата, а не грешка.
  if (await isOverLimit(RATE_LIMITS.levelTest, ip)) {
    console.warn(`[einstufungstest] Надхвърлен лимит по IP, locale=${locale}`);
    redirect(`/${locale}/einstufungstest`);
  }

  const questions = await listQuizQuestions();
  const result = scoreTest(questions, answers);

  const saved = await saveTestResult({ result, rawAnswers: answers });

  await recordEvent(RATE_ACTIONS.levelTest, {
    ip,
    userAgent: store.get("user-agent"),
    entity: "LevelTestResult",
  });

  // Резултатът се чете по id от адреса, не се носи в сесия — така линкът
  // може да се сподели и да се отвори пак.
  //
  // С езиков префикс. Без него middleware-ът преизчислява езика от
  // Accept-Language и човек, попълнил цял тест на немски, вижда резултата
  // си на български — виж коментара в (shop)/actions.ts.
  redirect(`/${locale}/einstufungstest/ergebnis/${saved.id}`);
}
