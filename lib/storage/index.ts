// ТЕРИТОРИЯ НА БОБИ · задачи 17m / 17m-b — медиен слой, хранилище.
//
// ДВА драйвера зад един договор:
//
//   • локален (uploads/, в .gitignore) — работи веднага, без акаунти.
//     Подписаните линкове са истински HMAC през app/api/storage.
//   • S3/R2 (./s3.ts) — собствен SigV4 подпис върху fetch, доказан
//     срещу официалните AWS вектори (sigv4.test.ts). Включва се, щом
//     S3_* променливите са пълни — виж s3Configured().
//
// Сигнатурите са същите като в договорката от K1 + две нови функции
// (readObject, uploadsConfigured). Жоро консумира без промяна.

import {
  isSafeKey,
  localHead,
  localPut,
  localRead,
  localRemove,
  localSignedPath,
} from "./local";
import {
  s3Head,
  s3PresignedPut,
  s3Put,
  s3Read,
  s3Remove,
  s3SignedUrl,
} from "./s3";

export type StorageScope =
  /** Публични изображения — може да се кешира от CDN. */
  | "media"
  /** Файлове на дигитални продукти — само с DownloadGrant. */
  | "product"
  /** Лични документи за превод — GDPR retention, срок на живот. */
  | "translation"
  /** Генерирани PDF-и: фактури, сертификати. */
  | "document";

export interface UploadTarget {
  /** Ключът в bucket-а. Записва се в Media.key или ProductFile.storageKey. */
  key: string;
  /** Presigned URL за PUT директно от браузъра. */
  url: string;
  /** Полета, които трябва да придружат заявката (при POST policy). */
  fields?: Record<string, string>;
  expiresAt: Date;
}

export interface SignedUrlOptions {
  /** Секунди. По подразбиране 300. Дръж го кратко. */
  expiresIn?: number;
  /** Име, под което браузърът да предложи файла. */
  downloadAs?: string;
}

export interface StorageObject {
  key: string;
  sizeBytes: number;
  mimeType: string;
  /** sha256 на съдържанието — при S3 само за обекти, качени от нас
   *  (пише се в x-amz-meta-sha256; ETag при multipart НЕ е хеш). */
  checksum?: string;
}

/**
 * S3 се смята за конфигуриран при endpoint + bucket + двата ключа.
 *
 * S3_ENDPOINT Е ЧАСТ ОТ ПРОВЕРКАТА (от 17m-b): R2 винаги иска endpoint —
 * bucket и ключове без него по-рано минаваха за „готова конфигурация" и
 * заявките щяха да тръгнат към AWS вместо към R2: тиха повреда, която
 * изглежда като грешни креденшъли. Непълен набор сега пада към локалния
 * драйвер; кое липсва се вижда в .env.example.
 *
 * ЕДИНСТВЕНАТА такава проверка: драйверният избор тук,
 * app/api/storage/route.ts и админът на преводите питат нея. Две отделни
 * проверки се разминават при частична конфигурация и дават тихо счупени
 * линкове.
 */
export function s3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

/**
 * Ключ за нов файл: scope/година/slug-суфикс.разширение.
 * Суфиксът пази от съвпадения, без да прави ключа нечетим — и прави
 * ключа IMMUTABLE по конструкция: един ключ = едно съдържание завинаги.
 * Точно това позволява публичният /media път да кешира агресивно.
 */
export function newObjectKey(
  scope: StorageScope,
  baseName: string,
  extension: string,
): string {
  const year = new Date().getFullYear();
  const clean = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${scope}/${year}/${clean || "file"}-${suffix}.${extension}`;
}

/**
 * Presigned URL за качване. Файлът НИКОГА не минава през сървъра на
 * Next — иначе Vercel лимитът за размер на заявка ще ни спре.
 *
 * ЛОКАЛНО: качването минава през сървъра (същият process), защото
 * лимитът на Vercel не съществува на localhost. Затова тук връщаме
 * маркер-URL, а админ формите качват през server action → putObject.
 */
export async function createUploadTarget(
  scope: StorageScope,
  filename: string,
  mimeType: string,
  sizeBytes: number,
): Promise<UploadTarget> {
  void sizeBytes;

  const extension = filename.split(".").pop() ?? "bin";
  const key = newObjectKey(scope, filename.replace(/\.[^.]+$/, ""), extension);

  if (s3Configured()) {
    // Подписаният Content-Type заключва вида на файла; размерът НЕ може
    // да се заключи (R2 няма POST policy) — проверява се след качване
    // с head(). Работи само при CORS политика на bucket-а — виж s3.ts.
    const expiresIn = 15 * 60;
    return {
      key,
      url: s3PresignedPut(key, mimeType, expiresIn),
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  return {
    key,
    // Локалният драйвер няма отделен endpoint за PUT — качва се през
    // server action. URL-ът е маркер, който админ формата разпознава.
    url: "local://put-through-server-action",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };
}

/**
 * Подписан линк за сваляне. Единственият начин да се стигне до файл
 * извън scope "media" — няма публични URL-и за платено съдържание.
 */
export async function signedUrl(
  key: string,
  options?: SignedUrlOptions,
): Promise<string> {
  const expiresIn = options?.expiresIn ?? 300;

  if (s3Configured()) {
    // Абсолютен адрес към bucket-а. Консуматорите днес го слагат само в
    // href/redirect — относителният локален път и абсолютният S3 адрес
    // са взаимозаменяеми там.
    return s3SignedUrl(key, expiresIn, options?.downloadAs);
  }

  return localSignedPath(key, expiresIn, options?.downloadAs);
}

/** Метаданни без сваляне — за проверка след качване. */
export async function head(key: string): Promise<StorageObject | null> {
  if (s3Configured()) return s3Head(key);
  return localHead(key);
}

/**
 * Съдържанието на обект — за route handlers, които стриймват сами
 * (свалянето на материали слага Content-Disposition и брои опити).
 * Тялото е ЦЯЛ Buffer, не стрийм — консуматорите правят body.length,
 * subarray() и new Uint8Array(body).
 */
export async function readObject(
  key: string,
): Promise<{ body: Buffer; mimeType: string } | null> {
  if (s3Configured()) return s3Read(key);
  return localRead(key);
}

/**
 * Трайно изтриване. Ползва се от GDPR retention cron-а за преводните
 * документи (задача 21). Връща true и когато обектът вече го няма.
 */
export async function remove(key: string): Promise<boolean> {
  if (s3Configured()) return s3Remove(key);
  return localRemove(key);
}

/** Сървърно качване — генерирани файлове (PDF) и качвания през админа. */
export async function putObject(
  scope: StorageScope,
  key: string,
  body: Uint8Array | Buffer,
  mimeType: string,
): Promise<StorageObject> {
  if (!key.startsWith(`${scope}/`)) {
    throw new Error(
      `Ключът „${key}" не е в scope „${scope}" — ключове се правят с newObjectKey().`,
    );
  }

  if (s3Configured()) return s3Put(key, body, mimeType);
  return localPut(key, body, mimeType);
}

export { isSafeKey };
