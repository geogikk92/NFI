// Накъде сочи DATABASE_URL — локално или към жива база.
//
// Съществува, защото два различни инструмента правеха една и съща грешка:
// решаваха „това продукция ли е" по NODE_ENV, тоест по КЪДЕ ТЕЧЕ КОДЪТ, а
// значение има само КЪДЕ ПИШЕ. И двата се пускат локално срещу отдалечена
// база — сийдът по указание на самия деплой документ, тестовете по
// невнимание — и точно тогава проверката по NODE_ENV мълчи.
//
// НЕ внася Prisma: ползва се и от vitest.setup.ts преди всякакви тестове.

/** Хостове, които се приемат за машината на разработчика. */
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  // имена на услуги в docker-compose
  "db",
  "postgres",
  "database",
]);

/**
 * Локална ли е базата, към която сочи низът.
 *
 * Неразбираем низ се смята за НЕлокален. Грешката в тази посока значи
 * „откажи да пишеш"; в обратната — „изтрий продукционни данни".
 */
export function isLocalDatabase(url: string | undefined | null): boolean {
  if (!url) return false;

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  return LOCAL_HOSTS.has(host) || host.endsWith(".local");
}

/**
 * Спира изпълнението, ако базата не е локална.
 *
 * `escapeHatch` е името на променливата от средата, която разрешава
 * изключение. Стойността ѝ е дълга и на български нарочно: не се набира
 * случайно и не се копира, без да се прочете.
 */
export function assertLocalDatabase(options: {
  what: string;
  why: string;
  escapeHatch?: { name: string; value: string };
}): void {
  const url = process.env.DATABASE_URL;
  if (isLocalDatabase(url)) return;

  const hatch = options.escapeHatch;
  if (hatch && process.env[hatch.name] === hatch.value) return;

  let host = "(неразпознат)";
  try {
    host = new URL(url ?? "").hostname;
  } catch {
    /* остава неразпознат */
  }

  throw new Error(
    [
      "",
      `${options.what} отказва да работи с НЕлокална база.`,
      `  Хост: ${host}`,
      "",
      `  ${options.why}`,
      ...(hatch
        ? ["", "  Ако наистина това искаш:", `    ${hatch.name}=${hatch.value} …`]
        : []),
      "",
    ].join("\n"),
  );
}
