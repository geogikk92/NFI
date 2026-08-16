// Тестове на групирането по дни · таблото на админа.
//
// Правят се срещу ОЧАКВАНОТО поведение, не срещу текущата реализация.
// Ако тест падне, първо се проверява дали не е прав ТОЙ.
//
// Часовата зона е сърцето на този модул: институтът е в Нюрнберг, а
// сървърът работи по UTC. Заявка, подадена в 23:30 берлинско време на
// 16 август, е UTC 21:30 на 16 август през лятото — но през зимата
// същият час е 22:30, а заявка в 00:30 берлинско е UTC 23:30 на
// ПРЕДНИЯ ден. Групиране по UTC би я преместило с един ден назад и
// денят в диаграмата не съвпада с деня в списъка със заявки.

import { describe, expect, it } from "vitest";
import {
  bucketByDay,
  parseTrendWindow,
  trendWindowStart,
  BERLIN,
  DEFAULT_TREND_WINDOW,
} from "./trend";

describe("bucketByDay", () => {
  const now = new Date("2026-08-16T10:00:00Z");

  it("връща по един ред за всеки ден от прозореца, включително днешния", () => {
    const points = bucketByDay([], { days: 7, now });

    expect(points).toHaveLength(7);
    expect(points[0].day).toBe("2026-08-10");
    expect(points[6].day).toBe("2026-08-16");
  });

  it("дава нула за дните без нищо — липсваща точка не е същото като нула", () => {
    const points = bucketByDay([new Date("2026-08-16T09:00:00Z")], {
      days: 3,
      now,
    });

    expect(points.map((p) => p.count)).toEqual([0, 0, 1]);
  });

  it("събира няколко събития в един ден", () => {
    const points = bucketByDay(
      [
        new Date("2026-08-15T08:00:00Z"),
        new Date("2026-08-15T12:00:00Z"),
        new Date("2026-08-15T20:00:00Z"),
      ],
      { days: 2, now },
    );

    expect(points).toEqual([
      { day: "2026-08-15", count: 3 },
      { day: "2026-08-16", count: 0 },
    ]);
  });

  it("изхвърля датите извън прозореца, вместо да ги залепи за първия ден", () => {
    // Заявката към базата взима с резерв, точната граница е ТУК.
    const points = bucketByDay(
      [new Date("2026-08-01T10:00:00Z"), new Date("2026-08-16T10:00:00Z")],
      { days: 3, now },
    );

    expect(points.reduce((sum, p) => sum + p.count, 0)).toBe(1);
  });

  it("не брои бъдещи дати в последния ден", () => {
    const points = bucketByDay([new Date("2026-08-20T10:00:00Z")], {
      days: 3,
      now,
    });

    expect(points.every((p) => p.count === 0)).toBe(true);
  });

  it("реже деня по берлинско време, не по UTC — лятно време", () => {
    // 16 август, 22:30 UTC = 17 август, 00:30 в Берлин (CEST, UTC+2).
    const points = bucketByDay([new Date("2026-08-16T22:30:00Z")], {
      days: 2,
      now: new Date("2026-08-17T10:00:00Z"),
    });

    expect(points).toEqual([
      { day: "2026-08-16", count: 0 },
      { day: "2026-08-17", count: 1 },
    ]);
  });

  it("реже деня по берлинско време — и зимно време", () => {
    // 15 януари, 23:30 UTC = 16 януари, 00:30 в Берлин (CET, UTC+1).
    const points = bucketByDay([new Date("2026-01-15T23:30:00Z")], {
      days: 2,
      now: new Date("2026-01-16T10:00:00Z"),
    });

    expect(points).toEqual([
      { day: "2026-01-15", count: 0 },
      { day: "2026-01-16", count: 1 },
    ]);
  });

  it("работи и през преминаването към зимно време", () => {
    // Часовникът се връща в нощта на 25 октомври 2026. Дните пак са
    // 24 на брой и нито един не изчезва, нито се дублира.
    const points = bucketByDay([], {
      days: 5,
      now: new Date("2026-10-27T10:00:00Z"),
    });

    expect(points.map((p) => p.day)).toEqual([
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
    ]);
  });

  it("не зависи от часовата зона на машината", () => {
    // Подава се изрично друга зона: същият момент попада в различен ден.
    const points = bucketByDay([new Date("2026-08-16T22:30:00Z")], {
      days: 2,
      now: new Date("2026-08-17T10:00:00Z"),
      timeZone: "UTC",
    });

    expect(points).toEqual([
      { day: "2026-08-16", count: 1 },
      { day: "2026-08-17", count: 0 },
    ]);
  });
});

describe("trendWindowStart", () => {
  it("взима с резерв назад, за да не отреже първия ден", () => {
    const now = new Date("2026-08-16T10:00:00Z");
    const start = trendWindowStart(7, now);

    // Първият ден в прозореца е 10 август; границата трябва да е ПРЕДИ
    // неговото начало по берлинско време (9 август, 22:00 UTC).
    expect(start.getTime()).toBeLessThan(
      new Date("2026-08-09T22:00:00Z").getTime(),
    );
    // Но не абсурдно назад — иначе заявката чете излишни редове.
    expect(start.getTime()).toBeGreaterThan(
      new Date("2026-08-08T00:00:00Z").getTime(),
    );
  });
});

describe("parseTrendWindow", () => {
  it("приема позволените прозорци", () => {
    expect(parseTrendWindow("30")).toBe(30);
    expect(parseTrendWindow("90")).toBe(90);
    expect(parseTrendWindow(90)).toBe(90);
  });

  it("пада към 30 дни при всичко останало", () => {
    // Адресът се пише на ръка и се препраща — нито един от тези случаи
    // не бива да стига до заявка към базата.
    for (const value of [
      undefined,
      null,
      "",
      "31",
      "0",
      "-90",
      "100000",
      "abc",
      "90; DROP TABLE",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      // Повторен параметър („?dni=90&dni=90") стига дотук като масив, а
      // `Number(["90"])` е 90 — затова типът се проверява пръв.
      ["90"],
      {},
    ]) {
      expect(parseTrendWindow(value)).toBe(DEFAULT_TREND_WINDOW);
    }
  });
});

describe("BERLIN", () => {
  it("е зоната на института, не на сървъра", () => {
    expect(BERLIN).toBe("Europe/Berlin");
  });
});
