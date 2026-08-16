import "server-only";

// АДМИН · заявките за обаждане — работният екран на института.
//
// ─────────────────────────────────────────────────────────────────────────
//  ТОЗИ ЕКРАН НЕ СЪЗДАВА И НЕ ТРИЕ
// ─────────────────────────────────────────────────────────────────────────
// Заявките идват отвън — от страница на курс, от „Контакти" и от теста за
// ниво (lib/cms/call-requests-db.ts). Тук те само се придвижват. Няма
// „нова заявка": заявка, измислена от админа, няма човек, който да чака
// обаждане, а точно това число се гледа накрая на месеца.
//
// Няма и изтриване. Сгрешена или ботска заявка се маркира „Спам" и остава
// да се вижда — списъкът на екрана нарочно НЕ крие спама, защото истинска
// заявка, сложена там по погрешка, иначе изчезва безследно.
//
// ─────────────────────────────────────────────────────────────────────────
//  ЕДНА КОЛОНА, ДВАМА ПИШЕЩИ — ВНИМАВАЙ С `handledNote`
// ─────────────────────────────────────────────────────────────────────────
// В `handledNote` пише и honeypot защитата при създаването:
// „Автоматично маркирана: <причина>". Тоест бележката на администратора
// дели колона със следата от автоматичната проверка.
//
// Не ги разделям в две колони, защото това иска миграция заради нещо, което
// се решава с надпис: формата ПОКАЗВА заварената бележка и казва откъде е
// дошла, а старата стойност остава в одитния дневник (recordChange пази
// before/after). Тоест презаписването е видимо и обратимо.

import { db } from "@/lib/db";
import { type AuditMeta, type AuditTx, recordChange } from "@/lib/admin/audit";
import { collect } from "@/lib/admin/form";
import { oneOf, optionalText } from "@/lib/admin/input";
import {
  CALL_REQUEST_STATUSES,
  type CallRequestSource,
  type CallRequestStatus,
} from "@/lib/admin/queries";

/** Горна граница на бележката — колоната е Text, ограничението е за човека. */
export const MAX_NOTE_LENGTH = 2000;

/** Началото, което honeypot защитата слага пред автоматичните бележки. */
export const AUTO_NOTE_PREFIX = "Автоматично маркирана:";

/** Автоматична ли е заварената бележка, или я е писал човек. */
export function isAutomaticNote(note: string | null): boolean {
  return note !== null && note.startsWith(AUTO_NOTE_PREFIX);
}

export interface CallRequestUpdate {
  status: CallRequestStatus;
  handledNote: string | null;
}

export function parseCallRequestForm(
  data: FormData,
):
  | { ok: true; value: CallRequestUpdate }
  | { ok: false; fieldErrors: Record<string, string> } {
  return collect({
    status: oneOf(data.get("status"), CALL_REQUEST_STATUSES, "Състояние"),
    handledNote: optionalText(
      data.get("handledNote"),
      MAX_NOTE_LENGTH,
      "Бележка",
    ),
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Четене
// ─────────────────────────────────────────────────────────────────────────

export interface AdminCallRequestDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  source: CallRequestSource;
  status: CallRequestStatus;
  preferredTime: string | null;
  handledAt: Date | null;
  handledNote: string | null;
  /**
   * Следата от подаването. Схемата ги пази нарочно, „за да можем да
   * разпознаем ботовете със задна дата" (prisma/schema/content.prisma) —
   * а решението „спам или не" се взима точно на този екран. Показват се
   * само тук, на страница зад `requireAdmin`, и никога в списъка.
   */
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  course: { slug: string; title: string } | null;
}

export async function getCallRequestForEdit(
  id: string,
): Promise<AdminCallRequestDetail | null> {
  const row = await db.callRequest.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      message: true,
      source: true,
      status: true,
      preferredTime: true,
      handledAt: true,
      handledNote: true,
      ip: true,
      userAgent: true,
      createdAt: true,
      course: { select: { slug: true, title: true } },
    },
  });

  return row as AdminCallRequestDetail | null;
}

// ─────────────────────────────────────────────────────────────────────────
//  Писане
// ─────────────────────────────────────────────────────────────────────────

export class CallRequestGone extends Error {
  constructor() {
    super("Заявката вече не съществува.");
    this.name = "CallRequestGone";
  }
}

/**
 * Одитираните полета. `name` влиза, за да се чете редът в дневника:
 * „Иван Петров: Нова → Потърсен" вместо голо cuid, което не значи нищо.
 * Заявката няма човешки номер, какъвто има преводът.
 */
const AUDITED = {
  id: true,
  name: true,
  status: true,
  handledAt: true,
  handledNote: true,
} as const;

/**
 * Кога заявката е „пипната" за пръв път.
 *
 * Слага се при първото излизане от „Нова" и ПОВЕЧЕ НЕ СЕ ПИПА — по същото
 * правило, по което `deliveredAt` при преводите се записва веднъж.
 *
 * Върне ли някой състоянието обратно на „Нова" (поправка на грешка с едно
 * натискане), часът остава. Изтриването му би било по-лошото от двете:
 * то унищожава единствения запис кога всъщност е започнала работата, а
 * пълната история и без това е в дневника.
 */
function nextHandledAt(
  before: { status: CallRequestStatus; handledAt: Date | null },
  next: CallRequestStatus,
): Date | null {
  if (before.handledAt !== null) return before.handledAt;
  return next === "NEW" ? null : new Date();
}

/** Записва решението по заявката: състояние и бележка. */
export async function updateCallRequest(
  id: string,
  input: CallRequestUpdate,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.callRequest.findUnique({
      where: { id },
      select: AUDITED,
    });

    if (!before) throw new CallRequestGone();

    const after = await tx.callRequest.update({
      where: { id },
      data: {
        status: input.status,
        handledNote: input.handledNote,
        handledAt: nextHandledAt(before, input.status),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "callRequest.update",
      entity: "CallRequest",
      entityId: id,
      before,
      after,
    });
  });
}

/**
 * Смяна САМО на състоянието — за бързото действие от списъка.
 *
 * Отделна функция, а не `updateCallRequest` с празна бележка: вторият
 * вариант би ИЗТРИЛ записаното от колегата („звъннах, не вдига, пробвай
 * следобед") при едно натискане от списъка. Същият капан е описан в
 * lib/admin/translations.ts и се избягва по същия начин.
 */
export async function setCallRequestStatus(
  id: string,
  status: CallRequestStatus,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.callRequest.findUnique({
      where: { id },
      select: AUDITED,
    });

    if (!before) throw new CallRequestGone();

    const after = await tx.callRequest.update({
      where: { id },
      data: { status, handledAt: nextHandledAt(before, status) },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "callRequest.status",
      entity: "CallRequest",
      entityId: id,
      before,
      after,
    });
  });
}
