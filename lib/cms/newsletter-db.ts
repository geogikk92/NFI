// ТЕРИТОРИЯ НА БОБИ · задача 7 — бюлетин, достъп до базата.
//
// Отделен от newsletter.ts, защото ТОЗИ файл внася Prisma.
//
// Потокът: subscribe → PENDING + ConsentLog(requestedAt) → писмо с линк →
// confirm → CONFIRMED + ConsentLog(confirmedAt) → (по-късно) unsubscribe →
// UNSUBSCRIBED + ConsentLog(revokedAt). Всяка стъпка оставя следа, която
// при проверка отговаря на въпроса „кога и за какъв текст е дадено
// съгласието" — не на „има ли отметка в базата".

import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/email";
import {
  NEWSLETTER_CONSENT_TEXT,
  NEWSLETTER_CONSENT_VERSION,
  type ConfirmOutcome,
  type NewsletterInput,
  type UnsubscribeOutcome,
} from "./newsletter";

/** 32 байта ентропия — като DownloadGrant.token. */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

function consentTextHash(): string {
  return createHash("sha256").update(NEWSLETTER_CONSENT_TEXT).digest("hex");
}

export interface SubscribeResult {
  status: "pending" | "already-confirmed";
  /**
   * САМО извън продукция: линкът за потвърждение, когато имейлът още е
   * mock. Позволява целият double opt-in да се измине локално. В
   * продукция е null винаги — линкът пътува единствено по пощата.
   */
  devConfirmUrl: string | null;
}

export async function subscribeToNewsletter(
  input: NewsletterInput,
  meta: { ip: string | null; userAgent: string | null; appUrl: string },
): Promise<SubscribeResult> {
  const existing = await db.newsletterSubscriber.findUnique({
    where: { email: input.email },
    select: { id: true, status: true, confirmToken: true },
  });

  // Потвърденият не се връща в PENDING: повторното записване на познат
  // имейл е най-често самият човек, забравил, че вече е в списъка.
  if (existing?.status === "CONFIRMED") {
    return { status: "already-confirmed", devConfirmUrl: null };
  }

  const confirmToken = existing?.confirmToken ?? newToken();

  if (existing) {
    // PENDING/UNSUBSCRIBED → нов опит: опресняваме езика и съгласието.
    await db.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { status: "PENDING", locale: input.locale, ip: meta.ip },
    });
  } else {
    await db.newsletterSubscriber.create({
      data: {
        email: input.email,
        status: "PENDING",
        locale: input.locale,
        confirmToken,
        unsubscribeToken: newToken(),
        consentTextVersion: NEWSLETTER_CONSENT_VERSION,
        ip: meta.ip,
      },
      select: { id: true },
    });
  }

  // Заявката за съгласие се логва ОЩЕ ТУК (requestedAt), потвърждението
  // идва при клика. Така личи и колко заявки никога не са потвърдени.
  await db.consentLog.create({
    data: {
      email: input.email,
      type: "NEWSLETTER",
      textVersion: NEWSLETTER_CONSENT_VERSION,
      textHash: consentTextHash(),
      granted: false,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
    select: { id: true },
  });

  const confirmUrl = `${meta.appUrl}/${input.locale}/newsletter/${confirmToken}`;

  // Имейлът е на Жоро (задачи E1/23m) и локално е mock, който хвърля.
  // Провалът му НЕ проваля записа: абонатът е PENDING и чака.
  let emailSent = false;
  try {
    const sent = await sendMail({
      to: input.email,
      template: "newsletter-confirm",
      data: { confirmUrl },
      locale: input.locale,
    });
    emailSent = sent.sent;
  } catch {
    emailSent = false;
  }

  return {
    status: "pending",
    devConfirmUrl:
      !emailSent && process.env.NODE_ENV !== "production" ? confirmUrl : null,
  };
}

export async function confirmSubscription(
  token: string,
): Promise<ConfirmOutcome> {
  if (!token || token.length > 100) return "not-found";

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { confirmToken: token },
    select: { id: true, email: true, status: true },
  });

  if (!subscriber) return "not-found";
  if (subscriber.status === "CONFIRMED") return "already";

  const now = new Date();

  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { status: "CONFIRMED", confirmedAt: now },
  });

  // Потвърждението попълва последния PENDING ред за този имейл — НЕ
  // създава нов: така двойката requestedAt/confirmedAt стои на един ред
  // и доказва целия път на съгласието.
  const lastRequest = await db.consentLog.findFirst({
    where: { email: subscriber.email, type: "NEWSLETTER", confirmedAt: null },
    orderBy: { requestedAt: "desc" },
    select: { id: true },
  });

  if (lastRequest) {
    await db.consentLog.update({
      where: { id: lastRequest.id },
      data: { granted: true, confirmedAt: now },
    });
  }

  return "confirmed";
}

export async function unsubscribe(token: string): Promise<UnsubscribeOutcome> {
  if (!token || token.length > 100) return "not-found";

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { unsubscribeToken: token },
    select: { id: true, email: true, status: true },
  });

  if (!subscriber) return "not-found";
  if (subscriber.status === "UNSUBSCRIBED") return "already";

  const now = new Date();

  await db.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: now },
  });

  await db.consentLog.updateMany({
    where: { email: subscriber.email, type: "NEWSLETTER", revokedAt: null },
    data: { revokedAt: now },
  });

  return "unsubscribed";
}
