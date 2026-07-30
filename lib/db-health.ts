import "server-only";

// Разграничава „няма данни" от „няма база".
//
// Двете изглеждат еднакво на страницата — празен списък — но значат
// съвсем различни неща: първото е нормално състояние, второто е счупен
// деплой. Без това разграничение сайтът се вдига, изглежда наред и тихо
// не показва нито един курс.

/** Конфигурирана ли е база изобщо. Не проверява дали отговаря. */
export function hasDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "no-database" | "unreachable" };

/**
 * Изпълнява заявка и връща РАЗЛИЧЕН резултат за трите случая: успех,
 * липсваща конфигурация и недостъпна база.
 *
 * Не хвърля: страница, която пада с 500 при недостъпна база, не казва на
 * никого какво липсва. По-полезно е да се вдигне и да го напише.
 */
export async function loadOrExplain<T>(
  query: () => Promise<T>,
): Promise<LoadResult<T>> {
  if (!hasDatabaseConfigured()) {
    return { ok: false, reason: "no-database" };
  }

  try {
    return { ok: true, data: await query() };
  } catch (error) {
    // Логът отива при разработчика; посетителят вижда съобщение.
    console.error("Заявката към базата се провали:", error);
    return { ok: false, reason: "unreachable" };
  }
}
