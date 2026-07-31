import "server-only";

// АДМИН · заявките за превод на документи.
//
// ─────────────────────────────────────────────────────────────────────────
//  ТОЗИ ЕКРАН НЕ СЪЗДАВА НИЩО
// ─────────────────────────────────────────────────────────────────────────
// За разлика от курсовете, продуктите и промоциите, заявките ИДВАТ отвън —
// клиентът ги подава. Тук те се преглеждат, оценяват и придвижват. Няма
// „нова заявка" и не бива да има: заявка, създадена от админа, няма
// клиент, който да е дал съгласие за обработката на документите си.
//
// ─────────────────────────────────────────────────────────────────────────
//  ЛИЧНИ ДАННИ — ТОВА Е НАЙ-ЧУВСТВИТЕЛНИЯТ ЕКРАН В ПАНЕЛА
// ─────────────────────────────────────────────────────────────────────────
// Документите за превод са дипломи, актове за раждане, съдебни решения.
// Това са специални категории по смисъла на GDPR при част от случаите и
// при всички са данни, които човек не дава с лека ръка.
//
// Оттам следват три правила, спазени по-долу:
//   1. `purgeAfter` е ВИДИМ навсякъде — срокът за изтриване не е
//      подробност, а задължение (чл. 5, ал. 1, б. „д" GDPR);
//   2. съдържанието на документите НЕ се чете тук, а само описанието им
//      (име, размер, страници) — това е достатъчно за оферта;
//   3. всяка промяна оставя следа с ИМЕТО на администратора.

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
  parseDateEnd,
  parseOptionalMoneyToCents,
} from "@/lib/admin/input";
import { resolveVatRate } from "@/lib/legal";
import {
  TRANSLATION_STATUSES,
  type TranslationStatus,
} from "@/lib/admin/queries";

/**
 * ДДС ставката за превод.
 *
 * Смята се, а не се пита: заверен превод има човешки труд, значи НЕ е
 * електронна услуга и никога не минава през OSS — облага се по седалището
 * на доставчика, независимо къде е клиентът. Затова държавата отдолу не
 * влияе на резултата и е подадена само защото функцията я иска.
 *
 * Правилото е в lib/legal/index.ts и е единственият му източник — ставка,
 * преписана тук, би се разминала при първата промяна в закона.
 */
export function translationVatRate(): number {
  return resolveVatRate({
    category: "translation",
    countryCode: "DE",
    ossThresholdExceeded: true,
  });
}

export interface TranslationUpdate {
  status: TranslationStatus;
  quotedCents: number | null;
  quoteExpiresAt: Date | null;
  notes: string | null;
}

/** Статусите, при които офертата ТРЯБВА да е попълнена. */
const NEEDS_QUOTE: readonly TranslationStatus[] = [
  "QUOTED",
  "QUOTE_ACCEPTED",
  "QUOTE_DECLINED",
];

export function parseTranslationForm(
  data: FormData,
):
  | { ok: true; value: TranslationUpdate }
  | { ok: false; fieldErrors: Record<string, string> } {
  const collected = collect({
    status: oneOf(data.get("status"), TRANSLATION_STATUSES, "Състояние"),
    quotedCents: parseOptionalMoneyToCents(data.get("quoted"), "Оферта"),
    quoteExpiresAt: parseDateEnd(data.get("quoteExpiresAt"), "Офертата важи до"),
    notes: optionalText(data.get("notes"), 4000, "Бележки"),
  });

  if (!collected.ok) return collected;

  const value = collected.value;

  // Статус „изпратена оферта" без сума е лъжа пред клиента: страницата за
  // проследяване му казва, че има оферта, а сума няма.
  if (NEEDS_QUOTE.includes(value.status) && value.quotedCents === null) {
    return {
      ok: false,
      fieldErrors: {
        quotedCents:
          "Това състояние значи, че клиентът вече е видял оферта. Попълни " +
          "сумата или върни състоянието на „в преглед“.",
      },
    };
  }

  return { ok: true, value };
}

// ─────────────────────────────────────────────────────────────────────────
//  Четене
// ─────────────────────────────────────────────────────────────────────────

const AUDITED = {
  id: true,
  number: true,
  status: true,
  quotedCents: true,
  quotedVatRate: true,
  quotedAt: true,
  quoteExpiresAt: true,
  deliveredAt: true,
  purgeAfter: true,
  notes: true,
} as const;

export interface AdminTranslationDocument {
  id: string;
  /** true = качен от клиента; false = готовият превод. */
  isSource: boolean;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  pages: number | null;
  /** Кога файлът е изтрит от хранилището от cron-а за срокове. */
  purgedAt: Date | null;
  createdAt: Date;
}

export interface AdminTranslationDetail {
  id: string;
  number: string;
  email: string;
  name: string;
  phone: string | null;
  sourceLang: string;
  targetLang: string;
  certified: boolean;
  status: TranslationStatus;
  quotedCents: number | null;
  quotedVatRate: string | null;
  quotedAt: Date | null;
  quoteExpiresAt: Date | null;
  deliveredAt: Date | null;
  purgeAfter: Date | null;
  notes: string | null;
  createdAt: Date;
  documents: AdminTranslationDocument[];
}

export async function getTranslationForEdit(
  id: string,
): Promise<AdminTranslationDetail | null> {
  const row = await db.translationRequest.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      email: true,
      name: true,
      phone: true,
      sourceLang: true,
      targetLang: true,
      certified: true,
      status: true,
      quotedCents: true,
      quotedVatRate: true,
      quotedAt: true,
      quoteExpiresAt: true,
      deliveredAt: true,
      purgeAfter: true,
      notes: true,
      createdAt: true,
      documents: {
        // Първо качените от клиента, после готовите преводи; вътре по
        // време. Така редът на екрана следва реда на работата.
        orderBy: [{ isSource: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          isSource: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          pages: true,
          purgedAt: true,
          createdAt: true,
        },
      },
      // `accessToken` и `storageKey` НАРОЧНО липсват: токенът дава достъп
      // до заявката без вход, а ключът в хранилището — до самия документ.
      // Нито едното не се показва на екран, който може да бъде снимен.
    },
  });

  return row as AdminTranslationDetail | null;
}

// ─────────────────────────────────────────────────────────────────────────
//  Писане
// ─────────────────────────────────────────────────────────────────────────

export class TranslationGone extends Error {
  constructor() {
    super("Заявката вече не съществува.");
    this.name = "TranslationGone";
  }
}

/**
 * Записва прегледа: състояние, оферта, бележки.
 *
 * `quotedAt` се слага САМ, при първото попълване на сума — то е моментът,
 * от който тече валидността на офертата, и не бива да зависи от това дали
 * някой се е сетил да го въведе.
 *
 * `quotedVatRate` също се смята сам (виж translationVatRate) — ставка,
 * въведена на ръка, рано или късно се разминава със закона.
 */
export async function updateTranslation(
  id: string,
  input: TranslationUpdate,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.translationRequest.findUnique({
      where: { id },
      select: AUDITED,
    });

    if (!before) throw new TranslationGone();

    const quoteAppeared =
      input.quotedCents !== null && before.quotedCents === null;

    const after = await tx.translationRequest.update({
      where: { id },
      data: {
        status: input.status,
        quotedCents: input.quotedCents,
        quoteExpiresAt: input.quoteExpiresAt,
        notes: input.notes,
        quotedVatRate:
          input.quotedCents === null ? null : translationVatRate().toFixed(2),
        // Не се пипа при следваща редакция: моментът на офертата е един.
        quotedAt: quoteAppeared ? new Date() : before.quotedAt,
        // Доставена значи доставена — часът се записва веднъж.
        deliveredAt:
          input.status === "DELIVERED"
            ? (before.deliveredAt ?? new Date())
            : before.deliveredAt,
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "translation.update",
      entity: "TranslationRequest",
      entityId: id,
      before,
      after,
    });
  });
}

/**
 * Смяна САМО на състоянието — за бързото действие от списъка.
 *
 * Отделна функция, а не `updateTranslation` с празни останали полета: при
 * втория вариант заявка с вече изпратена оферта и записани бележки би ги
 * ЗАГУБИЛА при едно натискане от списъка. Точно това написах първо и го
 * хванах, преди да го пусна.
 */
export async function setTranslationStatus(
  id: string,
  status: TranslationStatus,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.translationRequest.findUnique({
      where: { id },
      select: { id: true, number: true, status: true, deliveredAt: true },
    });

    if (!before) throw new TranslationGone();

    const after = await tx.translationRequest.update({
      where: { id },
      data: {
        status,
        deliveredAt:
          status === "DELIVERED"
            ? (before.deliveredAt ?? new Date())
            : before.deliveredAt,
      },
      select: { id: true, number: true, status: true, deliveredAt: true },
    });

    await recordChange(tx, meta, {
      action: "translation.status",
      entity: "TranslationRequest",
      entityId: id,
      before,
      after,
    });
  });
}
