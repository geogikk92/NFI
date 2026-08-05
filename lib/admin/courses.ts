import "server-only";

// АДМИН · курсовете — четене за формата и ПИСАНЕ в базата.
//
// Отделен модул от lib/admin/queries.ts: там е четенето за списъците, тук
// е промяната. Разликата не е подредба, а режим — всяка функция отдолу
// минава през `db.$transaction` заедно със записа в AuditLog, така че
// промяна без следа не може да се получи (виж главата на lib/admin/audit.ts).
//
// Не се пипа от публичния сайт: lib/cms/courses.ts чете само публикуваните
// и не знае за този файл.

import { db } from "@/lib/db";
import {
  type AuditMeta,
  type AuditTx,
  recordChange,
} from "@/lib/admin/audit";
import { collect } from "@/lib/admin/form";
import {
  oneOf,
  optionalText,
  parseDateStart,
  parseOptionalMoneyToCents,
  parseOptionalWholeNumber,
  parseWholeNumber,
  requiredText,
} from "@/lib/admin/input";
import { COURSE_LIMITS } from "@/lib/admin/limits";
import { slugProblem } from "@/lib/admin/slug";
import { assertCoverMediaExists } from "@/lib/admin/media";
import {
  COURSE_FORMATS,
  COURSE_LEVELS,
  type CourseFormat,
  type CourseLevel,
} from "@/lib/admin/queries";

export interface CourseInput {
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  level: CourseLevel;
  format: CourseFormat;
  summary: string | null;
  summaryDe: string | null;
  summaryEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  priceCents: number | null;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  maxParticipants: number | null;
  startsAt: Date | null;
  sortOrder: number;
  published: boolean;
  coverMediaId: string | null;
}

/**
 * Изборът на корица от `<select>` — празно значи „без снимка".
 *
 * Тук се проверява само ФОРМАТЪТ (id от cuid — латиница и цифри):
 * съществуването се проверява в транзакцията на записа
 * (assertCoverMediaExists), защото между отварянето на формата и
 * „Запази" файлът може да е изтрит.
 */
export function parseCoverMediaId(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = String(raw ?? "").trim();
  if (value === "") return { ok: true, value: null };

  if (!/^[a-z0-9]{10,40}$/i.test(value)) {
    return { ok: false, error: "Корицата не е валиден избор от списъка." };
  }

  return { ok: true, value };
}

/**
 * Формата → проверена стойност или грешки по полета.
 *
 * Всички полета се проверяват наведнъж (виж `collect`), а не до първата
 * грешка: човек, който поправя по една грешка на изпращане, се отказва.
 */
export function parseCourseForm(
  data: FormData,
):
  | { ok: true; value: CourseInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const slugRaw = String(data.get("slug") ?? "").trim();
  const slugIssue = slugProblem(slugRaw);

  return collect({
    slug: slugIssue
      ? ({ ok: false, error: slugIssue } as const)
      : ({ ok: true, value: slugRaw } as const),

    title: requiredText(data.get("title"), {
      min: 2,
      max: COURSE_LIMITS.title,
      label: "Заглавие (български)",
    }),
    titleDe: optionalText(
      data.get("titleDe"),
      COURSE_LIMITS.title,
      "Заглавие (немски)",
    ),
    titleEn: optionalText(
      data.get("titleEn"),
      COURSE_LIMITS.title,
      "Заглавие (английски)",
    ),

    level: oneOf(data.get("level"), COURSE_LEVELS, "Ниво"),
    format: oneOf(data.get("format"), COURSE_FORMATS, "Формат"),

    summary: optionalText(
      data.get("summary"),
      COURSE_LIMITS.summary,
      "Кратко описание (български)",
    ),
    summaryDe: optionalText(
      data.get("summaryDe"),
      COURSE_LIMITS.summary,
      "Кратко описание (немски)",
    ),
    summaryEn: optionalText(
      data.get("summaryEn"),
      COURSE_LIMITS.summary,
      "Кратко описание (английски)",
    ),

    description: optionalText(
      data.get("description"),
      COURSE_LIMITS.description,
      "Описание (български)",
    ),
    descriptionDe: optionalText(
      data.get("descriptionDe"),
      COURSE_LIMITS.description,
      "Описание (немски)",
    ),
    descriptionEn: optionalText(
      data.get("descriptionEn"),
      COURSE_LIMITS.description,
      "Описание (английски)",
    ),

    // Празната цена е „по договаряне", а не нула — колоната е nullable
    // точно затова.
    priceCents: parseOptionalMoneyToCents(data.get("price"), "Цена"),

    durationWeeks: parseOptionalWholeNumber(data.get("durationWeeks"), {
      min: 1,
      max: COURSE_LIMITS.durationWeeks,
      label: "Продължителност",
    }),
    hoursPerWeek: parseOptionalWholeNumber(data.get("hoursPerWeek"), {
      min: 1,
      max: COURSE_LIMITS.hoursPerWeek,
      label: "Часа седмично",
    }),
    maxParticipants: parseOptionalWholeNumber(data.get("maxParticipants"), {
      min: 1,
      max: COURSE_LIMITS.maxParticipants,
      label: "Максимум курсисти",
    }),

    startsAt: parseDateStart(data.get("startsAt"), "Начало"),

    sortOrder: parseWholeNumber(data.get("sortOrder") || "0", {
      min: -COURSE_LIMITS.sortOrder,
      max: COURSE_LIMITS.sortOrder,
      label: "Подредба",
    }),

    // Отметката липсва във FormData, когато не е отметната — затова
    // проверката е за наличие, не за стойност.
    published: { ok: true, value: data.get("published") !== null } as const,

    coverMediaId: parseCoverMediaId(data.get("coverMediaId")),
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Какво влиза в следата
// ─────────────────────────────────────────────────────────────────────────

/**
 * Полетата, които одитната следа проследява.
 *
 * Изброени изрично, а не `select: undefined` (тоест всичко): добави ли се
 * утре голямо поле в схемата, то не бива да се копира в дневника при всяка
 * промяна на подредбата.
 */
const AUDITED = {
  id: true,
  slug: true,
  title: true,
  titleDe: true,
  titleEn: true,
  level: true,
  format: true,
  summary: true,
  summaryDe: true,
  summaryEn: true,
  description: true,
  descriptionDe: true,
  descriptionEn: true,
  priceCents: true,
  currency: true,
  durationWeeks: true,
  hoursPerWeek: true,
  maxParticipants: true,
  startsAt: true,
  published: true,
  publishedAt: true,
  sortOrder: true,
  coverMediaId: true,
} as const;

/** Курсът, както го чете формата за редакция. Огледало на `AUDITED`. */
export interface AdminCourseDetail {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  level: CourseLevel;
  format: CourseFormat;
  summary: string | null;
  summaryDe: string | null;
  summaryEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  priceCents: number | null;
  currency: string;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  maxParticipants: number | null;
  startsAt: Date | null;
  published: boolean;
  publishedAt: Date | null;
  sortOrder: number;
  coverMediaId: string | null;
}

/** Целият курс за формата за редакция. `null`, когато го няма. */
export async function getCourseForEdit(
  id: string,
): Promise<AdminCourseDetail | null> {
  return db.course.findUnique({
    where: { id },
    select: AUDITED,
  }) as Promise<AdminCourseDetail | null>;
}

// ─────────────────────────────────────────────────────────────────────────
//  Писане
// ─────────────────────────────────────────────────────────────────────────

/**
 * Кога курсът получава дата на публикуване.
 *
 * Слага се при ПЪРВОТО публикуване и не се пипа повече. Датата отговаря на
 * въпроса „откога го има", а не „кога последно е бил включен" — курс,
 * скрит за седмица заради поправка, не е нов курс.
 */
function publishedAtFor(
  published: boolean,
  current: Date | null,
): Date | null {
  if (!published) return current;
  return current ?? new Date();
}

export async function createCourse(
  input: CourseInput,
  meta: AuditMeta,
): Promise<{ id: string; slug: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    await assertCoverMediaExists(tx, input.coverMediaId);

    const course = await tx.course.create({
      data: {
        ...input,
        publishedAt: publishedAtFor(input.published, null),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "course.create",
      entity: "Course",
      entityId: course.id,
      // При създаване се пази ЦЯЛАТА снимка: „разлика" спрямо нищо няма
      // смисъл, а пълният запис показва с какво е тръгнал курсът.
      after: course,
    });

    return { id: course.id, slug: course.slug };
  });
}

/** Хвърля се, когато редът е изчезнал между отварянето и записа. */
export class CourseGone extends Error {
  constructor() {
    super("Курсът вече не съществува.");
    this.name = "CourseGone";
  }
}

export async function updateCourse(
  id: string,
  input: CourseInput,
  meta: AuditMeta,
): Promise<{ id: string; slug: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const before = await tx.course.findUnique({
      where: { id },
      select: AUDITED,
    });

    if (!before) throw new CourseGone();

    await assertCoverMediaExists(tx, input.coverMediaId);

    const after = await tx.course.update({
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
      action: "course.update",
      entity: "Course",
      entityId: id,
      before,
      after,
    });

    return { id, slug: after.slug };
  });
}

/**
 * Само превключване на публикуването — от списъка, без отваряне на формата.
 *
 * Отделно действие, а не `updateCourse` с една сменена стойност: то не
 * иска валидни останали полета. Курс с недовършено немско описание пак
 * трябва да може да се СКРИЕ веднага.
 */
export async function setCoursePublished(
  id: string,
  published: boolean,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.course.findUnique({
      where: { id },
      select: { id: true, published: true, publishedAt: true },
    });

    if (!before) throw new CourseGone();

    const after = await tx.course.update({
      where: { id },
      data: {
        published,
        publishedAt: publishedAtFor(published, before.publishedAt),
      },
      select: { id: true, published: true, publishedAt: true },
    });

    await recordChange(tx, meta, {
      action: published ? "course.publish" : "course.unpublish",
      entity: "Course",
      entityId: id,
      before,
      after,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Изтриване
// ─────────────────────────────────────────────────────────────────────────

export interface CourseUsage {
  certificates: number;
  callRequests: number;
  reviews: number;
}

export function isCourseDeletable(usage: CourseUsage): boolean {
  return (
    usage.certificates === 0 &&
    usage.callRequests === 0 &&
    usage.reviews === 0
  );
}

/**
 * Обяснение защо бутонът е заключен, или `null`, когато не е.
 *
 * Съществува, за да няма неактивен бутон без причина: неактивен бутон без
 * обяснение е по-лош от липсващ.
 */
export function courseDeleteBlocker(usage: CourseUsage): string | null {
  const reasons: string[] = [];

  if (usage.certificates > 0) {
    reasons.push(`${usage.certificates} издадени сертификата`);
  }
  if (usage.callRequests > 0) {
    reasons.push(`${usage.callRequests} заявки за обаждане`);
  }
  if (usage.reviews > 0) {
    reasons.push(`${usage.reviews} рецензии`);
  }

  if (reasons.length === 0) return null;

  return (
    `Курсът не може да се изтрие: към него има ${reasons.join(", ")}. ` +
    "Скрий го от сайта вместо това — историята остава вярна."
  );
}

export async function getCourseUsage(id: string): Promise<CourseUsage | null> {
  const row = await db.course.findUnique({
    where: { id },
    select: {
      _count: { select: { certificates: true, callRequests: true, reviews: true } },
    },
  });

  return row ? row._count : null;
}

/** Хвърля се при опит за изтриване на курс, към който има нещо. */
export class CourseInUse extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourseInUse";
  }
}

/**
 * Изтрива курс, към който НЕ сочи нищо.
 *
 * Проверката е вътре в транзакцията, а не преди нея. Причината е, че само
 * сертификатите са защитени от самата база (`onDelete: Restrict`);
 * заявките за обаждане и рецензиите са `SetNull`, тоест изтриването би
 * минало и би отвързало мълчаливо чужди редове — заявка за обаждане, която
 * вече не помни за кой курс е.
 *
 * Остатъчен риск: заявка за обаждане, създадена точно между проверката и
 * изтриването в рамките на транзакцията, ще бъде отвързана. При един
 * администратор и ниво на изолация „read committed" това е теоретично; по-
 * силната изолация не си струва за действие, което се прави веднъж на
 * няколко месеца.
 */
export async function deleteCourse(id: string, meta: AuditMeta): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.course.findUnique({
      where: { id },
      select: {
        ...AUDITED,
        _count: {
          select: { certificates: true, callRequests: true, reviews: true },
        },
      },
    });

    if (!before) throw new CourseGone();

    const blocker = courseDeleteBlocker(before._count);
    if (blocker) throw new CourseInUse(blocker);

    const { _count, ...snapshot } = before;
    void _count;

    await tx.course.delete({ where: { id } });

    await recordChange(tx, meta, {
      action: "course.delete",
      entity: "Course",
      entityId: id,
      // Цялата снимка: това е единственото, което остава от реда.
      before: snapshot,
    });
  });
}
