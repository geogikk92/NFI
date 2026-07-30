import "server-only";

// Какво знаем за един човек — събрано на едно място.
//
// Това не е удобство, а изискване: чл. 15 GDPR дава право на достъп до
// собствените данни, а страница, която ги показва, е най-краткият честен
// отговор на „какво пазите за мен".
//
// Затова тук НЕ се подбира „приятното". Показва се и това, което човек не
// очаква да сме запазили — съгласията с IP адрес например.

import { db } from "@/lib/db";
import type { ConsentType } from "@/app/generated/prisma/client";

export interface AccountConsent {
  id: string;
  type: ConsentType;
  textVersion: string;
  granted: boolean;
  requestedAt: Date;
  confirmedAt: Date | null;
  revokedAt: Date | null;
}

export interface AccountTestResult {
  id: string;
  score: number;
  maxScore: number;
  resultLevel: string;
  createdAt: Date;
}

export interface AccountOverview {
  name: string | null;
  email: string;
  phone: string | null;
  locale: string;
  emailVerified: Date | null;
  createdAt: Date;
  consents: AccountConsent[];
  testResults: AccountTestResult[];
}

/**
 * Данните на ЕДИН потребител, по неговия id.
 *
 * Никога не приема имейл отвън: id-то идва от сесията, тоест от нещо,
 * което човекът е доказал, че притежава. Функция, която приема имейл, рано
 * или късно се вика с имейл от формата и става начин да се чете чужд профил.
 */
export async function getAccountOverview(
  userId: string,
): Promise<AccountOverview | null> {
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      name: true,
      email: true,
      phone: true,
      locale: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  const [consents, testResults] = await Promise.all([
    db.consentLog.findMany({
      // И по userId, И по имейл: съгласие, дадено ПРЕДИ регистрацията
      // (например бюлетин от гост), няма userId, но е на същия човек.
      // Без второто условие страницата казва „нищо не си давал", а в
      // базата стои запис с неговия адрес.
      where: { OR: [{ userId }, { email: user.email }] },
      select: {
        id: true,
        type: true,
        textVersion: true,
        granted: true,
        requestedAt: true,
        confirmedAt: true,
        revokedAt: true,
      },
      orderBy: { requestedAt: "desc" },
      // Границата пази страницата от профил с хиляди записи. Пълният
      // списък е част от износа по чл. 20 — отделна задача.
      take: 50,
    }),
    db.levelTestResult.findMany({
      where: { OR: [{ userId }, { email: user.email }] },
      select: {
        id: true,
        score: true,
        maxScore: true,
        resultLevel: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return { ...user, consents, testResults };
}
