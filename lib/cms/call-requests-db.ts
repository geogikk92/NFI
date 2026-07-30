// ТЕРИТОРИЯ НА БОБИ · задача 5 — заявки за обаждане, достъп до базата.
// Писано от Жоро, докато Боби е в отпуск.
//
// Отделен от call-requests.ts, защото ТОЗИ файл внася Prisma. Клиентски
// компонент, който импортира от него, влачи pg в браузърния бъндъл.

import { db } from "@/lib/db";
import { RATE_LIMIT_PER_HOUR, type CallRequestInput, type SpamVerdict } from "./call-requests";

/**
 * Брои заявките от този IP за последния час.
 *
 * Ограничението е в БАЗАТА, не в паметта: на Vercel всяка заявка може да
 * попадне на друга инстанция, а брояч в паметта на една от тях не пази
 * от нищо.
 */
export async function isRateLimited(
  ip: string | null,
  now: Date = new Date(),
): Promise<boolean> {
  // Без IP не ограничаваме — иначе всички зад един прокси се блокират
  // взаимно. Останалите две защити продължават да действат.
  if (!ip) return false;

  const since = new Date(now.getTime() - 60 * 60 * 1000);

  const count = await db.callRequest.count({
    where: { ip, createdAt: { gte: since } },
  });

  return count >= RATE_LIMIT_PER_HOUR;
}

export interface CreateCallRequestResult {
  id: string;
  flaggedAsSpam: boolean;
}

export async function createCallRequest(
  input: CallRequestInput,
  meta: { ip: string | null; userAgent: string | null; spam: SpamVerdict },
): Promise<CreateCallRequestResult> {
  // Проверява се, че курсът съществува — иначе подаден отвън courseId
  // би счупил вмъкването с чужд ключ.
  let courseId: string | null = null;
  if (input.courseId) {
    const course = await db.course.findUnique({
      where: { id: input.courseId },
      select: { id: true },
    });
    courseId = course?.id ?? null;
  }

  const created = await db.callRequest.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      message: input.message || null,
      preferredTime: input.preferredTime || null,
      source: input.source,
      status: meta.spam.spam ? "SPAM" : "NEW",
      courseId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      handledNote: meta.spam.spam
        ? `Автоматично маркирана: ${meta.spam.reason}`
        : null,
    },
    select: { id: true },
  });

  return { id: created.id, flaggedAsSpam: meta.spam.spam };
}

/** Курс по slug — за предварително избран курс от адреса. */
export async function findCourseForRequest(slug: string) {
  return db.course.findFirst({
    where: { slug, published: true },
    select: { id: true, title: true, titleDe: true, slug: true },
  });
}
