// ТЕРИТОРИЯ НА БОБИ · задача 17m-b — драйверът за S3 / Cloudflare R2.
//
// Говори директно по S3 REST API-то през fetch + собствения SigV4 подпис
// (sigv4.ts). Без @aws-sdk — от v3.729 SDK-то праща aws-chunked стрийминг
// подпис, който R2 отказва с NotImplemented; собственият подпис с единичен
// payload hash заобикаля целия този клас проблеми.
//
// Адресирането е path-style (endpoint/bucket/key): по-просто и не зависи
// от името на bucket-а като поддомейн. Регионът за R2 е винаги "auto".
//
// ДОГОВОРЪТ ЗА ГРЕШКИ е заигран с потребителите на lib/storage:
//   • 404 → null (readObject/head) или true (remove). Свалянето на
//     материали третира null като НОРМАЛЕН път — хвърляне там значи
//     човекът губи опит за сваляне И получава 500.
//   • 403 → ХВЪРЛЯ. Тихото приравняване на „нямам права" към „файлът го
//     няма" би пре-генерирало сертификати и връщало опити при всяко
//     сваляне — повреда, която не се вижда никъде освен в сметката.
//   • Всичко друго не-2xx → хвърля с кода и първите байтове от XML-а.
//
// fetch-ът е ИНЖЕКТИРУЕМ (само за тестове): така всяка заявка се
// доказва байт по байт без реален bucket — точно ограничението на
// задачата, докато ключовете от Cloudflare още ги няма.
//
// БЕЗ "server-only" — както lib/db.ts и ./local.ts: сийдът и скриптовете
// (tsx, извън Next) минават през putObject → тук, а server-only хвърля
// при внасяне извън React server контекст. Секретът пак не може да
// стигне до браузъра: нито един клиентски компонент не внася хранилището,
// а и клиентският бъндъл няма node:crypto — внасянето би счупило билда.

import type { StorageObject } from "./index";
import {
  EMPTY_SHA256,
  hexSha256,
  signHeaders,
  signQuery,
  toAmzDate,
  uriEncode,
  type SigV4Credentials,
} from "./sigv4";

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

interface S3Target {
  host: string;
  protocol: "https" | "http";
  bucket: string;
  credentials: SigV4Credentials;
}

/**
 * Конфигурацията се чете при всяко извикване, не при import: тестовете
 * я сменят по време на работа, а и грешката „липсва S3_ENDPOINT" така
 * се появява при първата ЗАЯВКА, с ясен текст — не при стартиране на
 * процеса, където никой не гледа.
 */
function target(): S3Target {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 драйверът иска S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID и " +
        "S3_SECRET_ACCESS_KEY. Виж .env.example — непълна конфигурация " +
        "не пада тихо към локалния диск.",
    );
  }

  const url = new URL(endpoint);

  // Път в endpoint-а НЕ се поддържа и не се приема мълчаливо: драйверът
  // адресира path-style (endpoint/bucket/ключ) и префиксът просто щеше да
  // изчезне от всяка заявка и от всеки подписан адрес. По-лошото е, че
  // договорът „404 → null" прави такава мисконфигурация неразличима от
  // „файлът липсва". (Одит, 05.08.2026.)
  if (url.pathname !== "/" || url.search) {
    throw new Error(
      `S3_ENDPOINT не бива да носи път или параметри („${url.pathname}${url.search}"). ` +
        "Дай само адреса на хоста, напр. " +
        "https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com — ключът и " +
        "bucket-ът се долепят от драйвера.",
    );
  }

  return {
    host: url.host,
    protocol: url.protocol === "http:" ? "http" : "https",
    bucket,
    credentials: {
      accessKeyId,
      secretAccessKey,
      // R2 приема само "auto"; празното също значи auto, но изписано е
      // по-честно.
      region: process.env.S3_REGION || "auto",
      service: "s3",
    },
  };
}

/** Суровият път за подписа: /bucket/key, БЕЗ кодиране — signHeaders кодира сам. */
function rawPath(t: S3Target, key: string): string {
  return `/${t.bucket}/${key}`;
}

class S3RequestError extends Error {
  constructor(operation: string, status: number, detail: string) {
    super(
      `S3 ${operation} върна HTTP ${status}. ${detail}`.trim(),
    );
    this.name = "S3RequestError";
  }
}

/**
 * 403 се именува изрично: най-честата причина е token без права или
 * изкривен часовник (подписът важи ±15 минути), не липсващ файл.
 */
function accessDenied(operation: string): S3RequestError {
  return new S3RequestError(
    operation,
    403,
    "Токенът няма права за тази операция (или часовникът на машината " +
      "е изместен с повече от 15 минути). Провери правата на R2 API токена.",
  );
}

async function send(
  t: S3Target,
  method: string,
  key: string,
  options: {
    body?: Uint8Array;
    headers?: Array<[string, string]>;
    fetchImpl?: FetchImpl;
  } = {},
): Promise<Response> {
  const amzDate = toAmzDate(new Date());
  const payloadHash = options.body ? hexSha256(options.body) : EMPTY_SHA256;

  // Подписват се ТОЧНО headers-ите, които се пращат — разминаване между
  // подписано и пратено е тихо 403.
  const headers: Array<[string, string]> = [
    ["x-amz-content-sha256", payloadHash],
    ["x-amz-date", amzDate],
    ...(options.headers ?? []),
  ];

  const authorization = signHeaders({
    method,
    host: t.host,
    rawPath: rawPath(t, key),
    headers,
    payloadHash,
    amzDate,
    credentials: t.credentials,
  });

  // Пътят в реалния URL се кодира със СЪЩАТА функция като в подписа —
  // две различни кодирания са двата различни canonical request-а.
  const encodedPath = rawPath(t, key).split("/").map(uriEncode).join("/");
  const url = `${t.protocol}://${t.host}${encodedPath}`;

  const doFetch = options.fetchImpl ?? fetch;
  return doFetch(url, {
    method,
    headers: Object.fromEntries([...headers, ["authorization", authorization]]),
    body: options.body as BodyInit | undefined,
  });
}

export async function s3Head(
  key: string,
  fetchImpl?: FetchImpl,
): Promise<StorageObject | null> {
  const t = target();
  const res = await send(t, "HEAD", key, { fetchImpl });

  if (res.status === 404) return null;
  if (res.status === 403) throw accessDenied("HEAD");
  if (!res.ok) throw new S3RequestError("HEAD", res.status, "");

  return {
    key,
    sizeBytes: Number(res.headers.get("content-length") ?? 0),
    mimeType: res.headers.get("content-type") ?? "application/octet-stream",
    // ETag при multipart НЕ е хеш на съдържанието — затова се чете
    // нашият x-amz-meta-sha256, писан от s3Put. Обекти, качени по друг
    // път (rclone, ръчно), нямат checksum и това е честната стойност.
    checksum: res.headers.get("x-amz-meta-sha256") ?? undefined,
  };
}

export async function s3Read(
  key: string,
  fetchImpl?: FetchImpl,
): Promise<{ body: Buffer; mimeType: string } | null> {
  const t = target();
  const res = await send(t, "GET", key, { fetchImpl });

  if (res.status === 404) return null;
  if (res.status === 403) throw accessDenied("GET");
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new S3RequestError("GET", res.status, detail);
  }

  // БУФЕР, не стрийм: потребителите правят body.length, subarray().
  // toString() и new Uint8Array(body) — гол ReadableStream или Blob чупи
  // и трите. Файловете тук са изображения и PDF-и, не гигабайти.
  return {
    body: Buffer.from(await res.arrayBuffer()),
    mimeType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function s3Put(
  key: string,
  body: Uint8Array,
  mimeType: string,
  fetchImpl?: FetchImpl,
): Promise<StorageObject> {
  const t = target();
  const checksum = hexSha256(body);

  // content-length НЕ се подписва: undici го смята сам от буфера и
  // всеки header, който транспортът пише вместо нас, е кандидат за тихо
  // разминаване между подписано и пратено.
  const res = await send(t, "PUT", key, {
    body,
    headers: [
      // Content-Type СЕ записва в обекта — свалянето после чете
      // object.mimeType и PDF без него пристига като octet-stream.
      ["content-type", mimeType],
      // Реален sha256 в метаданните, защото ETag при multipart не е.
      ["x-amz-meta-sha256", checksum],
    ],
    fetchImpl,
  });

  if (res.status === 403) throw accessDenied("PUT");
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    throw new S3RequestError("PUT", res.status, detail);
  }

  return { key, sizeBytes: body.length, mimeType, checksum };
}

export async function s3Remove(
  key: string,
  fetchImpl?: FetchImpl,
): Promise<boolean> {
  const t = target();
  const res = await send(t, "DELETE", key, { fetchImpl });

  // Договорът е „true = обектът го няма" — липсвал ли е поначало, целта
  // е постигната. S3 DELETE и без това връща 204 за несъществуващ ключ;
  // 404 тук би дошъл от друг слой, но семантиката е същата.
  if (res.status === 404) return true;
  if (res.status === 403) throw accessDenied("DELETE");
  if (!res.ok) throw new S3RequestError("DELETE", res.status, "");

  return true;
}

/**
 * Presigned PUT — за качване направо от браузъра, когато файлът не бива
 * да минава през сървъра (лимитът на Vercel). Content-Type се ПОДПИСВА:
 * клиентът е длъжен да прати точно същата стойност, иначе 403 — така
 * издаденият адрес не може да качи друг вид файл.
 *
 * ВНИМАНИЕ: работи само при настроена CORS политика НА BUCKET-А (R2 →
 * Settings → CORS Policy, AllowedMethods PUT + AllowedHeaders
 * Content-Type). Това не се доказва от тестове — проверява се при
 * първата реална конфигурация.
 */
export function s3PresignedPut(
  key: string,
  mimeType: string,
  expiresInSeconds: number,
): string {
  const t = target();

  return signQuery({
    method: "PUT",
    host: t.host,
    protocol: t.protocol,
    rawPath: rawPath(t, key),
    headers: [["content-type", mimeType]],
    amzDate: toAmzDate(new Date()),
    expiresIn: expiresInSeconds,
    credentials: t.credentials,
  });
}

/**
 * Presigned GET — абсолютен адрес към самия bucket. Кратък срок: линкът
 * Е достъпът. downloadAs минава в response-content-disposition със
 * СЪЩОТО RFC 5987 кодиране като локалния route — иначе кирилските имена
 * стават „_____.pdf".
 */
export function s3SignedUrl(
  key: string,
  expiresInSeconds: number,
  downloadAs?: string,
): string {
  const t = target();

  const query: Array<[string, string]> = downloadAs
    ? [
        [
          "response-content-disposition",
          `attachment; filename*=UTF-8''${encodeURIComponent(downloadAs)}`,
        ],
      ]
    : [];

  return signQuery({
    method: "GET",
    host: t.host,
    protocol: t.protocol,
    rawPath: rawPath(t, key),
    query,
    amzDate: toAmzDate(new Date()),
    expiresIn: expiresInSeconds,
    credentials: t.credentials,
  });
}
