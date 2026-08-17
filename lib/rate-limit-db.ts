import "server-only";

// Ограничение по IP за публичните действия, които пишат в базата.
//
// Броенето е в БАЗАТА, не в паметта: на Vercel всяка заявка може да попадне
// на друга инстанция, а брояч в паметта на една от тях не пази от нищо.
// Същото решение вече беше взето за заявките за обаждане
// (lib/cms/call-requests-db.ts) — тук е обобщено, за да не се появи трети
// вариант на същата идея.
//
// Ползва се AuditLog, а не нова таблица: моделът вече има action, ip,
// userAgent и индекс по createdAt, а base.prisma е замразен и промяна там
// иска ревю от другия разработчик.

import { db } from "@/lib/db";

// Имената на действията живеят в ЧИСТИЯ lib/rate-limit.ts, за да може и
// скрипт извън Next да ги внесе (scripts/e2e-cleanup.ts трие броячите
// между пусканията). Ре-експортират се оттук, за да не се пипат
// досегашните вносители.
export { RATE_ACTIONS, type RateAction } from "@/lib/rate-limit";

import { RATE_ACTIONS, type RateAction } from "@/lib/rate-limit";

export interface RateLimitRule {
  action: RateAction;
  windowMinutes: number;
  max: number;
}

/**
 * Правилата на едно място, за да се четат едно до друго.
 *
 * Числата са избрани спрямо истинско човешко поведение, не спрямо кръгли
 * стойности: човек прави ЕДНА регистрация, най-много две при объркване;
 * тест за ниво — един, най-много няколко от цяло семейство зад един рутер.
 */
export const RATE_LIMITS = {
  register: {
    action: RATE_ACTIONS.register,
    windowMinutes: 60,
    // Пет на час от един адрес. Цяло училище зад един NAT пак се събира.
    max: 5,
  },
  levelTest: {
    action: RATE_ACTIONS.levelTest,
    windowMinutes: 60,
    // По-щедро: тестът е безплатен вход към сайта и се прави и от семейство
    // зад един адрес. Спира машината, не човека.
    max: 20,
  },
} as const satisfies Record<string, RateLimitRule>;

/**
 * Надхвърлен ли е лимитът за този IP.
 *
 * Без IP НЕ ограничава: всички зад един прокси иначе се блокират взаимно.
 * Останалите защити (honeypot, време за попълване) продължават да действат.
 */
export async function isOverLimit(
  rule: RateLimitRule,
  ip: string | null,
  now: Date = new Date(),
): Promise<boolean> {
  if (!ip) return false;

  const since = new Date(now.getTime() - rule.windowMinutes * 60 * 1000);

  const count = await db.auditLog.count({
    where: { action: rule.action, ip, createdAt: { gte: since } },
  });

  return count >= rule.max;
}

/**
 * Отбелязва събитие. Провалът НЕ проваля действието.
 *
 * По-добре ограничението да отслабне, отколкото човек да не може да се
 * регистрира, защото един спомагателен запис не е минал.
 */
export async function recordEvent(
  action: RateAction,
  meta: {
    ip: string | null;
    userAgent: string | null;
    /** Имейл или друг белег — за разследване, не за ограничението. */
    actorEmail?: string | null;
    entity?: string;
  },
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        entity: meta.entity ?? "User",
        actorEmail: meta.actorEmail ?? null,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch (error) {
    console.error(`Записът на събитие „${action}" се провали:`, error);
  }
}
