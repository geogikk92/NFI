// ТЕРИТОРИЯ НА БОБИ · задача 17m — медиен слой, хранилище.
//
// До 03.08 това беше договорка с mock тяло. Сега е РЕАЛИЗАЦИЯ с два
// драйвера:
//
//   • локален (uploads/, в .gitignore) — работи веднага, без акаунти.
//     Подписаните линкове са истински HMAC през app/api/storage.
//   • S3/R2 — чака ключовете от Жоро (docs/ДЕПЛОЙ.md „По-късно").
//     Конфигурирани ключове без драйвер дават ЯСНА грешка, не тиха
//     повреда — виж s3NotReady().
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
  checksum?: string;
}

/** S3 се смята за конфигуриран при наличен bucket + ключове. */
function s3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

/**
 * Конфигуриран S3 без драйвер е ГРЕШКА, не резервен път към localhost:
 * тихото падане към локалния диск в продукция значи файлове, които
 * изчезват при всеки deploy.
 */
function s3NotReady(fn: string): never {
  throw new Error(
    `lib/storage.${fn}(): S3 ключовете са зададени, но S3 драйверът още не е ` +
      "написан (задача 17m, следваща стъпка). Махни S3_* от средата, за да " +
      "работи локалният драйвер, или изчакай S3 драйвера.",
  );
}

/**
 * Ключ за нов файл: scope/година/slug-суфикс.разширение.
 * Суфиксът пази от съвпадения, без да прави ключа нечетим.
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
  if (s3Configured()) s3NotReady("createUploadTarget");

  void mimeType;
  void sizeBytes;

  const extension = filename.split(".").pop() ?? "bin";
  const key = newObjectKey(scope, filename.replace(/\.[^.]+$/, ""), extension);

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
  if (s3Configured()) s3NotReady("signedUrl");

  return localSignedPath(key, options?.expiresIn ?? 300, options?.downloadAs);
}

/** Метаданни без сваляне — за проверка след качване. */
export async function head(key: string): Promise<StorageObject | null> {
  if (s3Configured()) s3NotReady("head");
  return localHead(key);
}

/**
 * Съдържанието на обект — за route handlers, които стриймват сами
 * (свалянето на материали слага Content-Disposition и брои опити).
 */
export async function readObject(
  key: string,
): Promise<{ body: Buffer; mimeType: string } | null> {
  if (s3Configured()) s3NotReady("readObject");
  return localRead(key);
}

/**
 * Трайно изтриване. Ползва се от GDPR retention cron-а за преводните
 * документи (задача 21). Връща true и когато обектът вече го няма.
 */
export async function remove(key: string): Promise<boolean> {
  if (s3Configured()) s3NotReady("remove");
  return localRemove(key);
}

/** Сървърно качване — само за генерирани файлове (PDF от pdf-lib). */
export async function putObject(
  scope: StorageScope,
  key: string,
  body: Uint8Array | Buffer,
  mimeType: string,
): Promise<StorageObject> {
  if (s3Configured()) s3NotReady("putObject");

  if (!key.startsWith(`${scope}/`)) {
    throw new Error(
      `Ключът „${key}" не е в scope „${scope}" — ключове се правят с newObjectKey().`,
    );
  }

  return localPut(key, body, mimeType);
}

export { isSafeKey };
