// ОБЩ ФАЙЛ · задача 2c — съгласие за бисквитки.
// Писано от Жоро, докато Боби е в отпуск.
//
// Логиката е чиста и тестваема. Достъпът до бисквитката е в
// consent-cookie.ts.
//
// ГЛАВНОТО: съгласието РЕАЛНО гейтва скриптове. Банер, който само се
// скрива, а видеото се зарежда отдолу, е по-лош от липсващ банер — той
// документира нарушението.

export const CONSENT_COOKIE = "nfi_consent";

/** Една година. По-дълго е спорно, по-кратко дразни. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Категориите. „necessary" не е избор — тя е сесията, количката и самото
 * съгласие. Тя не се пита, защото без нея сайтът не работи, и точно
 * затова не изисква разрешение.
 */
export type ConsentCategory = "necessary" | "functional" | "analytics";

export interface ConsentState {
  necessary: true;
  /** Вградени видеа (Vimeo/GoTo) — задача 8. */
  functional: boolean;
  analytics: boolean;
  /** Версията на текста, с която е дадено. Сменя се → пита се отново. */
  version: string;
  decidedAt: string | null;
}

/** Сменя се при всяка промяна в текста на банера. */
export const CONSENT_VERSION = "2026-07-29";

/** Преди решение: само необходимото. Никакво „по подразбиране включено". */
export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  functional: false,
  analytics: false,
  version: CONSENT_VERSION,
  decidedAt: null,
};

export function acceptAll(now: Date): ConsentState {
  return {
    necessary: true,
    functional: true,
    analytics: true,
    version: CONSENT_VERSION,
    decidedAt: now.toISOString(),
  };
}

/**
 * „Отказвам всичко" ЗАДЪЛЖИТЕЛНО е равностойно на „Приемам всичко":
 * еднакво лесно, един клик. Иначе съгласието не е свободно (Art. 7(4)
 * GDPR) и не важи.
 */
export function rejectAll(now: Date): ConsentState {
  return {
    necessary: true,
    functional: false,
    analytics: false,
    version: CONSENT_VERSION,
    decidedAt: now.toISOString(),
  };
}

export function saveSelection(
  selection: { functional: boolean; analytics: boolean },
  now: Date,
): ConsentState {
  return {
    necessary: true,
    functional: selection.functional,
    analytics: selection.analytics,
    version: CONSENT_VERSION,
    decidedAt: now.toISOString(),
  };
}

/** Повредена бисквитка → връща се към отказ, не към приемане. */
export function parseConsent(raw: string | undefined | null): ConsentState {
  if (!raw) return DEFAULT_CONSENT;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_CONSENT;
  }

  if (typeof parsed !== "object" || parsed === null) return DEFAULT_CONSENT;

  const value = parsed as Record<string, unknown>;

  // Различна версия на текста означава ново съгласие — човекът е приел
  // друго, не това.
  if (value.version !== CONSENT_VERSION) return DEFAULT_CONSENT;

  return {
    necessary: true,
    functional: value.functional === true,
    analytics: value.analytics === true,
    version: CONSENT_VERSION,
    decidedAt:
      typeof value.decidedAt === "string" ? value.decidedAt : null,
  };
}

export function serializeConsent(state: ConsentState): string {
  return JSON.stringify(state);
}

/** Показва ли се банерът. */
export function needsDecision(state: ConsentState): boolean {
  return state.decidedAt === null;
}

/**
 * Единственият въпрос, който останалият код има право да задава.
 *
 * Ползва се така:
 *   if (!hasConsent(state, "functional")) → показва се заместител,
 *   а НЕ скрит iframe.
 */
export function hasConsent(
  state: ConsentState,
  category: ConsentCategory,
): boolean {
  if (category === "necessary") return true;
  return state[category] === true;
}
