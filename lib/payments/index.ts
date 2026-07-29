// ДОГОВОРКА, не реализация.
//
// Собственик: ЖОРО (задачи M10, M10b — checkout, webhooks, рефанди).
// Боби я ползва от С9 за библиотеката и профила: достатъчно му е да
// пита "платено ли е" и да покаже статус.
//
// Реализацията ще е Mollie: карти, PayPal, Klarna, SEPA.
// НЕ Stripe — България не е поддържана merchant държава там.

import type { Cents } from "@/lib/money";

export type PaymentMethodKey =
  | "card"
  | "paypal"
  | "klarna"
  | "sepa"
  | "bancontact"
  | "ideal";

export type PaymentState =
  | "open"
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "canceled"
  | "expired";

export interface CreatePaymentInput {
  orderId: string;
  amountCents: Cents;
  currency?: string;
  description: string;
  /** Къде се връща клиентът след плащане. */
  redirectUrl: string;
  /** Къде Mollie праща webhook-а. */
  webhookUrl: string;
  method?: PaymentMethodKey;
  locale?: string;
  /** ISO 3166-1 alpha-2. Определя достъпните методи и ДДС третирането. */
  billingCountry: string;
  metadata?: Record<string, string>;
}

export interface PaymentHandle {
  /** Mollie id ("tr_..."). Записва се в Payment.molliePaymentId. */
  id: string;
  status: PaymentState;
  /** Тук се пренасочва клиентът. */
  checkoutUrl: string | null;
  amountCents: Cents;
  currency: string;
}

export interface RefundInput {
  paymentId: string;
  /** По-малко от сумата на плащането = частичен рефанд. */
  amountCents: Cents;
  description?: string;
}

export interface RefundHandle {
  id: string;
  status: "queued" | "pending" | "refunded" | "failed";
  amountCents: Cents;
}

/**
 * Резултатът от разчитането на webhook. Проверката на подписа е
 * ВЪТРЕ в тази функция — извикващият не бива да ѝ вярва без нея.
 */
export interface WebhookPayload {
  /** Идентификаторът за дедупликация → WebhookEvent.externalId. */
  externalId: string;
  eventType: string;
  paymentId: string | null;
  refundId: string | null;
  status: PaymentState | null;
  raw: unknown;
}

/** Създава плащане и връща линка към checkout. */
export async function createPayment(
  input: CreatePaymentInput,
): Promise<PaymentHandle> {
  return notImplemented("createPayment", input);
}

/**
 * Пита доставчика за текущия статус. Ползва се при връщане на клиента
 * от checkout — webhook-ът може още да не е дошъл.
 *
 * ВНИМАНИЕ: статусът от redirect-а НЕ е основание да се пусне поръчка.
 * Единственият източник на истина е webhook-ът.
 */
export async function getPayment(paymentId: string): Promise<PaymentHandle> {
  return notImplemented("getPayment", { paymentId });
}

export async function createRefund(input: RefundInput): Promise<RefundHandle> {
  return notImplemented("createRefund", input);
}

/**
 * Проверява подписа и разчита тялото на webhook-а.
 * Хвърля при невалиден подпис — не връща null, за да не се подмине.
 */
export async function parseWebhook(
  body: string,
  headers: Headers,
): Promise<WebhookPayload> {
  return notImplemented("parseWebhook", {
    bodyLength: body.length,
    signature: headers.get("x-mollie-signature") ? "present" : "missing",
  });
}

/** Методите, достъпни за тази сума и държава. */
export async function availableMethods(
  amountCents: Cents,
  billingCountry: string,
  locale?: string,
): Promise<PaymentMethodKey[]> {
  return notImplemented("availableMethods", {
    amountCents,
    billingCountry,
    locale,
  });
}

// ─────────────────────────────────────────────────────────────────────────

function notImplemented(fn: string, args: unknown): never {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`lib/payments.${fn}() още не е реализирана.`);
  }
  throw new Error(
    `lib/payments.${fn}() е още mock (собственик: Жоро, задача M10). Извикана с ${JSON.stringify(args)}`,
  );
}
