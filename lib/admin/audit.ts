import "server-only";

// АДМИН · основа — одитната следа на всяка промяна от панела.
//
// До днес lib/admin/queries.ts започваше с „Всичко тук е ЧЕТЕНЕ. Панелът
// още не пише". От този файл нататък пише — и всяко писане оставя следа.
//
// ─────────────────────────────────────────────────────────────────────────
//  ЗАЩО В ТРАНЗАКЦИЯ, А НЕ „след това"
// ─────────────────────────────────────────────────────────────────────────
// Записът в AuditLog върви В СЪЩАТА транзакция като самата промяна. Тоест
// провали ли се следата, промяната се отменя.
//
// Обратното — промяна първо, следа после в try/catch — изглежда по-кротко,
// но чупи точно това, за което следата съществува: остава промяна, за
// която никой не знае кой я е направил. За заявки за обаждане и за брояча
// на опитите такъв компромис е приемлив (виж lib/rate-limit-db.ts), защото
// там следата е удобство. Тук тя е отговорът на въпроса „кой смени цената
// на курса" — а на този въпрос „не знам" не е допустим отговор.
//
// Цената: при срив на базата насред записа админът вижда грешка и опитва
// пак. Това е правилната цена.

import { headers } from "next/headers";
import type { Prisma } from "@/app/generated/prisma/client";
import { clientIp } from "@/lib/request-ip";
import type { AdminUser } from "./guard";

/** Клиентът вътре в `db.$transaction(async (tx) => …)`. */
export type AuditTx = Prisma.TransactionClient;

/**
 * Кой, откъде. Събира се веднъж на заявка и се подава на всички записи.
 */
export interface AuditMeta {
  actorId: string;
  actorEmail: string;
  ip: string | null;
  userAgent: string | null;
}

/** Снимка на ред от базата — това, което влиза в `before`/`after`. */
export type Snapshot = Record<string, unknown>;

/**
 * Полета, които НИКОГА не влизат в следата, независимо кой модел ги носи.
 *
 * Днес нито един екран в админа не пипа такова поле. Списъкът е за утре:
 * добави ли някой редакция на потребител, `passwordHash` не бива да се
 * озове в таблица, която се чете за справка и се пази дълго. По-евтино е
 * да стои тук отсега, отколкото да се сети някой после.
 */
const REDACTED = new Set([
  "passwordHash",
  "password",
  "accessToken",
  "sessionToken",
  "token",
  "confirmToken",
  "unsubscribeToken",
  "verifyCode",
]);

const REDACTION = "«скрито»";

/**
 * Стойност → нещо, което Postgres приема в Json колона.
 *
 * Датите стават ISO низове, а Prisma.Decimal — низ. И двете иначе минават
 * през JSON.stringify като обект без съдържание („{}") и следата става
 * безполезна точно за полетата, заради които се чете: цена и дата.
 */
function toJsonValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) return value.toISOString();

  // Decimal (vatRate) и всичко останало със собствено toString. Проверява
  // се по наличие на метода, а не по instanceof: типът идва от runtime-а
  // на Prisma и импортирането му тук вкарва цял модул заради една проверка.
  if (
    typeof value === "object" &&
    value !== null &&
    "toFixed" in value &&
    typeof (value as { toFixed: unknown }).toFixed === "function"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) return value.map(toJsonValue);

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
        key,
        REDACTED.has(key) ? REDACTION : toJsonValue(inner),
      ]),
    );
  }

  return value;
}

/** Еднакви ли са две стойности след привеждането им към JSON. */
function sameValue(a: unknown, b: unknown): boolean {
  const left = toJsonValue(a);
  const right = toJsonValue(b);

  if (left === right) return true;

  // Обекти и масиви — сравняват се по съдържание. Ключовете идват от
  // Prisma select и са в един и същ ред за двете снимки.
  if (typeof left === "object" && typeof right === "object") {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  return false;
}

/**
 * Само ПРОМЕНЕНИТЕ полета, не целият ред два пъти.
 *
 * Разликата е между следа, която се чете („цената стана 129 € от 149 €"),
 * и следа, в която двайсет непроменени полета крият единственото важно.
 *
 * Връща `null`, когато нищо не се е променило — тогава изобщо няма какво
 * да се записва.
 */
export function diffFields(
  before: Snapshot,
  after: Snapshot,
): { before: Snapshot; after: Snapshot } | null {
  const changedBefore: Snapshot = {};
  const changedAfter: Snapshot = {};
  let changed = false;

  // Обединението на ключовете: поле, което го има само в едната снимка,
  // също е промяна.
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    // `updatedAt` се мени при ВСЯКА промяна и не носи информация — влезе
    // ли в следата, всеки запис изглежда като промяна дори когато нищо
    // друго не се е случило.
    if (key === "updatedAt") continue;

    if (sameValue(before[key], after[key])) continue;

    changed = true;
    changedBefore[key] = REDACTED.has(key)
      ? REDACTION
      : toJsonValue(before[key]);
    changedAfter[key] = REDACTED.has(key) ? REDACTION : toJsonValue(after[key]);
  }

  return changed ? { before: changedBefore, after: changedAfter } : null;
}

/**
 * Кой прави промяната и откъде.
 *
 * IP-то и браузърът се четат от главите на заявката, затова функцията
 * работи само вътре в server action или route handler.
 */
export async function auditMeta(actor: AdminUser): Promise<AuditMeta> {
  const store = await headers();

  return {
    actorId: actor.id,
    actorEmail: actor.email,
    ip: await clientIp(),
    userAgent: store.get("user-agent"),
  };
}

export interface AuditEntry {
  /** „course.create", „product.publish", „discount.delete". */
  action: string;
  /** Името на модела: „Course", „Product", „Discount". */
  entity: string;
  entityId: string;
  /** Липсва при създаване. */
  before?: Snapshot | null;
  /** Липсва при изтриване. */
  after?: Snapshot | null;
}

/**
 * Записва следата. Вика се ВЪТРЕ в транзакцията на самата промяна.
 *
 * При промяна (има и `before`, и `after`) се пазят само разликите. При
 * създаване и изтриване се пази цялата снимка — там „разлика" няма смисъл,
 * а пълният запис е единственото, което остава от изтрития ред.
 */
export async function recordChange(
  tx: AuditTx,
  meta: AuditMeta,
  entry: AuditEntry,
): Promise<void> {
  const { before, after } = entry;

  let storedBefore: unknown = null;
  let storedAfter: unknown = null;

  if (before && after) {
    const changes = diffFields(before, after);

    // Натиснат „Запази" без нито една промяна: няма какво да се запише.
    // Иначе дневникът се пълни с празни редове и истинските се губят.
    if (!changes) return;

    storedBefore = changes.before;
    storedAfter = changes.after;
  } else {
    storedBefore = before ? toJsonValue(before) : null;
    storedAfter = after ? toJsonValue(after) : null;
  }

  await tx.auditLog.create({
    data: {
      actorId: meta.actorId,
      // Дублира се като текст нарочно — виж коментара в base.prisma:
      // редът трябва да преживее изтриването на потребителя.
      actorEmail: meta.actorEmail,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: storedBefore as Prisma.InputJsonValue,
      after: storedAfter as Prisma.InputJsonValue,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
}
