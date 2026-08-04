import "server-only";

// АДМИН · задача 17e — рецензиите.
//
// Устроен като lib/admin/materials.ts: collect() върху всички полета,
// $transaction + AuditLog за всяка промяна.
//
// ─────────────────────────────────────────────────────────────────────────
//  ОТКЪДЕ ИДВАТ РЕЦЕНЗИИТЕ
// ─────────────────────────────────────────────────────────────────────────
// На сайта НЯМА форма за оставяне на отзив и това е нарочно: отзивите
// идват по имейл, във Facebook групата или на живо след курса. Василена
// ги въвежда тук — със съгласието на човека и с неговото име, както той
// е пожелал да се изпише.
//
// Затова екранът е пълен CRUD, а не модерация на чужд вход.
//
// ВНИМАНИЕ: публикуваната рецензия ВЛИЗА В СРЕДНАТА ОЦЕНКА на курсовата
// страница (lib/cms/courses.ts) и оттам в структурираните данни за Google.
// Тоест това не е просто текст — това е публично твърдение за оценка.

import { db } from "@/lib/db";
import { type AuditMeta, type AuditTx, recordChange } from "@/lib/admin/audit";
import { collect } from "@/lib/admin/form";
import {
  oneOf,
  optionalText,
  parseWholeNumber,
  requiredText,
} from "@/lib/admin/input";
import { LOCALES } from "@/lib/i18n/config";

const LIMITS = {
  authorName: 80,
  body: 2000,
  courseId: 40,
} as const;

/** Оценката е по цели звезди — половинки нито се въвеждат, нито се рисуват. */
export const MIN_RATING = 1;
export const MAX_RATING = 5;

export interface ReviewInput {
  authorName: string;
  rating: number;
  body: string;
  locale: string;
  courseId: string | null;
  published: boolean;
}

export function parseReviewForm(
  data: FormData,
):
  | { ok: true; value: ReviewInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const courseRaw = String(data.get("courseId") ?? "").trim();

  return collect({
    authorName: requiredText(data.get("authorName"), {
      min: 2,
      max: LIMITS.authorName,
      label: "Име на автора",
    }),

    rating: parseWholeNumber(data.get("rating"), {
      min: MIN_RATING,
      max: MAX_RATING,
      label: "Оценка",
    }),

    body: requiredText(data.get("body"), {
      min: 10,
      max: LIMITS.body,
      label: "Текст на отзива",
    }),

    locale: oneOf(data.get("locale"), LOCALES, "Език"),

    // Празното значи „общ отзив за института", не грешка: не всеки отзив
    // е за конкретен курс.
    courseId:
      courseRaw === ""
        ? ({ ok: true, value: null } as const)
        : optionalText(courseRaw, LIMITS.courseId, "Курс"),

    published: { ok: true, value: data.get("published") !== null } as const,
  });
}

// ─────────────────────────────────────────────────────────────────────────

const AUDITED = {
  id: true,
  authorName: true,
  rating: true,
  body: true,
  locale: true,
  courseId: true,
  published: true,
  publishedAt: true,
} as const;

export class ReviewGone extends Error {
  constructor() {
    super("Отзивът вече не съществува.");
    this.name = "ReviewGone";
  }
}

export interface AdminReviewRow {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  locale: string;
  published: boolean;
  createdAt: Date;
  courseTitle: string | null;
}

export async function listReviewsForAdmin(options: {
  published?: boolean;
} = {}): Promise<AdminReviewRow[]> {
  const rows = await db.review.findMany({
    where:
      options.published === undefined ? {} : { published: options.published },
    // Най-новите първо: току-що въведеният отзив трябва да е най-отгоре.
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorName: true,
      rating: true,
      body: true,
      locale: true,
      published: true,
      createdAt: true,
      course: { select: { title: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    authorName: row.authorName,
    rating: row.rating,
    body: row.body,
    locale: row.locale,
    published: row.published,
    createdAt: row.createdAt,
    courseTitle: row.course?.title ?? null,
  }));
}

/** Брой публикувани и общо — за реда под заглавието. */
export async function countReviews(): Promise<{
  total: number;
  published: number;
}> {
  const [total, published] = await Promise.all([
    db.review.count(),
    db.review.count({ where: { published: true } }),
  ]);
  return { total, published };
}

export interface AdminReviewDetail {
  id: string;
  authorName: string;
  rating: number;
  body: string;
  locale: string;
  courseId: string | null;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

export async function getReviewForEdit(
  id: string,
): Promise<AdminReviewDetail | null> {
  return db.review.findUnique({
    where: { id },
    select: { ...AUDITED, createdAt: true },
  }) as Promise<AdminReviewDetail | null>;
}

function publishedAtFor(published: boolean, current: Date | null): Date | null {
  if (!published) return current;
  return current ?? new Date();
}

/**
 * Съществува ли курсът.
 *
 * Без тази проверка изтрит междувременно курс стига до базата и вдига
 * нарушение на чуждия ключ — админът вижда „опитай пак след малко",
 * съвет с гарантирано същия резултат.
 */
export async function courseExists(id: string): Promise<boolean> {
  return (await db.course.count({ where: { id } })) > 0;
}

export async function createReview(
  input: ReviewInput,
  meta: AuditMeta,
): Promise<{ id: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const review = await tx.review.create({
      data: { ...input, publishedAt: publishedAtFor(input.published, null) },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "review.create",
      entity: "Review",
      entityId: review.id,
      after: review,
    });

    return { id: review.id };
  });
}

export async function updateReview(
  id: string,
  input: ReviewInput,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.review.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new ReviewGone();

    const after = await tx.review.update({
      where: { id },
      data: {
        ...input,
        publishedAt: publishedAtFor(
          input.published,
          before.publishedAt as Date | null,
        ),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "review.update",
      entity: "Review",
      entityId: id,
      before,
      after,
    });
  });
}

export async function setReviewPublished(
  id: string,
  published: boolean,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.review.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new ReviewGone();

    const after = await tx.review.update({
      where: { id },
      data: {
        published,
        publishedAt: publishedAtFor(
          published,
          before.publishedAt as Date | null,
        ),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: published ? "review.publish" : "review.unpublish",
      entity: "Review",
      entityId: id,
      before,
      after,
    });
  });
}

export async function deleteReview(id: string, meta: AuditMeta): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.review.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new ReviewGone();

    await tx.review.delete({ where: { id } });

    await recordChange(tx, meta, {
      action: "review.delete",
      entity: "Review",
      entityId: id,
      before,
    });
  });
}

/** Курсовете за падащото меню — И скритите: отзив за минал курс е валиден. */
export async function courseOptionsForReviews(): Promise<
  { id: string; title: string }[]
> {
  return db.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true },
  });
}

