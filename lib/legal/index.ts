// ТЕРИТОРИЯ НА ЖОРО · задача 26.
//
// Тук са правните решения, изразени като код. Обосновката за всяко е в
// docs/ПРАВНИ-ИЗИСКВАНИЯ.md — не сменяй стойност оттук, без да прочетеш
// съответния раздел там.
//
// Правилото: правно значим низ НИКОГА не се пише директно в компонент.
// Пише се тук, версионира се и се записва в ConsentLog с версията си.

import type { Cents } from "@/lib/money";

// ─────────────────────────────────────────────────────────────────────────
//  Button-Lösung · §312j Abs. 3 BGB
// ─────────────────────────────────────────────────────────────────────────

/**
 * Надписът на последния бутон в checkout.
 *
 * НЕ ГО ПИПАЙ без юрист и НЕ го превеждай в немския поток. Ако бутонът
 * не е недвусмислен, договорът изобщо не възниква — клиентът получава
 * стоката и законно не дължи нищо. Санкцията не е глоба, а нищожност.
 *
 * Забранени: „Bestellen", „Weiter", „Anmelden", „Absenden".
 */
export const ORDER_BUTTON_LABEL = "Zahlungspflichtig bestellen" as const;

/**
 * Непосредствено НАД бутона трябва да се виждат тези четири неща.
 * Списъкът е тук, за да може checkout-ът да се тества срещу него.
 */
export const PRE_BUTTON_DISCLOSURES = [
  "essentialCharacteristics",
  "totalPriceInclVat",
  "shippingCosts",
  "contractDuration",
] as const;

// ─────────────────────────────────────────────────────────────────────────
//  Начини на плащане · Наредба Н-18
// ─────────────────────────────────────────────────────────────────────────

/**
 * РЕШЕНИЕ, не описание.
 *
 * Всички плащания минават през виртуален ПОС (Mollie). Затова може да се
 * издава алтернативен документ вместо касова бележка от фискално
 * устройство — и модул 19 остава малък.
 *
 * Ако някой ден се добави плащане в брой или наложен платеж, цялият
 * фискален режим се връща: фискално устройство, СУПТО, електронни касови
 * бележки. Смяната на този флаг на true е архитектурно решение, не
 * настройка.
 */
export const CASH_PAYMENTS_ALLOWED = false;

// ─────────────────────────────────────────────────────────────────────────
//  ДДС
// ─────────────────────────────────────────────────────────────────────────

/** Праг за задължителна регистрация по ЗДДС, в сила от 01.01.2026. */
export const VAT_REGISTRATION_THRESHOLD_CENTS: Cents = 5_113_000; // 51 130 €

/**
 * Общ праг за трансгранични B2C доставки в ЕС. Под него се начислява
 * българско ДДС; над него — ДДС на държавата на купувача, през OSS.
 */
export const OSS_THRESHOLD_CENTS: Cents = 1_000_000; // 10 000 €

/** Стандартна и намалена ставка по държава на потребление. */
const VAT_RATES: Record<string, { standard: number; reduced: number }> = {
  BG: { standard: 20, reduced: 9 },
  DE: { standard: 19, reduced: 7 },
  AT: { standard: 20, reduced: 10 },
};

const HOME_COUNTRY = "BG";

/**
 * Как се третира продуктът по ДДС. НЕ съвпада с ProductType —
 * онлайн курс на живо и записан видеокурс са различни неща за закона,
 * макар и двете да са „дигитални".
 */
export type VatCategory =
  /** Курс с преподавател — присъствен или на живо онлайн. */
  | "education"
  /** Записано съдържание, PDF, автоматично сваляне. Електронна услуга. */
  | "electronic"
  /** Физическа стока. */
  | "goods"
  /** Заверен превод. */
  | "translation";

export interface VatContext {
  category: VatCategory;
  /** ISO 3166-1 alpha-2, държава на потребителя. */
  countryCode: string;
  /** Минат ли е прагът от 10 000 € за текущата година. */
  ossThresholdExceeded: boolean;
}

/**
 * Определя ставката. Умишлено е функция, а не константа: ставката зависи
 * от вида услуга, държавата и това дали е минат прагът.
 *
 * ⚠️ НЕЗАВЪРШЕНО: освобождаването на обучението (чл. 41 ЗДДС / §4 Nr. 21
 * UStG) е отворен въпрос 1 в docs/ПРАВНИ-ИЗИСКВАНИЯ.md. Докато няма
 * отговор от счетоводителя, „education" се третира като облагаемо по
 * стандартна ставка — по-безопасната от двете грешки.
 */
export function resolveVatRate(ctx: VatContext): number {
  const country = ctx.ossThresholdExceeded
    ? ctx.countryCode.toUpperCase()
    : HOME_COUNTRY;

  const rates = VAT_RATES[country] ?? VAT_RATES[HOME_COUNTRY];

  switch (ctx.category) {
    case "goods":
      // Книги и учебници обикновено са с намалена ставка — уточнява се
      // per продукт, затова тук е стандартната.
      return rates.standard;
    case "education":
    case "electronic":
    case "translation":
      return rates.standard;
  }
}

/** Поддържаме ли изобщо доставка/продажба към тази държава. */
export function isSupportedCountry(countryCode: string): boolean {
  return countryCode.toUpperCase() in VAT_RATES;
}

// ─────────────────────────────────────────────────────────────────────────
//  Версии на правните текстове
// ─────────────────────────────────────────────────────────────────────────

/**
 * Всяка промяна по правен текст ЗАДЪЛЖИТЕЛНО вдига версията тук.
 * Версията се записва в ConsentLog.textVersion заедно с хеш на текста —
 * иначе не можем да докажем какво точно е приел клиентът (Art. 7 GDPR).
 *
 * Формат: YYYY-MM-DD на влизане в сила.
 */
export const LEGAL_TEXT_VERSIONS = {
  terms: "2026-07-29",
  privacy: "2026-07-29",
  widerruf: "2026-07-29",
  newsletter: "2026-07-29",
  cookies: "2026-07-29",
} as const;

export type LegalTextKey = keyof typeof LEGAL_TEXT_VERSIONS;

// ─────────────────────────────────────────────────────────────────────────
//  Срокове
// ─────────────────────────────────────────────────────────────────────────

/** §355 BGB — право на отказ за потребители. */
export const WITHDRAWAL_PERIOD_DAYS = 14;

/** ЗДДС — фактурата се издава до 5 дни от данъчното събитие. */
export const INVOICE_DEADLINE_DAYS = 5;

/** GDPR retention за лични документи по преводи. */
export const DOC_RETENTION_DAYS = Number.parseInt(
  process.env.DOC_RETENTION_DAYS ?? "60",
  10,
);

// ─────────────────────────────────────────────────────────────────────────
//  Реквизити на продавача
// ─────────────────────────────────────────────────────────────────────────

/**
 * Пазят се в env, защото се менят (адрес, ДДС номер) и защото при SME
 * режим в ЕС номерът завършва на „-EX".
 *
 * При издаване се КОПИРАТ в Invoice — фактура отпреди преместването
 * трябва да носи стария адрес.
 */
export interface SellerDetails {
  name: string;
  eik: string;
  vatId: string | null;
  address: string;
  /** Материално отговорно лице — реквизит по българското счетоводство. */
  mol: string | null;
}

export function getSellerDetails(): SellerDetails {
  const name = process.env.SELLER_NAME;
  const eik = process.env.SELLER_EIK;
  const address = process.env.SELLER_ADDRESS;

  if (!name || !eik || !address) {
    throw new Error(
      "Липсват реквизити на продавача (SELLER_NAME, SELLER_EIK, SELLER_ADDRESS). " +
        "Без тях не може да се издаде фактура.",
    );
  }

  return {
    name,
    eik,
    vatId: process.env.SELLER_VAT_ID || null,
    address,
    mol: process.env.SELLER_MOL || null,
  };
}

/**
 * Може ли да се издаде DownloadGrant за дигитална стока.
 *
 * §356 Abs. 5 BGB иска и трите условия. Липсва ли едно, клиентът сваля
 * файла и пак има право да си иска парите — затова проверката е тук,
 * а не в дисциплината на извикващия.
 */
export function mayReleaseDigitalGoods(input: {
  /** Клиентът изрично се е съгласил изпълнението да започне веднага. */
  hasExplicitConsent: boolean;
  /** Потвърдил е, че знае, че губи правото на отказ. */
  acknowledgedWaiver: boolean;
  /** §312f потвърждението е изпратено на траен носител. */
  confirmationSentAt: Date | null;
}): boolean {
  return (
    input.hasExplicitConsent &&
    input.acknowledgedWaiver &&
    input.confirmationSentAt !== null
  );
}
