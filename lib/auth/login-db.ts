import "server-only";

// Проверката на самоличност при вход.
//
// Отделена от server action-а, защото трябва да е тестваема без формата и
// без Next — а и защото тук са трите решения, които се бъркат най-често:
// изброяване на потребители, мек изтрит профил и презаписа на хеша.

import type { Role } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword, needsRehash, verifyAgainstNothing, verifyPassword } from "./password";

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

/** Действието в AuditLog. Записва се САМО при неуспех. */
const FAILED_ACTION = "auth.login.failed";

/**
 * Броят неуспешни опити от този IP в рамките на прозореца.
 *
 * Брои се в БАЗАТА, не в паметта: на Vercel всяка заявка може да попадне на
 * друга инстанция, а брояч в паметта на една от тях не пази от нищо. Същото
 * решение е взето и за заявките за обаждане (lib/cms/call-requests-db.ts).
 *
 * Заявката се обляга на @@index([createdAt]) — прозорецът е тесен, тоест
 * редовете за преглеждане са малко. Стане ли таблицата гореща, следващата
 * стъпка е индекс по (action, ip, createdAt), но той иска промяна в
 * замразения base.prisma, значи ревю.
 */
async function recentFailures(ip: string, now: Date): Promise<number> {
  const since = new Date(now.getTime() - LOGIN_WINDOW_MINUTES * 60 * 1000);

  return db.auditLog.count({
    where: { action: FAILED_ACTION, ip, createdAt: { gte: since } },
  });
}

/**
 * Записва неуспеха. Провалът на записа НЕ проваля входа.
 *
 * Ако базата не приеме реда, по-правилно е ограничението да отслабне,
 * отколкото формата да върне грешка на човек, който просто е сбъркал
 * паролата си.
 */
async function recordFailure(
  email: string,
  meta: { ip: string | null; userAgent: string | null },
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: FAILED_ACTION,
        entity: "User",
        // Имейлът влиза в actorEmail, а НЕ в entityId: entityId е за
        // идентификатор на съществуващ ред, а тук профил може и да няма.
        actorEmail: email,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch (error) {
    console.error("Записът на неуспешен вход се провали:", error);
  }
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
  if (meta.ip && (await recentFailures(meta.ip, now)) >= LOGIN_MAX_FAILURES) {
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
