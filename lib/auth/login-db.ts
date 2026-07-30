import "server-only";

// Проверката на самоличност при вход.
//
// Отделена от server action-а, защото трябва да е тестваема без формата и
// без Next — а и защото тук са трите решения, които се бъркат най-често:
// изброяване на потребители, мек изтрит профил и презаписа на хеша.

import type { Role } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword, needsRehash, verifyAgainstNothing, verifyPassword } from "./password";
import { RATE_ACTIONS, isOverLimit, recordEvent } from "@/lib/rate-limit-db";

export type AuthOutcome =
  | { kind: "ok"; userId: string; role: Role }
  /** Непознат имейл ИЛИ грешна парола — нарочно неразличими. */
  | { kind: "failed" }
  /** Профилът съществува, но е меко изтрит. */
  | { kind: "locked" }
  /** Твърде много неуспешни опити от този адрес. */
  | { kind: "rate-limited" };

/**
 * Колко неуспешни опита от един IP се търпят и за какъв период.
 *
 * Ограничението е по IP, НЕ по имейл, и това е нарочно. Заключването по
 * имейл изглежда по-точно, но дава на всеки непознат начин да заключи чужд
 * профил: набива десет грешни пароли на чужд адрес и човекът остава отвън.
 * По IP спираме подбора на пароли, без да даваме такова оръжие.
 *
 * scrypt при N=16384 иска ~80 ms, тоест и без ограничение един източник
 * прави ~12 опита в секунда. Числата тук свалят това до 10 на 15 минути,
 * което не пречи на човек, сбъркал паролата няколко пъти.
 */
export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_MAX_FAILURES = 10;

/** Правилото за входа, в общия вид от lib/rate-limit-db.ts. */
const LOGIN_RULE = {
  action: RATE_ACTIONS.loginFailed,
  windowMinutes: LOGIN_WINDOW_MINUTES,
  max: LOGIN_MAX_FAILURES,
} as const;

/**
 * Записва неуспеха.
 *
 * Имейлът влиза в actorEmail, а НЕ в entityId: entityId е за идентификатор
 * на съществуващ ред, а тук профил може и да няма.
 */
async function recordFailure(
  email: string,
  meta: { ip: string | null; userAgent: string | null },
): Promise<void> {
  await recordEvent(RATE_ACTIONS.loginFailed, { ...meta, actorEmail: email });
}

export async function authenticate(
  email: string,
  password: string,
  meta: { ip: string | null; userAgent: string | null } = {
    ip: null,
    userAgent: null,
  },
): Promise<AuthOutcome> {
  const now = new Date();

  // Проверката е ПРЕДИ заявката към базата и преди scrypt. Така спряният
  // източник не ни струва нито заявка, нито 80 ms процесор — иначе самото
  // ограничение става начин да ни натоварят.
  //
  // Без IP не ограничаваме: всички зад един прокси иначе се блокират
  // взаимно. Останалите защити продължават да действат.
  if (await isOverLimit(LOGIN_RULE, meta.ip, now)) {
    return { kind: "rate-limited" };
  }

  const user = await db.user.findFirst({
    where: {
      // Регистърът не значи нищо в имейл адрес. Postgres пази адреса както
      // е въведен, а човек, регистрирал се с главна буква, иначе не може
      // да влезе никога и без видима причина.
      email: { equals: email, mode: "insensitive" },
    },
    select: {
      id: true,
      role: true,
      passwordHash: true,
      deletedAt: true,
    },
  });

  if (!user) {
    // Изгаряме същото време, както при истинска проверка.
    //
    // Без това страницата отговаря забележимо по-бързо за непознат имейл,
    // отколкото за познат — а scrypt при N=16384 иска ~80 ms, което се
    // мери и през интернет. Така формата се превръща в справка кой е наш
    // клиент, и то без нито един успешен вход.
    await verifyAgainstNothing(password);
    await recordFailure(email, meta);
    return { kind: "failed" };
  }

  // Проверката на паролата минава ПРЕДИ проверката за изтрит профил.
  //
  // Обратният ред пак изброява: „профилът не е активен" при позната
  // парола е едно, но при ПРОИЗВОЛНА парола същият отговор казва на чужд
  // човек, че такъв адрес съществува у нас.
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await recordFailure(email, meta);
    return { kind: "failed" };
  }

  if (user.deletedAt) {
    await recordFailure(email, meta);
    return { kind: "locked" };
  }

  // Последният момент, в който чистата парола е в ръцете ни.
  //
  // Ако параметрите на scrypt са вдигнати, откакто този човек е сменял
  // паролата си, тук се презаписва тихо — без принудителен ресет и без
  // да го забележи. Провалът не бива да проваля входа: хешът си остава
  // старият, което е точно днешното състояние.
  if (needsRehash(user.passwordHash)) {
    try {
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });
    } catch (error) {
      console.error("Презаписът на хеша се провали (входът продължава):", error);
    }
  }

  return { kind: "ok", userId: user.id, role: user.role };
}
