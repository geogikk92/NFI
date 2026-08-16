// Групиране по дни за диаграмите на таблото.
//
// ЧИСТ модул: без база и без Prisma, за да се тества сам. Заявката към
// базата взима редовете с резерв, а точната граница на прозореца се реже
// тук — така въпросът „кога свършва денят" има един-единствен отговор.
//
// Денят е БЕРЛИНСКИ, не UTC. Институтът е в Нюрнберг, сървърът работи по
// UTC, а заявка, подадена в 00:30 берлинско време, е UTC 22:30 или 23:30
// на предния ден според сезона. По UTC тя би се появила в диаграмата един
// ден по-рано, отколкото в списъка със заявки — и числата спират да си
// съвпадат точно когато някой ги сверява.

/** Зоната на института. Сървърът може да е където и да е. */
export const BERLIN = "Europe/Berlin";

/**
 * Позволените прозорци.
 *
 * Затворен списък, не свободно число: „?dni=100000" би накарало таблото
 * да прочете цялата таблица, а адресите се редактират на ръка.
 */
export const TREND_WINDOWS = [30, 90] as const;

export type TrendWindow = (typeof TREND_WINDOWS)[number];

export const DEFAULT_TREND_WINDOW: TrendWindow = 30;

/** Непознатото пада към 30 дни, вместо да гърми с 500. */
export function parseTrendWindow(value: unknown): TrendWindow {
  // Типът се проверява ПРЕДИ Number(): `Number(["90"])` е 90, тоест
  // повторен параметър в адреса („?dni=90&dni=90") иначе минава за
  // валиден през масива, който Next подава.
  if (typeof value !== "string" && typeof value !== "number") {
    return DEFAULT_TREND_WINDOW;
  }

  const parsed = Number(value);
  return (TREND_WINDOWS as readonly number[]).includes(parsed)
    ? (parsed as TrendWindow)
    : DEFAULT_TREND_WINDOW;
}

export interface TrendPoint {
  /** Денят като „2026-08-16" — по календара на зоната, не по UTC. */
  day: string;
  count: number;
}

export interface TrendOptions {
  /** Колко дни назад, включително днешния. */
  days: number;
  now?: Date;
  timeZone?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * В кой ден попада моментът според зоната.
 *
 * „sv-SE" е нарочно: шведският формат за дата Е „2026-08-16", тоест
 * получаваме ISO реда наготово, без ръчно сглобяване на частите.
 */
function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Брой събития за всеки ден от прозореца.
 *
 * Дните БЕЗ събития излизат с нула, а не липсват: празната точка е
 * информация („този ден никой не се обади"), а прескочен ден изкривява
 * линията, защото разстоянието между точките престава да е време.
 */
export function bucketByDay(
  dates: readonly Date[],
  { days, now = new Date(), timeZone = BERLIN }: TrendOptions,
): TrendPoint[] {
  // Броенето върви върху ГОЛА дата в UTC пространство. Ако се вадеха
  // 24 часа от истински момент, нощта на смяната на лятното време (23
  // или 25 часа) щеше да дублира или да изяде ден.
  const lastMidnightUtc = new Date(`${dayKey(now, timeZone)}T00:00:00Z`);

  const keys: string[] = [];
  for (let back = days - 1; back >= 0; back--) {
    keys.push(
      new Date(lastMidnightUtc.getTime() - back * DAY_MS)
        .toISOString()
        .slice(0, 10),
    );
  }

  const counts = new Map(keys.map((key) => [key, 0]));

  for (const date of dates) {
    const key = dayKey(date, timeZone);
    const current = counts.get(key);
    // Извън прозореца (и в двете посоки) — подминава се. Залепянето му за
    // крайния ден би направило връх, който никога не е имало.
    if (current !== undefined) counts.set(key, current + 1);
  }

  return keys.map((day) => ({ day, count: counts.get(day) ?? 0 }));
}

/**
 * Долната граница за заявката към базата — с ЕДИН ДЕН резерв.
 *
 * Резервът е защото границата на деня в Берлин не съвпада с UTC.
 * По-евтино е да се прочетат няколко излишни реда, отколкото заявката да
 * знае за часови зони: филтърът остава прост `createdAt >= …` върху
 * индексирания стълб, а рязането прави bucketByDay.
 */
export function trendWindowStart(
  days: number,
  now: Date = new Date(),
  timeZone: string = BERLIN,
): Date {
  const lastMidnightUtc = new Date(`${dayKey(now, timeZone)}T00:00:00Z`);
  return new Date(lastMidnightUtc.getTime() - days * DAY_MS);
}
