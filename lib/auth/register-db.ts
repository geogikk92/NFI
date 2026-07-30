// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — записът в базата.
//
// Отделен от register.ts, защото ТОЗИ файл внася Prisma. Клиентски
// компонент, който импортира от него, влачи pg в браузърния бъндъл.
//
// Тежестта тук е ПРАВНА, не техническа (docs/ПРАВНИ-ИЗИСКВАНИЯ.md §7):
// съгласието за AGB и за Datenschutz се доказва с ConsentLog — тип, версия
// на текста, хеш, момент, IP. Булево поле `agreed = true` не доказва нищо
// по Art. 7(1) GDPR: то не казва КАКВО е приел човекът и КОГА.

import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { LEGAL_TEXT_VERSIONS, type LegalTextKey } from "@/lib/legal";
import type { Locale } from "@/lib/i18n/config";
import { hashPassword } from "./password";
import type { RegisterInput } from "./register";

/** Колко е валиден линкът за потвърждение на имейла. */
export const VERIFICATION_TOKEN_TTL_HOURS = 24;

export interface RegisterMeta {
  /** Доказателство по Art. 7 GDPR — откъде е дадено съгласието. */
  ip: string | null;
  userAgent: string | null;
  locale: Locale;
  now?: Date;
}

export interface RegisterOutcome {
  /**
   * false, когато имейлът вече има профил.
   *
   * НЕ СТИГА ДО ЕКРАНА. Вика се само от server action-а, за да реши дали да
   * прати писмо за потвърждение — отговорът към браузъра е един и същ.
   */
  created: boolean;
  userId: string | null;
  /** Токенът за линка в писмото. null, когато нищо не е създадено. */
  verificationToken: string | null;
  /** Токенът за double opt-in на бюлетина. */
  newsletterConfirmToken: string | null;
}

const NOT_CREATED: RegisterOutcome = {
  created: false,
  userId: null,
  verificationToken: null,
  newsletterConfirmToken: null,
};

/**
 * Хеш на правния текст, който е приет.
 *
 * ⚠️ ЧАСТИЧНО: истинските текстове на AGB и Datenschutzerklärung още ги
 * няма (страниците показват AwaitingLegalText). Затова тук се хешира
 * каноничният идентификатор „<ключ>@<версия>", който поне заковава ВЕРСИЯТА
 * и се променя при всяка нова редакция.
 *
 * Когато юристът достави текстовете, тази функция трябва да хешира самото
 * ТЯЛО на текста — тогава ConsentLog доказва и съдържанието, не само
 * номера на версията. Стойностите в базата остават проверими, защото
 * textVersion се записва до хеша.
 */
function legalTextHash(key: LegalTextKey, version: string): string {
  return createHash("sha256").update(`${key}@${version}`).digest("hex");
}

/** 32 байта случайност, безопасни за URL. */
function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Създава профил, съгласията и (по желание) абонамента за бюлетин.
 *
 * СЪЩЕСТВУВАЩ ИМЕЙЛ не е грешка към клиента: връща се `created: false`, а
 * server action-ът показва СЪЩОТО съобщение „проверете пощата", както при
 * успех. Иначе формата за регистрация се превръща в справка кой има профил
 * в института — това е изтичане на лични данни (kto е клиент на езиков
 * институт е информация за човека), а и подготовка за подбор на пароли по
 * потвърдени адреси.
 *
 * Правилният начин да се предупреди истинският притежател е ПИСМО до него
 * („някой се опита да се регистрира с този адрес"), не съобщение към
 * непознатия пред формата. Шаблонът чака задача E1 в lib/email.
 */
export async function createRegistration(
  input: RegisterInput,
  meta: RegisterMeta,
): Promise<RegisterOutcome> {
  const now = meta.now ?? new Date();

  // Хеширането е ИЗВЪН транзакцията: scrypt държи процесора ~80 ms, а
  // отворена транзакция през това време заема връзка от пула за нищо.
  const passwordHash = await hashPassword(input.password);

  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (existing) return NOT_CREATED;

      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          phone: input.phone ? input.phone : null,
          passwordHash,
          locale: meta.locale,
          // Профилът НЕ е активен без потвърждение на имейла. Иначе всеки
          // може да регистрира чужд адрес и да поеме гост-поръчките към него.
          emailVerified: null,
        },
        select: { id: true },
      });

      const verificationToken = newToken();
      await tx.verificationToken.create({
        data: {
          identifier: input.email,
          token: verificationToken,
          expires: new Date(
            now.getTime() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
          ),
        },
      });

      // TERMS и PRIVACY са дадени с отмятането — за тях няма второ
      // потвърждение, затова confirmedAt е сега. Имейлът се дублира до
      // userId нарочно: съгласието трябва да преживее изтриването на профила
      // (полето е onDelete: SetNull).
      await tx.consentLog.createMany({
        data: [
          {
            userId: user.id,
            email: input.email,
            type: "TERMS",
            textVersion: LEGAL_TEXT_VERSIONS.terms,
            textHash: legalTextHash("terms", LEGAL_TEXT_VERSIONS.terms),
            granted: true,
            requestedAt: now,
            confirmedAt: now,
            ip: meta.ip,
            userAgent: meta.userAgent,
          },
          {
            userId: user.id,
            email: input.email,
            type: "PRIVACY",
            textVersion: LEGAL_TEXT_VERSIONS.privacy,
            textHash: legalTextHash("privacy", LEGAL_TEXT_VERSIONS.privacy),
            granted: true,
            requestedAt: now,
            confirmedAt: now,
            ip: meta.ip,
            userAgent: meta.userAgent,
          },
        ],
      });

      let newsletterConfirmToken: string | null = null;

      if (input.newsletter) {
        newsletterConfirmToken = await subscribeToNewsletter(tx, input, meta, now);
      }

      return {
        created: true,
        userId: user.id,
        verificationToken,
        newsletterConfirmToken,
      };
    });
  } catch (error) {
    // Две едновременни регистрации на един имейл: проверката по-горе минава
    // и в двете, а UNIQUE индексът спира втората. Това е СЪЩИЯТ случай като
    // „вече съществува" и отговорът е същият, не грешка.
    if (isUniqueViolation(error)) return NOT_CREATED;
    throw error;
  }
}

/**
 * Бюлетинът е ОТДЕЛНО съгласие с отделен ConsentLog.
 *
 * Едно отмятане не може да покрие две цели (Art. 6(1)(a) GDPR), затова
 * записът е самостоятелен, а `confirmedAt` остава null до кликването в
 * писмото — това е double opt-in, задължителен за бюлетин по §7 UWG.
 */
async function subscribeToNewsletter(
  tx: Prisma.TransactionClient,
  input: RegisterInput,
  meta: RegisterMeta,
  now: Date,
): Promise<string | null> {
  const existing = await tx.newsletterSubscriber.findUnique({
    where: { email: input.email },
    select: { id: true, status: true, confirmToken: true },
  });

  const version = LEGAL_TEXT_VERSIONS.newsletter;

  await tx.consentLog.create({
    data: {
      email: input.email,
      type: "NEWSLETTER",
      textVersion: version,
      textHash: legalTextHash("newsletter", version),
      granted: true,
      requestedAt: now,
      // Нарочно null: потвърждава се от писмото, не от формата.
      confirmedAt: null,
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  if (!existing) {
    const confirmToken = newToken();
    await tx.newsletterSubscriber.create({
      data: {
        email: input.email,
        name: input.name,
        status: "PENDING",
        locale: meta.locale,
        confirmToken,
        unsubscribeToken: newToken(),
        consentTextVersion: version,
        ip: meta.ip,
      },
    });
    return confirmToken;
  }

  // Отписал се преди това човек, който иска отново — връща се в PENDING с
  // НОВ токен. Старият линк за потвърждение вече е бил в чужда пощенска
  // кутия и не бива да върши работа.
  if (existing.status === "UNSUBSCRIBED" || existing.status === "BOUNCED") {
    const confirmToken = newToken();
    await tx.newsletterSubscriber.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        confirmToken,
        consentTextVersion: version,
        unsubscribedAt: null,
        confirmedAt: null,
        locale: meta.locale,
      },
    });
    return confirmToken;
  }

  // Вече PENDING или CONFIRMED — записът не се пипа. Смяна на токена би
  // обезсилила линка, който човекът може в момента да отваря.
  return existing.status === "PENDING" ? existing.confirmToken : null;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}
