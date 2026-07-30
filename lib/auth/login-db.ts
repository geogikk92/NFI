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
  | { kind: "locked" };

export async function authenticate(
  email: string,
  password: string,
): Promise<AuthOutcome> {
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
    return { kind: "failed" };
  }

  // Проверката на паролата минава ПРЕДИ проверката за изтрит профил.
  //
  // Обратният ред пак изброява: „профилът не е активен" при позната
  // парола е едно, но при ПРОИЗВОЛНА парола същият отговор казва на чужд
  // човек, че такъв адрес съществува у нас.
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return { kind: "failed" };

  if (user.deletedAt) return { kind: "locked" };

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
