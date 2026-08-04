import "server-only";

// АДМИН · задача 17e — абонатите на бюлетина.
//
// ─────────────────────────────────────────────────────────────────────────
//  ЗАЩО НЯМА „ДОБАВИ АБОНАТ"
// ─────────────────────────────────────────────────────────────────────────
// Абонатите се записват САМИ, с двойно потвърждение. Бутон „добави" би
// позволил в списъка да влезе човек, който никога не е искал — точно
// това, което ConsentLog съществува да направи невъзможно. Липсата на
// такъв бутон не е пропуск, а част от доказателството.
//
// Затова екранът има само три действия: справка, ръчно отписване (когато
// човек се обади вместо да кликне) и изтриване по искане за заличаване.

import { db } from "@/lib/db";
import { type AuditMeta, type AuditTx, recordChange } from "@/lib/admin/audit";
import type { SubscriberStatus } from "@/lib/admin/queries";
import { SUBSCRIBER_STATUSES } from "@/lib/admin/queries";

/** Непозната стойност в адреса се подминава като „без филтър". */
export function parseSubscriberStatus(
  raw: string | undefined,
): SubscriberStatus | null {
  if (!raw) return null;
  return SUBSCRIBER_STATUSES.includes(raw as SubscriberStatus)
    ? (raw as SubscriberStatus)
    : null;
}

export const SUBSCRIBER_LIMIT = 200;

export interface AdminSubscriber {
  id: string;
  email: string;
  name: string | null;
  status: SubscriberStatus;
  locale: string;
  consentTextVersion: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
}

export async function listSubscribers(options: {
  status?: SubscriberStatus | null;
  search?: string;
} = {}): Promise<AdminSubscriber[]> {
  const search = options.search?.trim().toLowerCase();

  return db.newsletterSubscriber.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      // Търсенето е по ЧАСТ от имейла: тя помни „нещо с mария" и това
      // трябва да стига. `mode: insensitive` — иначе главна буква в
      // домейна не намира нищо.
      ...(search
        ? { email: { contains: search, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: SUBSCRIBER_LIMIT,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      locale: true,
      consentTextVersion: true,
      createdAt: true,
      confirmedAt: true,
      unsubscribedAt: true,
    },
  }) as Promise<AdminSubscriber[]>;
}

export async function countSubscribersByStatus(): Promise<
  Record<SubscriberStatus, number>
> {
  const rows = await db.newsletterSubscriber.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    SUBSCRIBER_STATUSES.map((status) => [status, 0]),
  ) as Record<SubscriberStatus, number>;

  for (const row of rows) {
    counts[row.status as SubscriberStatus] = row._count._all;
  }

  return counts;
}

export interface AdminSubscriberDetail extends AdminSubscriber {
  ip: string | null;
  /** Записите в ConsentLog — истинското доказателство по чл. 7 GDPR. */
  consents: {
    id: string;
    textVersion: string;
    granted: boolean;
    requestedAt: Date;
    confirmedAt: Date | null;
    revokedAt: Date | null;
  }[];
}

export async function getSubscriber(
  id: string,
): Promise<AdminSubscriberDetail | null> {
  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      locale: true,
      consentTextVersion: true,
      createdAt: true,
      confirmedAt: true,
      unsubscribedAt: true,
      ip: true,
    },
  });
  if (!subscriber) return null;

  // ConsentLog няма чужд ключ към абоната — свързва се по имейл, защото
  // съгласието преживява изтриването на абонамента.
  const consents = await db.consentLog.findMany({
    where: { email: subscriber.email, type: "NEWSLETTER" },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      textVersion: true,
      granted: true,
      requestedAt: true,
      confirmedAt: true,
      revokedAt: true,
    },
  });

  return { ...subscriber, consents } as AdminSubscriberDetail;
}

export class SubscriberGone extends Error {
  constructor() {
    super("Абонатът вече не съществува.");
    this.name = "SubscriberGone";
  }
}

const AUDITED = {
  id: true,
  email: true,
  status: true,
  confirmedAt: true,
  unsubscribedAt: true,
  consentTextVersion: true,
} as const;

/**
 * Ръчно отписване — когато човек се обади или пише вместо да кликне.
 *
 * Пази СЪЩОТО състояние като отписването с един клик, за да няма два
 * различни начина да си „отписан". Токенът за потвърждение се ротира:
 * стар линк от старо писмо не бива да го върне в списъка.
 */
export async function unsubscribeManually(
  id: string,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.newsletterSubscriber.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new SubscriberGone();

    const now = new Date();

    const after = await tx.newsletterSubscriber.update({
      where: { id },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: now,
        confirmToken: crypto.randomUUID(),
      },
      select: AUDITED,
    });

    // ОТТЕГЛЯНЕТО СЕ ПИШЕ И В ДНЕВНИКА ЗА СЪГЛАСИЕ — точно както прави
    // публичното отписване с един клик (lib/cms/newsletter-db.ts).
    //
    // Без този ред двата пътя се разминават по най-лошия начин: писмата
    // спират, но дневникът продължава да твърди „съгласието е в сила".
    // Тогава екранът „Доказателство за съгласие" показва активно
    // съгласие за човек, който го е оттеглил по телефона, а в профила си
    // той вижда същото. Първата версия на този файл го пропусна и
    // одитът на 04.08.2026 го хвана.
    await tx.consentLog.updateMany({
      where: { email: before.email, type: "NEWSLETTER", revokedAt: null },
      data: { revokedAt: now },
    });

    await recordChange(tx, meta, {
      action: "subscriber.unsubscribe",
      entity: "NewsletterSubscriber",
      entityId: id,
      before,
      after,
    });
  });
}

/**
 * Заличаване по чл. 17 GDPR: редът изчезва напълно.
 *
 * ВНИМАНИЕ: това НЕ трие ConsentLog — там е доказателството, че сме имали
 * право да пишем, и то се пази за срока на давността. Изтрива се
 * абонаментът, не следата, че е съществувал.
 */
export async function deleteSubscriber(
  id: string,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.newsletterSubscriber.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new SubscriberGone();

    await tx.newsletterSubscriber.delete({ where: { id } });

    await recordChange(tx, meta, {
      action: "subscriber.delete",
      entity: "NewsletterSubscriber",
      entityId: id,
      before,
    });
  });
}

export type { SubscriberStatus };
