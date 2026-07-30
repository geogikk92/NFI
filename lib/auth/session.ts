// Чистата половина на сесията: имена, срокове и работа с токена.
//
// Разделено от session-db.ts по същата причина като register/register-db и
// call-requests/call-requests-db: този файл не внася Prisma и затова може да
// се внесе отвсякъде и да се тества без база.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Име на бисквитката.
 *
 * Префиксът „__Host-" НЕ е украса: браузърът приема такава бисквитка само
 * ако е secure, path=/ и БЕЗ Domain — тоест поддомейн не може да я запише.
 * Без него чужд поддомейн (например staging.nfi.bg или нещо качено от
 * трето лице) може да зададе сесийна бисквитка на главния домейн.
 *
 * Но по http://localhost браузърът отказва __Host- (не е secure), затова
 * извън продукция името е голо. Разликата е само в името, не в поведението.
 */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-nfi_session" : "nfi_session";

/**
 * 30 дни, абсолютен срок — НЕ плаващ.
 *
 * Плаващият срок би бил по-приятен, но иска запис на бисквитка при всяко
 * четене, а Next 15 позволява запис само в server action или route handler.
 * Извикано от страница, това хвърля. Абсолютният срок е и по-безопасен:
 * открадната бисквитка изтича на определена дата, вместо да се подновява
 * сама, докато крадецът чете.
 */
export const SESSION_TTL_DAYS = 30;
export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

/**
 * 32 байта от crypto.randomBytes — 256 бита ентропия.
 *
 * base64url, а не hex: същата ентропия в 43 знака вместо 64, и без знаци,
 * които искат екраниране в бисквитка.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * В базата се пази SHA-256 на токена, никога самият токен.
 *
 * Причината е конкретна: копие на базата (бекъп, дъмп, SQL injection в
 * съвсем друга таблица) иначе дава на четящия готови сесии за всички
 * влезли потребители. С хеш копието е безполезно — от него не се стига
 * обратно до бисквитката.
 *
 * SHA-256 без сол и без бавене е ДОСТАТЪЧНО тук, за разлика от паролите:
 * токенът е 256 бита случайност, не човешка дума. Няма речник, по който
 * да се подбира, тоест бавният хеш не купува нищо, а струва при всяка
 * заявка.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Сравнение на два хеша в постоянно време.
 *
 * Търсенето в базата и без това е по индекс, но където има сравнение на
 * тайни, то е timing-safe — навикът струва нула, а изключенията се помнят
 * трудно.
 */
export function sessionTokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Кога изтича сесия, създадена в момента `now`. */
export function sessionExpiry(now: Date): Date {
  return new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
}

/** Изтекла ли е сесия със срок `expires` към момент `now`. */
export function isExpired(expires: Date, now: Date): boolean {
  // Строго по-малко: сесия, изтичаща точно сега, е изтекла.
  return expires.getTime() <= now.getTime();
}

/**
 * Настройките на бисквитката на едно място, за да не се разминат между
 * задаване и изтриване — разминат ли се, изтриването тихо не работи и
 * „Изход" оставя човека влязъл.
 */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // JavaScript не бива да я вижда: XSS иначе изнася сесията.
    sameSite: "lax" as const,
    // „lax", не „strict": при „strict" връщане по връзка от имейл показва
    // човека като излязъл, което ще бъде докладвано като дефект.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
