// АДМИН · задача 17a — заявките към базата за админ панела.
//
// Всичко тук е ЧЕТЕНЕ, плюс българските етикети на изброимите.
//
// Писането живее в отделен модул на всеки обект — lib/admin/courses.ts и
// нататък — защото всяка промяна минава през транзакция с одитна следа
// (lib/admin/audit.ts) и това е друг вид код. Етикетите обаче остават тук:
// списъкът и формата показват едни и същи думи, а два отделни списъка се
// разминават след първата промяна.
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

/** Възходящо по трудност — редът, в който ги мисли и преподавателят. */
export const COURSE_LEVELS: readonly CourseLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
];

export const COURSE_FORMATS: readonly CourseFormat[] = [
  "ONLINE",
  "PRESENCE",
  "HYBRID",
  "INDIVIDUAL",
];

export const COURSE_FORMAT_LABELS_BG: Record<CourseFormat, string> = {
  ONLINE: "Онлайн",
  PRESENCE: "Присъствено",
  HYBRID: "Хибридно",
  INDIVIDUAL: "Индивидуално",
};

// ── Продукти ─────────────────────────────────────────────────────────────

export type ProductType = "DIGITAL" | "PHYSICAL";

export type VatCategory =
  | "EDUCATION"
  | "ELECTRONIC"
  | "GOODS"
  | "TRANSLATION";

export type CoverColor = "INK" | "RED" | "GREEN" | "GOLD";

export const PRODUCT_TYPES: readonly ProductType[] = ["DIGITAL", "PHYSICAL"];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  DIGITAL: "Дигитален (за сваляне)",
  PHYSICAL: "Физически (за доставка)",
};

export const VAT_CATEGORIES: readonly VatCategory[] = [
  "EDUCATION",
  "ELECTRONIC",
  "GOODS",
  "TRANSLATION",
];

/**
 * ДДС категорията НЕ следва вида на продукта и точно това бърка всички.
 *
 * Онлайн курс на живо и записан видеокурс са и двата „дигитални", но само
 * вторият е електронна услуга и минава през OSS — тоест се облага по
 * държавата на КУПУВАЧА над прага от 10 000 €. Заверен превод има човешки
 * труд и никога не минава през OSS, колкото и голям да е оборотът.
 *
 * Затова етикетите обясняват, а не само назовават: сгрешена категория се
 * вижда чак пред счетоводителя. Правилата са в lib/legal/index.ts.
 */
export const VAT_CATEGORY_LABELS: Record<VatCategory, string> = {
  EDUCATION: "Обучение — курс с преподавател",
  ELECTRONIC: "Електронна услуга — PDF, видео, автоматично сваляне",
  GOODS: "Стока — нещо, което се изпраща",
  TRANSLATION: "Заверен превод",
};

export const VAT_CATEGORY_HINTS: Record<VatCategory, string> = {
  EDUCATION:
    "Присъствен или онлайн на живо. Облага се по седалището на NFI, не по държавата на курсиста.",
  ELECTRONIC:
    "Записано съдържание без човешка намеса при доставката. Минава през OSS над 10 000 € оборот — тогава ставката е на държавата на купувача.",
  GOODS:
    "Учебник, тетрадка, всичко с тегло. Също минава през OSS над прага.",
  TRANSLATION:
    "Има човешки труд, затова НЕ е електронна услуга и никога не минава през OSS.",
};

// ── Промоции ─────────────────────────────────────────────────────────────

export type DiscountKind = "PERCENT" | "FIXED";

export const DISCOUNT_KINDS: readonly DiscountKind[] = ["PERCENT", "FIXED"];

export const DISCOUNT_KIND_LABELS: Record<DiscountKind, string> = {
  PERCENT: "Процент от поръчката",
  FIXED: "Фиксирана сума",
};

// ── Преводи ──────────────────────────────────────────────────────────────

export type TranslationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "QUOTED"
  | "QUOTE_ACCEPTED"
  | "QUOTE_DECLINED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

/** Редът е работният път на заявката, затова не е азбучен. */
export const TRANSLATION_STATUSES: readonly TranslationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "QUOTED",
  "QUOTE_ACCEPTED",
  "QUOTE_DECLINED",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

export const TRANSLATION_STATUS_LABELS: Record<TranslationStatus, string> = {
  SUBMITTED: "Получена",
  UNDER_REVIEW: "В преглед",
  QUOTED: "Изпратена оферта",
  QUOTE_ACCEPTED: "Офертата е приета",
  QUOTE_DECLINED: "Офертата е отказана",
  IN_PROGRESS: "В превод",
  READY: "Готова",
  DELIVERED: "Предадена",
  CANCELLED: "Отказана",
};

/** Кои състояния значат, че заявката още чака някого от нас. */
export const TRANSLATION_OPEN_STATUSES: readonly TranslationStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "QUOTE_ACCEPTED",
  "IN_PROGRESS",
  "READY",
];

export const COVER_COLORS: readonly CoverColor[] = [
  "INK",
  "RED",
  "GREEN",
  "GOLD",
];

export const COVER_COLOR_LABELS: Record<CoverColor, string> = {
  INK: "Мастилено синьо",
  RED: "Червено",
  GREEN: "Зелено",
  GOLD: "Златисто",
};

/**
 * Готови списъци за падащите менюта.
 *
 * Извеждат се от изброимите отгоре, а не се преписват: втори ръчен списък
 * се разминава с първия при първото добавено ниво и тогава формата просто
 * не показва новото — без грешка и без следа.
 */
export const COURSE_LEVEL_OPTIONS = COURSE_LEVELS.map((level) => ({
  value: level,
  // Нивото Е етикетът си: „A1" не се превежда и всеки преподавател го чете.
  label: level,
}));

export const COURSE_FORMAT_OPTIONS = COURSE_FORMATS.map((format) => ({
  value: format,
  label: COURSE_FORMAT_LABELS_BG[format],
}));

export const PRODUCT_TYPE_OPTIONS = PRODUCT_TYPES.map((type) => ({
  value: type,
  label: PRODUCT_TYPE_LABELS[type],
}));

export const VAT_CATEGORY_OPTIONS = VAT_CATEGORIES.map((category) => ({
  value: category,
  label: VAT_CATEGORY_LABELS[category],
}));

export const COVER_COLOR_OPTIONS = COVER_COLORS.map((color) => ({
  value: color,
  label: COVER_COLOR_LABELS[color],
}));

export const DISCOUNT_KIND_OPTIONS = DISCOUNT_KINDS.map((kind) => ({
  value: kind,
  label: DISCOUNT_KIND_LABELS[kind],
}));

export const TRANSLATION_STATUS_OPTIONS = TRANSLATION_STATUSES.map((status) => ({
  value: status,
  label: TRANSLATION_STATUS_LABELS[status],
}));

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
//  Продукти
// ─────────────────────────────────────────────────────────────────────────

export interface AdminProduct {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  type: ProductType;
  vatCategory: VatCategory;
  priceCents: number;
  currency: string;
  stock: number | null;
  published: boolean;
  publishedAt: Date | null;
  sortOrder: number;
}

/**
 * ВСИЧКИ продукти, включително непубликуваните — разликата с
 * lib/commerce/catalog.ts, който вижда само публикуваните.
 */
export async function listAdminProducts(): Promise<AdminProduct[]> {
  return db.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      titleDe: true,
      type: true,
      vatCategory: true,
      priceCents: true,
      currency: true,
      stock: true,
      published: true,
      publishedAt: true,
      sortOrder: true,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Промоции
// ─────────────────────────────────────────────────────────────────────────

export interface AdminDiscount {
  id: string;
  code: string;
  kind: DiscountKind;
  /** PERCENT: процент. FIXED: ЦЕНТОВЕ. Едно поле, две единици. */
  value: number;
  minOrderCents: number | null;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
}

export async function listAdminDiscounts(): Promise<AdminDiscount[]> {
  return db.discount.findMany({
    // Най-новите отгоре: промоцията е нещо, което се прави и следи сега.
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      kind: true,
      value: true,
      minOrderCents: true,
      maxRedemptions: true,
      redemptions: true,
      startsAt: true,
      endsAt: true,
      active: true,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Заявки за превод
// ─────────────────────────────────────────────────────────────────────────

export interface AdminTranslation {
  id: string;
  number: string;
  name: string;
  email: string;
  sourceLang: string;
  targetLang: string;
  certified: boolean;
  status: TranslationStatus;
  quotedCents: number | null;
  /** GDPR: след този момент документите се трият от cron-а за срокове. */
  purgeAfter: Date | null;
  createdAt: Date;
  documentCount: number;
}

/** Горна граница на един изглед — както при заявките за обаждане. */
export const TRANSLATION_LIMIT = 200;

export async function listTranslations(
  options: { status?: TranslationStatus | null } = {},
): Promise<AdminTranslation[]> {
  const rows = await db.translationRequest.findMany({
    where: options.status ? { status: options.status } : {},
    // Най-новите първо: заявката за превод е спешна за клиента.
    orderBy: { createdAt: "desc" },
    take: TRANSLATION_LIMIT,
    select: {
      id: true,
      number: true,
      name: true,
      email: true,
      sourceLang: true,
      targetLang: true,
      certified: true,
      status: true,
      quotedCents: true,
      purgeAfter: true,
      createdAt: true,
      _count: { select: { documents: true } },
    },
  });

  return rows.map(({ _count, ...row }) => ({
    ...row,
    documentCount: _count.documents,
  })) as AdminTranslation[];
}

/** Броевете за филтъра. Един groupBy вместо девет count заявки. */
export async function countTranslationsByStatus(): Promise<
  Record<TranslationStatus, number>
> {
  const rows = await db.translationRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    TRANSLATION_STATUSES.map((status) => [status, 0]),
  ) as Record<TranslationStatus, number>;

  for (const row of rows) {
    counts[row.status as TranslationStatus] = row._count._all;
  }

  return counts;
}

export function parseTranslationStatus(
  value: unknown,
): TranslationStatus | null {
  return typeof value === "string" &&
    Object.hasOwn(TRANSLATION_STATUS_LABELS, value)
    ? (value as TranslationStatus)
    : null;
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
