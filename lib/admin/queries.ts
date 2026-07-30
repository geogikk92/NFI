// АДМИН · задача 17a — заявките към базата за админ панела.
//
// Всичко тук е ЧЕТЕНЕ. Панелът още не пише — статусите на заявките ще се
// сменят със server actions в следваща задача, за да има и одитна следа.
//
// Броевете се смятат в БАЗАТА (count/groupBy), не в паметта. Иначе таблото
// тегли всички заявки, за да покаже пет числа.
import "server-only";

import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────
//  Изброимите от Prisma, повторени като низови обединения
// ─────────────────────────────────────────────────────────────────────────
//
// Не се внасят от app/generated/prisma — така е и в lib/cms/courses.ts.
// Причината е една: генерираният клиент носи Prisma в графа на импортите,
// а тези типове трябва да се ползват и от страници, и от бъдещи филтри.

export type CallRequestStatus =
  | "NEW"
  | "CONTACTED"
  | "SCHEDULED"
  | "CLOSED"
  | "SPAM";

export type CallRequestSource = "COURSE_PAGE" | "CONTACT_PAGE" | "LEVEL_TEST";

export type SubscriberStatus =
  | "PENDING"
  | "CONFIRMED"
  | "UNSUBSCRIBED"
  | "BOUNCED";

export type CourseLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type CourseFormat = "ONLINE" | "PRESENCE" | "HYBRID" | "INDIVIDUAL";

// ─────────────────────────────────────────────────────────────────────────
//  Български етикети
// ─────────────────────────────────────────────────────────────────────────
//
// Стоят ТУК, а не в lib/i18n: админът нарочно е извън многоезичието и няма
// речник. На едно място са, защото таблото и списъците показват едни и същи
// статуси — при два отделни списъка те се разминават след първата промяна.
//
// Немските етикети за посетителя са в lib/cms/courses.ts и не се смесват с
// тези: там пише „Präsenz", тук „Присъствено".

/** Редът е работният път на заявката, затова не е азбучен. */
export const CALL_REQUEST_STATUSES: readonly CallRequestStatus[] = [
  "NEW",
  "CONTACTED",
  "SCHEDULED",
  "CLOSED",
  "SPAM",
];

export const CALL_REQUEST_STATUS_LABELS: Record<CallRequestStatus, string> = {
  NEW: "Нова",
  CONTACTED: "Потърсен",
  SCHEDULED: "Насрочено",
  CLOSED: "Затворена",
  SPAM: "Спам",
};

export const CALL_REQUEST_SOURCE_LABELS: Record<CallRequestSource, string> = {
  COURSE_PAGE: "Страница на курс",
  CONTACT_PAGE: "Страница „Контакти“",
  LEVEL_TEST: "Тест за ниво",
};

export const SUBSCRIBER_STATUSES: readonly SubscriberStatus[] = [
  "PENDING",
  "CONFIRMED",
  "UNSUBSCRIBED",
  "BOUNCED",
];

export const SUBSCRIBER_STATUS_LABELS: Record<SubscriberStatus, string> = {
  PENDING: "Очаква потвърждение",
  CONFIRMED: "Потвърден",
  UNSUBSCRIBED: "Отписан",
  BOUNCED: "Недоставим",
};

export const COURSE_FORMAT_LABELS_BG: Record<CourseFormat, string> = {
  ONLINE: "Онлайн",
  PRESENCE: "Присъствено",
  HYBRID: "Хибридно",
  INDIVIDUAL: "Индивидуално",
};

/**
 * Валидира статус от адреса.
 *
 * `Object.hasOwn`, не `in`: операторът `in` обхожда и прототипната верига,
 * заради което „?status=toString" минава за валиден и Prisma гърми с 500.
 * Същият капан беше поправен в lib/cms/courses.ts.
 */
export function parseCallRequestStatus(
  value: unknown,
): CallRequestStatus | null {
  return typeof value === "string" &&
    Object.hasOwn(CALL_REQUEST_STATUS_LABELS, value)
    ? (value as CallRequestStatus)
    : null;
}

// ─────────────────────────────────────────────────────────────────────────
//  Заявки за обаждане
// ─────────────────────────────────────────────────────────────────────────

export interface AdminCallRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: CallRequestSource;
  status: CallRequestStatus;
  preferredTime: string | null;
  createdAt: Date;
  handledAt: Date | null;
  /** Курсът, от чиято страница е дошла заявката. Липсва при общ контакт. */
  course: { slug: string; title: string } | null;
}

/**
 * Горна граница на един изглед. Без нея първият натоварен месец изтегля
 * всички заявки в паметта на сървъра. Странициране идва, когато числото
 * започне да опира — дотогава един екран е достатъчен.
 */
export const CALL_REQUEST_LIMIT = 200;

export async function listCallRequests(
  options: { status?: CallRequestStatus | null; limit?: number } = {},
): Promise<AdminCallRequest[]> {
  return db.callRequest.findMany({
    where: options.status ? { status: options.status } : {},
    // Най-новите първо: заявка за обаждане е спешна, старите са свършена
    // работа.
    orderBy: { createdAt: "desc" },
    take: options.limit ?? CALL_REQUEST_LIMIT,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      source: true,
      status: true,
      preferredTime: true,
      createdAt: true,
      handledAt: true,
      course: { select: { slug: true, title: true } },
    },
  });
}

/** Броевете за филтъра. Един groupBy вместо пет count заявки. */
export async function countCallRequestsByStatus(): Promise<
  Record<CallRequestStatus, number>
> {
  const rows = await db.callRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    CALL_REQUEST_STATUSES.map((status) => [status, 0]),
  ) as Record<CallRequestStatus, number>;

  for (const row of rows) {
    counts[row.status as CallRequestStatus] = row._count._all;
  }

  return counts;
}

// ─────────────────────────────────────────────────────────────────────────
//  Курсове
// ─────────────────────────────────────────────────────────────────────────

export interface AdminCourse {
  id: string;
  slug: string;
  /** Българското заглавие — колоната, която админът винаги попълва. */
  title: string;
  titleDe: string | null;
  level: CourseLevel;
  format: CourseFormat;
  priceCents: number | null;
  currency: string;
  published: boolean;
  publishedAt: Date | null;
  startsAt: Date | null;
  sortOrder: number;
}

/**
 * ВСИЧКИ курсове, включително непубликуваните — това е разликата с
 * lib/cms/courses.listCourses(), която нарочно вижда само публикуваните.
 * Черновата е половината работа в админа.
 */
export async function listAdminCourses(): Promise<AdminCourse[]> {
  return db.course.findMany({
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      titleDe: true,
      level: true,
      format: true,
      priceCents: true,
      currency: true,
      published: true,
      publishedAt: true,
      startsAt: true,
      sortOrder: true,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Табло
// ─────────────────────────────────────────────────────────────────────────

export interface AdminDashboardStats {
  callRequests: {
    total: number;
    byStatus: Record<CallRequestStatus, number>;
    /** Необработените — заради тях се отваря таблото. */
    open: number;
  };
  courses: { total: number; published: number };
  products: { total: number; published: number };
  levelTests: { total: number; last30Days: number };
  subscribers: {
    total: number;
    byStatus: Record<SubscriberStatus, number>;
  };
}

/** Прозорецът за „последните 30 дни" на таблото. */
const RECENT_WINDOW_DAYS = 30;

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const since = new Date(
    Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const [
    callRequestRows,
    coursesTotal,
    coursesPublished,
    productsTotal,
    productsPublished,
    levelTestsTotal,
    levelTestsRecent,
    subscriberRows,
  ] = await Promise.all([
    db.callRequest.groupBy({ by: ["status"], _count: { _all: true } }),
    db.course.count(),
    db.course.count({ where: { published: true } }),
    db.product.count(),
    db.product.count({ where: { published: true } }),
    db.levelTestResult.count(),
    db.levelTestResult.count({ where: { createdAt: { gte: since } } }),
    db.newsletterSubscriber.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const callRequestsByStatus = Object.fromEntries(
    CALL_REQUEST_STATUSES.map((status) => [status, 0]),
  ) as Record<CallRequestStatus, number>;

  for (const row of callRequestRows) {
    callRequestsByStatus[row.status as CallRequestStatus] = row._count._all;
  }

  const subscribersByStatus = Object.fromEntries(
    SUBSCRIBER_STATUSES.map((status) => [status, 0]),
  ) as Record<SubscriberStatus, number>;

  for (const row of subscriberRows) {
    subscribersByStatus[row.status as SubscriberStatus] = row._count._all;
  }

  const callRequestsTotal = CALL_REQUEST_STATUSES.reduce(
    (sum, status) => sum + callRequestsByStatus[status],
    0,
  );

  return {
    callRequests: {
      total: callRequestsTotal,
      byStatus: callRequestsByStatus,
      // Спамът НЕ влиза в „за обработване" — иначе един бот вдига числото
      // и то спира да значи нещо.
      open: callRequestsByStatus.NEW + callRequestsByStatus.CONTACTED,
    },
    courses: { total: coursesTotal, published: coursesPublished },
    products: { total: productsTotal, published: productsPublished },
    levelTests: { total: levelTestsTotal, last30Days: levelTestsRecent },
    subscribers: {
      total: SUBSCRIBER_STATUSES.reduce(
        (sum, status) => sum + subscribersByStatus[status],
        0,
      ),
      byStatus: subscribersByStatus,
    },
  };
}

/** Броят дни в прозореца — таблото го изписва в подсказката. */
export const DASHBOARD_RECENT_WINDOW_DAYS = RECENT_WINDOW_DAYS;
