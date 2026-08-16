import "server-only";

// АДМИН · задача 17f1 — четенето на одитния дневник.
//
// Дневникът се ПЪЛНИ от lib/admin/audit.ts (recordChange) при всяка промяна
// от панела. Досега никой не можеше да го прочете — а дневник, който не се
// чете, е само разход за диск.
//
// ─────────────────────────────────────────────────────────────────────────
//  САМО ЧЕТЕНЕ. Няма изтриване, няма редакция.
// ─────────────────────────────────────────────────────────────────────────
// Дневник, който може да се пипа от същия панел, чиито действия записва, не
// доказва нищо. Затова тук няма нито един update или delete — и не бива да
// се появява, колкото и да е изкушаващо „да се почисти".

import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { RATE_ACTIONS } from "@/lib/rate-limit-db";

export const AUDIT_LIMIT = 100;

/**
 * ТАБЛИЦАТА СЕ ПОЛЗВА ЗА ДВЕ НЕЩА. Тук се показва само едното.
 *
 * Освен следата от промените, AuditLog носи и броячите за ограничение по
 * IP (неуспешни входове, регистрации, тестове за ниво) — Жоро я преизползва
 * нарочно, защото base.prisma е замразен, а моделът вече има action, ip и
 * индекс по createdAt (виж lib/rate-limit-db.ts).
 *
 * За Василена тези редове са шум и то смазващ: в дев базата 178 от 183
 * записа са неуспешни опити за вход. Екранът обещава „всяка промяна от
 * този панел" — значи трябва да показва точно това, а не броячи.
 */
const TECHNICAL_ACTIONS: string[] = Object.values(RATE_ACTIONS);

/** Само истинските промени, без техническите броячи. */
const CHANGES_ONLY = { action: { notIn: TECHNICAL_ACTIONS } } as const;

/**
 * Видовете записи, с човешки имена.
 *
 * Ключът е `entity` от recordChange. Непознат вид (нов модел, за който
 * никой не е добавил ред тук) се показва с името си, вместо да изчезне —
 * тихо скрит запис е по-лош от грозен.
 */
export const ENTITY_LABELS: Record<string, string> = {
  Course: "Курс",
  Product: "Продукт",
  Discount: "Промоция",
  FreeMaterial: "Безплатен материал",
  Certificate: "Сертификат",
  Review: "Отзив",
  NewsletterSubscriber: "Абонат",
  ContentBlock: "Текст",
  TranslationRequest: "Заявка за превод",
  LevelTestResult: "Резултат от теста",
  User: "Потребител",
  Media: "Файл",
};

/**
 * Действията, с човешки глагол в минало време.
 *
 * Формата е „<модел>.<глагол>" и се пази в lib/admin/audit.ts. Тук се
 * превежда САМО глаголът — моделът вече го има в отделна колона, а
 * „Курс · курс.create" се чете два пъти.
 */
const VERB_LABELS: Record<string, string> = {
  create: "създаден",
  update: "променен",
  delete: "изтрит",
  publish: "публикуван",
  unpublish: "скрит",
  issue: "издаден",
  revoke: "отменен",
  restore: "възстановен",
  unsubscribe: "отписан",
  status: "смени състоянието",
};

export function actionLabel(action: string): string {
  // Първо цялото действие, после последната част. Действията са
  // „<модел>.<глагол>", но чужд код пише и тричастни („auth.login.failed") —
  // за тях само последната дума („failed") не значи нищо.
  const verb = action.split(".").pop() ?? action;
  return VERB_LABELS[action] ?? VERB_LABELS[verb] ?? action;
}

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

/** Видовете, които реално се срещат — за филтъра. Празният не се показва. */
export async function auditEntities(): Promise<
  { entity: string; count: number }[]
> {
  const rows = await db.auditLog.groupBy({
    by: ["entity"],
    where: CHANGES_ONLY,
    _count: { _all: true },
    orderBy: { _count: { entity: "desc" } },
  });

  return rows.map((row) => ({ entity: row.entity, count: row._count._all }));
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  actorEmail: string | null;
  ip: string | null;
  createdAt: Date;
  before: unknown;
  after: unknown;
}

export async function listAuditEntries(options: {
  entity?: string | null;
  actor?: string | null;
} = {}): Promise<AuditEntry[]> {
  const actor = options.actor?.trim().toLowerCase();

  return db.auditLog.findMany({
    where: {
      ...CHANGES_ONLY,
      ...(options.entity ? { entity: options.entity } : {}),
      ...(actor
        ? { actorEmail: { contains: actor, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: AUDIT_LIMIT,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      actorEmail: true,
      ip: true,
      createdAt: true,
      before: true,
      after: true,
    },
  }) as Promise<AuditEntry[]>;
}

// ─────────────────────────────────────────────────────────────────────────
//  Четимата разлика
// ─────────────────────────────────────────────────────────────────────────

/**
 * Полетата с човешки имена. Каквото го няма тук, се показва както е
 * записано — по-добре суров ключ, отколкото скрита промяна.
 */
const FIELD_LABELS: Record<string, string> = {
  title: "заглавие",
  titleDe: "заглавие (немски)",
  titleEn: "заглавие (английски)",
  slug: "адрес",
  description: "описание",
  summary: "кратко описание",
  priceCents: "цена",
  published: "показва се на сайта",
  publishedAt: "публикуван на",
  level: "ниво",
  format: "формат",
  sortOrder: "подредба",
  authorName: "име на автора",
  rating: "оценка",
  body: "текст",
  locale: "език",
  status: "състояние",
  holderName: "име в сертификата",
  revokedAt: "отменен на",
  revokeReason: "причина за отмяна",
  storageKey: "файл",
  externalId: "външен адрес",
  email: "имейл",
  bg: "текст (български)",
  de: "текст (немски)",
  en: "текст (английски)",
  hasDraft: "има чернова",
  confirmedAt: "потвърдено на",
  unsubscribedAt: "отписан на",
  stockQuantity: "наличност",
  code: "код",
  issuedAt: "издаден на",
  number: "номер",
  verifyCode: "код за проверка",
  name: "име",
  phone: "телефон",
  kind: "вид",
  currency: "валута",
  startsAt: "начало",
  durationWeeks: "седмици",
  maxParticipants: "места",
  hoursPerWeek: "часа седмично",
  summaryDe: "кратко описание (немски)",
  summaryEn: "кратко описание (английски)",
  descriptionDe: "описание (немски)",
  descriptionEn: "описание (английски)",
  titleBg: "заглавие (български)",
  active: "активна",
  validFrom: "важи от",
  validTo: "важи до",
  percentOff: "отстъпка в проценти",
  amountOffCents: "отстъпка",
  maxUses: "максимум използвания",
  usedCount: "използвана пъти",
  type: "вид",
  vatCategory: "ДДС категория",
  weightGrams: "тегло",
  coverColor: "цвят на корицата",
  requiresShipping: "изисква доставка",
  resultLevel: "получено ниво",
  score: "точки",
  ip: "IP адрес",
  // Медийната библиотека (17m-b). coverMediaId има ред тук, защото е
  // ИЗВАДЕН от INTERNAL_IDS — виж бележката там.
  coverMediaId: "корица",
  alt: "описание за екранен четец (български)",
  altDe: "описание за екранен четец (немски)",
  key: "ключ в хранилището",
  bucket: "хранилище",
  mimeType: "тип на файла",
  sizeBytes: "тегло (байтове)",
  width: "широчина",
  height: "височина",
  checksum: "контролна сума",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export interface AuditChange {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
}

/** Полетата, които държат пари в центове. */
const MONEY_FIELDS = new Set([
  "priceCents",
  "amountCents",
  "totalCents",
  "shippingCents",
  "discountCents",
  "minOrderCents",
]);

/** Стойност → нещо четимо от човек. */
function readable(value: unknown, field?: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "да" : "не";

  if (typeof value === "number") {
    // Парите се пазят в центове. „цена: 14900" под етикет „цена" е
    // стократна грешка на екрана, на който се проверява кой е сменил
    // цената — затова числото минава през същия формат като в магазина.
    if (field && MONEY_FIELDS.has(field)) return formatMoney(value);
    return String(value);
  }

  if (typeof value === "string") {
    // ISO дата → четим вид. Разпознава се по формата, не по име на поле:
    // така работи и за полета, които никой не е изброил.
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return new Intl.DateTimeFormat("bg-BG", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "Europe/Berlin",
        }).format(parsed);
      }
    }
    // Изброена стойност → българската ѝ дума.
    const known = VALUE_LABELS[value];
    if (known) return known;

    // Дълъг текст се отрязва: дневникът е за „какво се смени", не за
    // четене на цялото описание.
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  }

  return JSON.stringify(value);
}

/**
 * Полетата, които не носят смисъл за човек.
 *
 * `id` е в заглавието на реда, а `updatedAt` вече е изключен при записа
 * (виж diffFields в lib/admin/audit.ts).
 */
const HIDDEN_FIELDS = new Set(["id", "updatedAt", "createdAt"]);

/**
 * Вътрешните идентификатори се крият — но ИЗБРОЕНИ, не по окончание.
 *
 * „courseId: cmsd33x2b0002b0v4q7m9982b" не значи нищо за човек и изяжда
 * реда, на който трябва да се вижда какво се е сменило.
 *
 * ПЪРВАТА версия беше правило по окончание (`endsWith("Id")`) и глътна
 * `externalId` — адресът на видеото при безплатните материали, който човек
 * въвежда на ръка. Смяна само на него даваше запис „променен · Без
 * записани подробности", тоест дневникът отричаше промяна, която е в
 * базата. Точно обратното на предназначението му. (Одит, 04.08.2026.)
 */
// coverMediaId НЕ Е тук от 17m-b: закачането на корица е промяна, която
// човек прави нарочно от формата — скрита, дневникът би отричал промяна,
// която е в базата (същият дефект като с externalId по-горе). Стойността
// е id и не е красива, но „корица: … → …" поне казва КАКВО се е сменило.
const INTERNAL_IDS = new Set([
  "courseId",
  "userId",
  "callRequestId",
  "updatedById",
  "freeMaterialId",
  "uploadedById",
]);

function isInternalId(field: string): boolean {
  return INTERNAL_IDS.has(field);
}

/**
 * Стойности от изброен тип → на български.
 *
 * „CONFIRMED → UNSUBSCRIBED" е вярно, но не е български. Липсващият
 * превод се показва както е записан, вместо да се скрие.
 */
const VALUE_LABELS: Record<string, string> = {
  PENDING: "очаква потвърждение",
  CONFIRMED: "потвърден",
  UNSUBSCRIBED: "отписан",
  BOUNCED: "недоставим",
  NEW: "нова",
  CONTACTED: "потърсен",
  SCHEDULED: "насрочен",
  CLOSED: "приключена",
  SPAM: "спам",
  ONLINE: "онлайн",
  PRESENCE: "присъствено",
  HYBRID: "смесено",
  INDIVIDUAL: "индивидуално",
  DIGITAL: "дигитален",
  PHYSICAL: "физически",
};

/**
 * Разликата, готова за показване.
 *
 * При СЪЗДАВАНЕ и ИЗТРИВАНЕ recordChange пази цялата снимка, не разлика —
 * затова тук се показват попълнените полета, а не „нищо → нещо" за всяко.
 */
export function auditChanges(entry: AuditEntry): AuditChange[] {
  const before = (entry.before ?? {}) as Record<string, unknown>;
  const after = (entry.after ?? {}) as Record<string, unknown>;

  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);

  const changes: AuditChange[] = [];

  for (const field of fields) {
    if (HIDDEN_FIELDS.has(field) || isInternalId(field)) continue;

    const from = readable(before[field], field);
    const to = readable(after[field], field);

    // При създаване (само `after`) празните полета не се изброяват — иначе
    // всяко създаване е стена от „не е зададено".
    if (from === null && to === null) continue;

    changes.push({ field, label: fieldLabel(field), before: from, after: to });
  }

  return changes.sort((a, b) => a.label.localeCompare(b.label, "bg"));
}

/**
 * КОЙ запис е променен, с думи.
 *
 * Редът показваше само вид и глагол: „Курс · променен · от Василена".
 * При три курса това е гатанка. Снимката в before/after почти винаги носи
 * човешко име (заглавие, номер, имейл) — то е далеч по-полезно от
 * вътрешния ключ, затова се търси първо.
 */
const TITLE_FIELDS = [
  "title",
  "holderName",
  "authorName",
  "number",
  "email",
  "code",
  "slug",
  "key",
];

export function entryTitle(
  entry: AuditEntry,
  resolved?: Map<string, string>,
): string | null {
  // Първо истинското име от таблицата — то е вярно и днес, дори записът
  // да е преименуван след промяната.
  const fromDb = entry.entityId
    ? resolved?.get(`${entry.entity}:${entry.entityId}`)
    : undefined;
  if (fromDb) return fromDb.length > 60 ? `${fromDb.slice(0, 60)}…` : fromDb;

  const snapshot = {
    ...((entry.before ?? {}) as Record<string, unknown>),
    ...((entry.after ?? {}) as Record<string, unknown>),
  };

  for (const field of TITLE_FIELDS) {
    const value = snapshot[field];
    if (typeof value === "string" && value.trim()) {
      return value.length > 60 ? `${value.slice(0, 60)}…` : value;
    }
  }

  // При ПРОМЯНА снимката съдържа само сменените полета, тоест заглавие
  // може да няма. Тогава остава ключът — къс, само за разпознаване между
  // два реда, не за четене.
  return entry.entityId ? `…${entry.entityId.slice(-6)}` : null;
}

/**
 * Имената на променените записи, извлечени НАВЕДНЪЖ.
 *
 * При промяна снимката съдържа само сменените полета (виж diffFields),
 * тоест заглавие в нея почти никога няма — „Продукт променен …f9ei0a" не
 * казва кой продукт. Затова имената се четат от самите таблици.
 *
 * ЕДНА заявка на вид, по първичен ключ: най-много седем леки заявки на
 * страница вместо по една на ред. Липсващото (изтрит запис) остава без
 * име и пада към краткия ключ — това е нормално и честно.
 */
export async function resolveEntityTitles(
  entries: AuditEntry[],
): Promise<Map<string, string>> {
  const byEntity = new Map<string, string[]>();

  for (const entry of entries) {
    if (!entry.entityId) continue;
    const ids = byEntity.get(entry.entity) ?? [];
    ids.push(entry.entityId);
    byEntity.set(entry.entity, ids);
  }

  const titles = new Map<string, string>();

  /** Пълни картата с „<вид>:<id>" → име. */
  async function load(
    entity: string,
    query: (ids: string[]) => Promise<{ id: string; label: string | null }[]>,
  ) {
    const ids = byEntity.get(entity);
    if (!ids?.length) return;

    try {
      for (const row of await query([...new Set(ids)])) {
        if (row.label) titles.set(`${entity}:${row.id}`, row.label);
      }
    } catch (error) {
      // Името е УДОБСТВО. Падне ли заявката, редът пак се вижда — с
      // краткия ключ вместо с име.
      console.error(`[admin] Имената за ${entity} не се прочетоха:`, error);
    }
  }

  await Promise.all([
    load("Course", async (ids) =>
      (await db.course.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }))
        .map((r) => ({ id: r.id, label: r.title })),
    ),
    load("Product", async (ids) =>
      (await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }))
        .map((r) => ({ id: r.id, label: r.title })),
    ),
    load("FreeMaterial", async (ids) =>
      (await db.freeMaterial.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } }))
        .map((r) => ({ id: r.id, label: r.title })),
    ),
    load("Review", async (ids) =>
      (await db.review.findMany({ where: { id: { in: ids } }, select: { id: true, authorName: true } }))
        .map((r) => ({ id: r.id, label: r.authorName })),
    ),
    load("Certificate", async (ids) =>
      (await db.certificate.findMany({ where: { id: { in: ids } }, select: { id: true, number: true } }))
        .map((r) => ({ id: r.id, label: r.number })),
    ),
    load("NewsletterSubscriber", async (ids) =>
      (await db.newsletterSubscriber.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } }))
        .map((r) => ({ id: r.id, label: r.email })),
    ),
    load("Discount", async (ids) =>
      (await db.discount.findMany({ where: { id: { in: ids } }, select: { id: true, code: true } }))
        .map((r) => ({ id: r.id, label: r.code })),
    ),
    load("Media", async (ids) =>
      (await db.media.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, key: true } }))
        .map((r) => ({ id: r.id, label: r.title ?? r.key })),
    ),
  ]);

  return titles;
}

/** Създаване, промяна или изтриване — за иконата и за реда на четене. */
export function auditKind(entry: AuditEntry): "create" | "update" | "delete" {
  if (!entry.before) return "create";
  if (!entry.after) return "delete";
  return "update";
}
