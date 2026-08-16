// ТЕРИТОРИЯ НА БОБИ · задача 4 — курсове.
// Писано от Жоро, докато Боби е в отпуск.

import { cache } from "react";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";

export type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type CourseFormat = "ONLINE" | "PRESENCE" | "HYBRID" | "INDIVIDUAL";

export const COURSE_LEVELS: readonly CourseLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

/**
 * Нивата, които институтът РЕАЛНО предлага — за ПУБЛИЧНИЯ сайт.
 *
 * Василена работи до B2 и не води C1/C2 (потвърдено 15.08.2026, виж
 * docs/СЪДЪРЖАНИЕ-от-Василена.md). Дотогава филтърът показваше C1 и C2 с
 * нула резултата, а SEO описанието обещаваше „от A1 до C2" — тоест сайтът
 * рекламираше курсове, които никой не може да запише.
 *
 * Списъкът е ОТДЕЛЕН от COURSE_LEVELS нарочно: схемата и админът пазят
 * всичките шест нива, за да може курс за C1 да се създаде в деня, в който
 * тя реши да води такъв — без миграция и без промяна тук.
 */
export const OFFERED_LEVELS: readonly CourseLevel[] = ["A1", "A2", "B1", "B2"];

/**
 * Немските етикети на нивата.
 *
 * ОСНОВАТА, не единственият вариант: публичните страници ползват
 * levelLabel()/formatLabel() от lib/i18n/pages/courses.ts, за да следват
 * езика на посетителя. Тези тук остават за админа (той е на български за
 * съдържанието, но нивата се пишат еднакво) и за тестовете.
 */
export const LEVEL_LABELS: Record<CourseLevel, string> = {
  A1: "A1 · Anfänger",
  A2: "A2 · Grundlagen",
  B1: "B1 · Mittelstufe",
  B2: "B2 · Fortgeschritten",
  C1: "C1 · Kompetent",
  C2: "C2 · Muttersprachlich",
};

export const FORMAT_LABELS: Record<CourseFormat, string> = {
  ONLINE: "Online",
  PRESENCE: "Präsenz",
  HYBRID: "Hybrid",
  INDIVIDUAL: "Einzelunterricht",
};

// Многоезичните полета са НЕЗАДЪЛЖИТЕЛНИ нарочно: същият тип описва и
// редове от заявки другаде (напр. suggestCoursesForLevel в
// level-test-db.ts), които още не селектират *En колоните. pick() приема
// undefined и пада на немското заглавие, вместо да покаже нищо.
export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn?: string | null;
  summary: string | null;
  summaryDe: string | null;
  summaryEn?: string | null;
  level: CourseLevel;
  format: CourseFormat;
  priceCents: number | null;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  maxParticipants: number | null;
  startsAt: Date | null;
  coverMediaId: string | null;
}

export interface CourseReview {
  id: string;
  authorName: string;
  rating: number;
  body: string;
}

export interface CourseDetail extends CourseSummary {
  description: string | null;
  descriptionDe: string | null;
  descriptionEn?: string | null;
  reviewCount: number;
  averageRating: number | null;
  /** Публикуваните отзиви на езика на посетителя, най-новите първо. */
  reviews: CourseReview[];
}

const SUMMARY_FIELDS = {
  id: true,
  slug: true,
  title: true,
  titleDe: true,
  titleEn: true,
  summary: true,
  summaryDe: true,
  summaryEn: true,
  level: true,
  format: true,
  priceCents: true,
  durationWeeks: true,
  hoursPerWeek: true,
  maxParticipants: true,
  startsAt: true,
  coverMediaId: true,
} as const;

export interface CourseFilter {
  level?: CourseLevel | null;
  format?: CourseFormat | null;
  /** Таван на резултатите. Началната страница иска само три. */
  take?: number;
}

/** Валидира стойност от адреса. Непознатото се игнорира, не гърми. */
export function parseLevel(value: unknown): CourseLevel | null {
  return typeof value === "string" &&
    (COURSE_LEVELS as readonly string[]).includes(value)
    ? (value as CourseLevel)
    : null;
}

export function parseFormat(value: unknown): CourseFormat | null {
  // Object.hasOwn, НЕ `in`: операторът `in` обхожда и прототипната верига,
  // затова `?format=toString` минаваше за валиден формат и Prisma гърмеше
  // с 500 на публична страница.
  return typeof value === "string" && Object.hasOwn(FORMAT_LABELS, value)
    ? (value as CourseFormat)
    : null;
}

export async function listCourses(
  filter: CourseFilter = {},
): Promise<CourseSummary[]> {
  return db.course.findMany({
    where: {
      published: true,
      ...(filter.level ? { level: filter.level } : {}),
      ...(filter.format ? { format: filter.format } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { level: "asc" }],
    // Без таван началната страница теглеше ВСИЧКИ публикувани курсове, за
    // да покаже три.
    ...(filter.take ? { take: filter.take } : {}),
    select: SUMMARY_FIELDS,
  });
}

/**
 * Броячи за филтъра по ниво.
 *
 * Приема филтъра по ФОРМАТ, защото броевете стоят в чиповете точно над
 * резултатите: при `?format=ONLINE` „A1 (1)" до нула показани курса е
 * подвеждащо. Филтърът по ниво нарочно НЕ се прилага — иначе всяко друго
 * ниво би показвало нула.
 */
export async function countCoursesByLevel(
  filter: Pick<CourseFilter, "format"> = {},
): Promise<Record<CourseLevel, number>> {
  const rows = await db.course.groupBy({
    by: ["level"],
    where: {
      published: true,
      ...(filter.format ? { format: filter.format } : {}),
    },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    COURSE_LEVELS.map((level) => [level, 0]),
  ) as Record<CourseLevel, number>;

  for (const row of rows) {
    counts[row.level as CourseLevel] = row._count._all;
  }

  return counts;
}

/**
 * Обвито в React `cache()`: generateMetadata и самата страница викат тази
 * функция независимо, а Next мемоизира само `fetch()`, не и Prisma. Без
 * това всяко зареждане на детайла правеше две еднакви заявки.
 *
 * Рейтингът се смята в БАЗАТА с aggregate, не в паметта — иначе курс с
 * хиляда рецензии тегли хиляда реда, за да получи едно число.
 */
export const getCourseBySlug = cache(
  async (slug: string, locale?: Locale): Promise<CourseDetail | null> => {
    const course = await db.course.findFirst({
      where: { slug, published: true },
      select: {
        ...SUMMARY_FIELDS,
        description: true,
        descriptionDe: true,
        descriptionEn: true,
      },
    });

    if (!course) return null;

    const stats = await db.review.aggregate({
      where: { courseId: course.id, published: true },
      _count: { _all: true },
      _avg: { rating: true },
    });

    // САМИТЕ отзиви, не само средното. Дотук страницата казваше „4,8 от
    // 12 отзива", но не показваше нито един — число без думите зад него
    // не убеждава никого, а въведеният в админа текст не се виждаше
    // никъде на сайта.
    //
    // Само на ЕЗИКА на посетителя: български отзив под немско заглавие е
    // същата грешка като при редактируемите блокове (задача 18).
    // Без подаден език (generateMetadata) отзиви не се четат — там не
    // трябват и заявката е излишна.
    const reviews = locale
      ? await db.review.findMany({
          where: { courseId: course.id, published: true, locale },
          orderBy: { publishedAt: "desc" },
          take: 6,
          select: { id: true, authorName: true, rating: true, body: true },
        })
      : [];

    return {
      ...course,
      reviewCount: stats._count._all,
      averageRating: stats._avg.rating,
      reviews,
    };
  },
);

/** Останалите курсове от същото ниво — за края на детайлната страница. */
export async function listRelatedCourses(
  course: Pick<CourseSummary, "id" | "level">,
  limit = 3,
): Promise<CourseSummary[]> {
  return db.course.findMany({
    where: {
      published: true,
      id: { not: course.id },
      level: course.level,
    },
    take: limit,
    orderBy: { sortOrder: "asc" },
    select: SUMMARY_FIELDS,
  });
}
