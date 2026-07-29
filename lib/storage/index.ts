// ДОГОВОРКА, не реализация.
//
// Собственик: БОБИ (запълва я в задача 17m — медиен слой).
// Ползва се от Жоро от ден 1 за файловете на продуктите и преводните
// документи. Затова сигнатурите се пипат само с уговорка между двамата;
// mock тялото отдолу е на Боби и се сменя без предупреждение.
//
// Реализацията ще е S3/R2 в EU регион (виж .env.example).

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

/**
 * Presigned URL за качване. Файлът НИКОГА не минава през сървъра на
 * Next — иначе Vercel лимитът за размер на заявка ще ни спре.
 */
export async function createUploadTarget(
  scope: StorageScope,
  filename: string,
  mimeType: string,
  sizeBytes: number,
): Promise<UploadTarget> {
  return notImplemented("createUploadTarget", {
    scope,
    filename,
    mimeType,
    sizeBytes,
  });
}

/**
 * Подписан линк за сваляне. Единственият начин да се стигне до файл
 * извън scope "media" — няма публични URL-и за платено съдържание.
 */
export async function signedUrl(
  key: string,
  options?: SignedUrlOptions,
): Promise<string> {
  return notImplemented("signedUrl", { key, options });
}

/** Метаданни без сваляне — за проверка след качване. */
export async function head(key: string): Promise<StorageObject | null> {
  return notImplemented("head", { key });
}

/**
 * Трайно изтриване. Ползва се от GDPR retention cron-а за преводните
 * документи (задача 21). Връща true и когато обектът вече го няма.
 */
export async function remove(key: string): Promise<boolean> {
  return notImplemented("remove", { key });
}

/** Сървърно качване — само за генерирани файлове (PDF от pdf-lib). */
export async function putObject(
  scope: StorageScope,
  key: string,
  body: Uint8Array | Buffer,
  mimeType: string,
): Promise<StorageObject> {
  return notImplemented("putObject", { scope, key, mimeType, size: body.length });
}

// ─────────────────────────────────────────────────────────────────────────

function notImplemented(fn: string, args: unknown): never {
  const detail = JSON.stringify(args);
  if (process.env.NODE_ENV === "production") {
    throw new Error(`lib/storage.${fn}() още не е реализирана.`);
  }
  throw new Error(
    `lib/storage.${fn}() е още mock (собственик: Боби, задача 17m). Извикана с ${detail}`,
  );
}
