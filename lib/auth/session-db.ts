import "server-only";

// Сесията откъм базата и бисквитките.
//
// Съзнателно НЕ е Auth.js, макар пакетът да е инсталиран: Credentials
// доставчикът там налага JWT сесии, тоест таблицата Session остава празна,
// а отнемането на достъп чака изтичане на токена. Тук редът в базата Е
// сесията — триеш го, човекът е навън в същия миг. Ако някога дойде вход
// с Google, Auth.js се връща в играта за него.

import { cache } from "react";
import { cookies } from "next/headers";
import type { Role } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  generateSessionToken,
  hashSessionToken,
  isExpired,
  sessionCookieOptions,
  sessionExpiry,
} from "./session";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  // Взима се от схемата, а не се преписва: добави ли се роля в
  // prisma/schema/base.prisma, преписаният съюз се разминава мълчаливо.
  role: Role;
  locale: string;
}

/**
 * Създава сесия и слага бисквитката.
 *
 * ВИКА СЕ САМО от server action или route handler — Next 15 не позволява
 * запис на бисквитка при рендиране на страница и хвърля.
 */
export async function createSession(userId: string): Promise<void> {
  const token = generateSessionToken();
  const now = new Date();

  await db.session.create({
    data: {
      // В базата влиза ХЕШЪТ. Самият токен живее само в бисквитката.
      sessionToken: hashSessionToken(token),
      userId,
      expires: sessionExpiry(now),
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_SECONDS));
}

/**
 * Кой е посетителят — или null.
 *
 * Обвито в React `cache()`: layout-ът, страницата и всеки компонент под тях
 * питат независимо, а Next мемоизира само `fetch()`, не и Prisma. Без това
 * едно зареждане прави по една заявка на извикване.
 *
 * НЕ пипа бисквитки: функцията се вика при рендиране на страница, където
 * записът хвърля. Затова и срокът е абсолютен (виж session.ts).
 */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // Заявката е в try: `currentUser()` се вика от SiteShell, тоест от
  // обвивката на ВСЯКА публична страница. Хвърли ли тук, паднала база
  // изкарва 500 на целия сайт — включително на Impressum и Datenschutz,
  // които по §5 DDG трябва да са достъпни.
  //
  // Отказът е в посока „не е влязъл", а не „влязъл е": това е безопасната
  // посока. Пазачът на админа тогава отказва достъп, което е правилното
  // поведение при база, на която не може да се вярва.
  let session;
  try {
    session = await db.session.findUnique({
      where: { sessionToken: hashSessionToken(token) },
      select: {
        expires: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            locale: true,
            deletedAt: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Сесията не може да се прочете (базата не отговаря):", error);
    return null;
  }

  if (!session) return null;

  if (isExpired(session.expires, new Date())) {
    // Чисти се веднага, а не с нощна задача: редът вече не върши работа, а
    // изтритата сесия не може да бъде използвана, ако часовникът някъде
    // се върне назад. Запис в базата при рендиране е позволен — забраната
    // важи само за бисквитките.
    await db.session
      .deleteMany({ where: { sessionToken: hashSessionToken(token) } })
      .catch(() => {
        // Недостъпна база не бива да превръща „излязъл" в срив на
        // страницата. Резултатът е същият: човекът не е влязъл.
      });
    return null;
  }

  // Меко изтритият профил няма достъп, макар редът и сесията да стоят.
  // Проверката е ТУК, а не при вход: изтриването става, докато човекът е
  // влязъл, и трябва да подейства на следващата заявка, не на следващия
  // вход.
  if (!session.user || session.user.deletedAt) return null;

  // Изброява се поле по поле, вместо да се маха deletedAt с деструктуриране:
  // добави ли се утре колона в select-а по-горе, тя няма да изтече мълчаливо
  // в типа на сесията.
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    locale: session.user.locale,
  };
});

/**
 * Изход: трие реда И бисквитката.
 *
 * Редът се трие пръв. Обратният ред би оставил жива сесия в базата, ако
 * заявката се прекъсне по средата — а бисквитка без ред е безобидна.
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.session
      .deleteMany({ where: { sessionToken: hashSessionToken(token) } })
      .catch(() => {
        // Дори базата да не отговори, бисквитката пада — за човека пред
        // екрана „Изход" трябва да значи изход.
      });
  }

  store.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

/**
 * Всички сесии на един потребител — при смяна на парола или при отнемане
 * на права. Не се вика отникъде още; стои, защото смяната на парола без
 * това оставя откраднатите сесии живи.
 */
export async function destroyAllSessionsFor(userId: string): Promise<number> {
  const { count } = await db.session.deleteMany({ where: { userId } });
  return count;
}
