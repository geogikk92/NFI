"use client";

// АДМИН · диаграма на движението по дни.
//
// ЕДНА линия на диаграма, три диаграми една до друга. Не три серии на
// обща ос: числата са с различен порядък и по-малкото се залепя за
// нулата, а трите цвята на марката (червено, зелено, злато) са точно
// тримата, които се сливат при далтонизъм — измерено, не преценено
// (най-лошата двойка дава ΔE 5.2 при праг 8). С една линия цветът не
// носи смисъл изобщо: заглавието казва какво е нарисувано.
//
// Цветовете се ЧЕТАТ от токените, не се пишат тук. Тъмната тема на
// админа се включва с класа `.dark` върху обвивката (app/admin/layout.tsx,
// не върху <html>), затова сондата се вмъква ВЪТРЕ в контейнера — иначе
// би прочела светлата тема на документа и диаграмата ще свети в тъмен
// панел. Четенето е при монтиране: превключвател на тема в движение няма.

import { useEffect, useRef, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { TrendPoint } from "@/lib/admin/trend";
import { formatNumber } from "@/lib/intl";

// Само каквото се ползва: цялото `chart.js/auto` влачи всички видове
// диаграми в бъндъла на админа.
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
);

interface Colors {
  line: string;
  wash: string;
  grid: string;
  text: string;
  surface: string;
}

/**
 * „rgb(193, 31, 47)" → „rgba(193, 31, 47, 0.1)".
 *
 * Washът под линията е самият ѝ цвят при ~10% — не втори токен, за да не
 * се разминат двата при промяна на марката.
 */
function withAlpha(color: string, alpha: number): string {
  const match = color.match(/^rgba?\(([^)]+)\)$/);
  if (!match) return color;

  const [r, g, b] = match[1].split(",").map((part) => part.trim());
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Разрешава CSS променливите до истински цветове за платното. */
function readColors(host: HTMLElement): Colors {
  const probe = document.createElement("span");
  probe.style.display = "none";
  host.appendChild(probe);

  const read = (value: string) => {
    probe.style.color = value;
    return getComputedStyle(probe).color;
  };

  const line = read("var(--chart-1)");
  const colors: Colors = {
    line,
    wash: withAlpha(line, 0.1),
    grid: read("var(--border)"),
    text: read("var(--muted-foreground)"),
    surface: read("var(--card)"),
  };

  probe.remove();
  return colors;
}

/** „2026-08-16" → „16.08" за оста. */
function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

/** „2026-08-16" → „16 август" за подсказката. */
function longDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, date));
}

export function TrendChart({
  label,
  hint,
  points,
}: {
  label: string;
  hint: string;
  points: TrendPoint[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [colors, setColors] = useState<Colors | null>(null);

  useEffect(() => {
    if (hostRef.current) setColors(readColors(hostRef.current));
  }, []);

  const last = points.at(-1);
  const total = points.reduce((sum, point) => sum + point.count, 0);
  const peak = points.reduce((max, point) => Math.max(max, point.count), 0);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    // Табло, не витрина: анимацията само бави четенето на числото.
    animation: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      // Една серия — легендата само би повторила заглавието.
      legend: { display: false },
      tooltip: {
        backgroundColor: colors?.surface,
        titleColor: colors?.text,
        bodyColor: colors?.text,
        borderColor: colors?.grid,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          title: (items) => longDay(points[items[0].dataIndex].day),
          label: (item) => `${formatNumber(Number(item.raw), "bg")}`,
        },
      },
    },
    scales: {
      x: {
        // Мрежа само по едната ос: вертикалните линии при 30 дни правят
        // от диаграмата решетка.
        grid: { display: false },
        border: { color: colors?.grid },
        ticks: {
          color: colors?.text,
          font: { size: 11 },
          autoSkip: true,
          maxTicksLimit: 6,
          maxRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        // Въздух над върха: без него най-високият ден опира тавана на
        // платното и линията се реже наполовина.
        grace: "10%",
        border: { display: false },
        grid: { color: colors?.grid, drawTicks: false },
        ticks: {
          color: colors?.text,
          font: { size: 11 },
          // Броят събития е цяло число — „1,5 заявки" няма смисъл.
          precision: 0,
          maxTicksLimit: 4,
        },
      },
    },
  };

  return (
    <figure ref={hostRef} className="rounded-xl border border-border bg-card p-5">
      <figcaption>
        <h3 className="font-medium">{label}</h3>
        {/* Две реда място, дори когато текстът е един ред: иначе трите
            диаграми една до друга тръгват от различна височина и окото
            ги сравнява накриво. */}
        <p className="mt-1 min-h-8 text-xs text-muted-foreground">{hint}</p>
        {/* Числата, които иначе биха се четели САМО от подсказката.
            Стойността на последната точка стои тук, а не нарисувана върху
            платното: върху платното екранният четец не я вижда. */}
        <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="text-muted-foreground">Общо: </span>
            <span className="font-semibold">{formatNumber(total, "bg")}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Последен ден: </span>
            <span className="font-semibold">
              {formatNumber(last?.count ?? 0, "bg")}
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">Най-много за ден: </span>
            <span className="font-semibold">{formatNumber(peak, "bg")}</span>
          </span>
        </p>
      </figcaption>

      {/* Височината включва и лентата с датите — иначе картата получава
          собствено превъртане само заради оста. */}
      <div className="mt-4 h-52">
        {colors ? (
          <Line
            role="img"
            aria-label={`${label}: движение по дни. Общо ${total}, най-много за един ден ${peak}. Числата по дни са в таблицата под диаграмата.`}
            options={options}
            data={{
              labels: points.map((point) => shortDay(point.day)),
              datasets: [
                {
                  data: points.map((point) => point.count),
                  borderColor: colors.line,
                  borderWidth: 2,
                  borderJoinStyle: "round",
                  borderCapStyle: "round",
                  // Без изглаждане: кривата между два дни рисува стойности,
                  // които никога не е имало.
                  tension: 0,
                  fill: true,
                  backgroundColor: colors.wash,
                  // Точка се показва само на последния ден — числото на
                  // всяка точка е шум. Пръстенът е в цвета на картата, за
                  // да се чете, където пресича линията.
                  pointRadius: (context) =>
                    context.dataIndex === points.length - 1 ? 4 : 0,
                  pointHoverRadius: 4,
                  pointBackgroundColor: colors.line,
                  pointBorderColor: colors.surface,
                  pointBorderWidth: 2,
                  // Мишката не бива да улучва 8 пиксела.
                  pointHitRadius: 16,
                },
              ],
            }}
          />
        ) : null}
      </div>

      {/* Платното е невидимо за екранен четец, а подсказката не се стига с
          клавиатура. Таблицата е ПЪЛНИЯТ еквивалент — WCAG 1.1.1. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-muted-foreground underline-offset-2 hover:underline">
          Числата по дни
        </summary>

        <div
          className="mt-2 max-h-64 overflow-auto rounded-lg border border-border"
          tabIndex={0}
          role="region"
          aria-label={`${label} по дни, с брой`}
        >
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{label} по дни, с брой</caption>
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium">
                  Ден
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Брой
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.day} className="border-t border-border">
                  <th scope="row" className="px-4 py-1.5 text-left font-normal">
                    {longDay(point.day)}
                  </th>
                  <td className="px-4 py-1.5 text-right tabular-nums">
                    {formatNumber(point.count, "bg")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
