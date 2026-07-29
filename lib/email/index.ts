// ДОГОВОРКА, не реализация.
//
// Собственик: ЖОРО (задачи E1 и 23m — ~12 шаблона + доставимост).
// Боби я ползва от ден 1 за: потвърждение на бюлетина, безплатните
// материали, сертификатите, заявките за обаждане.
//
// Реализацията ще е Resend + React Email.

/**
 * Всеки шаблон се именува ТУК. Боби добавя своите редове сам —
 * това е единственото място в чужда територия, където може да пише
 * без ревю, защото е просто разширяване на съюз от низове.
 */
export type EmailTemplate =
  // ── съдържание (Боби) ──
  | "newsletter-confirm"
  | "newsletter-welcome"
  | "material-download"
  | "call-request-received"
  | "call-request-admin"
  | "level-test-result"
  | "certificate-issued"
  // ── търговия (Жоро) ──
  | "order-confirmation"
  | "order-paid"
  | "order-invoice"
  | "order-refunded"
  | "digital-download-ready"
  | "shipping-dispatched"
  | "translation-received"
  | "translation-quote"
  | "translation-ready"
  // ── профил ──
  | "auth-verify-email"
  | "auth-magic-link"
  | "auth-password-reset";

export interface EmailAttachment {
  filename: string;
  content: Uint8Array | Buffer;
  contentType: string;
}

export interface SendMailOptions {
  to: string | string[];
  template: EmailTemplate;
  /** Данните за шаблона. Всеки шаблон валидира своите с zod. */
  data: Record<string, unknown>;
  /** "de" | "bg". Определя езика на шаблона. */
  locale?: string;
  subject?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  /**
   * Ключ за идемпотентност. Подавай Order.id или WebhookEvent.id —
   * повторен webhook не бива да праща второ писмо на клиента.
   */
  idempotencyKey?: string;
  /** RFC 8058 One-Click отписване. Задължително за бюлетина. */
  unsubscribeUrl?: string;
}

export interface SendMailResult {
  id: string;
  /** false, когато писмото е било пропуснато заради idempotencyKey. */
  sent: boolean;
}

/**
 * Изпраща транзакционен имейл.
 *
 * Не хвърля при мрежова грешка на доставчика — връща sent: false и
 * логва. Провалено писмо не бива да отменя платена поръчка.
 */
export async function sendMail(
  options: SendMailOptions,
): Promise<SendMailResult> {
  return notImplemented("sendMail", options);
}

/** Рендира шаблона в HTML, без да го праща — за преглед в админа. */
export async function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
  locale: string = "de",
): Promise<{ subject: string; html: string; text: string }> {
  return notImplemented("renderTemplate", { template, data, locale });
}

// ─────────────────────────────────────────────────────────────────────────

function notImplemented(fn: string, args: unknown): never {
  if (process.env.NODE_ENV === "production") {
    throw new Error(`lib/email.${fn}() още не е реализирана.`);
  }
  const detail = JSON.stringify(args, (key, value) =>
    key === "content" ? "<binary>" : value,
  );
  throw new Error(
    `lib/email.${fn}() е още mock (собственик: Жоро, задачи E1/23m). Извикана с ${detail}`,
  );
}
