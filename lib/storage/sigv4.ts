// ТЕРИТОРИЯ НА БОБИ · задача 17m-b — подписът AWS Signature Version 4.
//
// СОБСТВЕНА реализация, не @aws-sdk. Причината не е спестен килобайт:
// от v3.729 SDK-то праща aws-chunked стрийминг подпис с CRC32, който
// Cloudflare R2 отказва с NotImplemented. Собственият подпис (единичен
// payload hash) заобикаля целия този клас проблеми и е ~150 реда.
//
// Модулът е ЧИСТ: не чете process.env, не прави мрежови заявки, времето
// (amzDate) влиза като аргумент. Точно затова е доказуем със замразените
// официални вектори на AWS (виж sigv4.test.ts) — подпис, който зависи от
// средата, не може да се сравни с очакван низ.
//
// Секретът не изтича към браузъра по конструкция: единственият вносител
// е lib/storage/s3.ts, а нито един клиентски компонент не внася
// хранилището — и не може: клиентският бъндъл няма node:crypto.
//
// node:crypto, не Web Crypto: всичко тук се вика от route handlers и
// server actions (Node runtime). Edge (middleware.ts) не пипа хранилището.

import { createHash, createHmac } from "node:crypto";

export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  /** За R2 винаги "auto". */
  region: string;
  /** За хранилището винаги "s3". */
  service: string;
}

/** SHA-256 на празно тяло — payload hash за GET/HEAD/DELETE. */
export const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** Маркерът за неподписано тяло (presigned URL, качване от браузър). */
export const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";

export function hexSha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * RFC 3986 кодиране ПО БАЙТОВЕ от UTF-8.
 *
 * encodeURIComponent сам по себе си е грешен за подписа: не кодира
 * ! ' ( ) * — а AWS ги иска като %XX. Интервалът е %20, никога "+".
 * Шестнайсетичните цифри са ГЛАВНИ — малки букви дават друг canonical
 * request и тихо 403.
 */
export function uriEncode(value: string): string {
  let out = "";
  for (const byte of Buffer.from(value, "utf8")) {
    const ch = String.fromCharCode(byte);
    if (/[A-Za-z0-9\-_.~]/.test(ch)) {
      out += ch;
    } else {
      out += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}

/**
 * Canonical URI за S3/R2: всеки сегмент се кодира ЕДНОКРАТНО, пътят НЕ
 * се нормализира. Ключове като "a//b" и "x/../y" са валидни S3 обекти и
 * подписът трябва да ги отрази буквално — премахването на "." и ".." и
 * двойното кодиране важат за ДРУГИТЕ AWS услуги, не за S3. Векторът
 * normalize-path/get-slashes в теста пази това от „поправяне".
 */
function canonicalUri(pathname: string): string {
  return pathname.split("/").map(uriEncode).join("/");
}

/**
 * Canonical query: кодираш ключ и стойност, сортираш по КОДИРАНИЯ ключ
 * байтово (не localeCompare — българската локала реди другояче), при
 * равни ключове — по кодираната стойност. Празна стойност дава "key="
 * със знака равно (вектор GET Bucket lifecycle).
 */
function canonicalQuery(params: ReadonlyArray<[string, string]>): string {
  return params
    .map(([k, v]) => [uriEncode(k), uriEncode(v)] as const)
    .sort(([ak, av], [bk, bv]) =>
      ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0,
    )
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

/**
 * Canonical headers: име в малки букви, стойност trim-ната и с вътрешни
 * поредици от интервали, свити до един (важи и ВЪТРЕ в кавички — вектор
 * get-header-value-trim). Редове, сортирани по име, всеки завършва с LF.
 */
function canonicalHeaders(
  headers: ReadonlyArray<[string, string]>,
): { block: string; signedNames: string } {
  const folded = headers
    .map(
      ([name, value]) =>
        [name.toLowerCase().trim(), value.trim().replace(/[ \t]+/g, " ")] as const,
    )
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return {
    block: folded.map(([n, v]) => `${n}:${v}\n`).join(""),
    signedNames: folded.map(([n]) => n).join(";"),
  };
}

/**
 * Ключът за подписване зависи само от (секрет, ден, регион, услуга) —
 * кешира се, за да не се правят 4 HMAC-а на всяка заявка. Кешът е малък
 * и се изпразва, вместо да расте: смяна на ключове по време на работа е
 * изключение, не режим.
 */
const signingKeyCache = new Map<string, Buffer>();

function signingKey(credentials: SigV4Credentials, dateStamp: string): Buffer {
  // Ключът на кеша е СЕКРЕТЪТ, не accessKeyId: деривацията отдолу зависи
  // само от (секрет, ден, регион, услуга) и accessKeyId изобщо не влиза в
  // нея. С accessKeyId като ключ смяна само на секрета при непроменен
  // access key (MinIO позволява точно това) връщаше стария ключ и всеки
  // подпис ставаше невалиден — при това с подвеждащо съобщение за права
  // и часовник. (Одит, 05.08.2026.)
  const cacheKey = [
    credentials.secretAccessKey,
    dateStamp,
    credentials.region,
    credentials.service,
  ].join("\n");

  const cached = signingKeyCache.get(cacheKey);
  if (cached) return cached;

  // "AWS4" + секретът се хешира като UTF-8 байтове.
  const kDate = createHmac("sha256", "AWS4" + credentials.secretAccessKey)
    .update(dateStamp)
    .digest();
  const kRegion = createHmac("sha256", kDate).update(credentials.region).digest();
  const kService = createHmac("sha256", kRegion)
    .update(credentials.service)
    .digest();
  const key = createHmac("sha256", kService).update("aws4_request").digest();

  if (signingKeyCache.size > 8) signingKeyCache.clear();
  signingKeyCache.set(cacheKey, key);
  return key;
}

function signature(
  credentials: SigV4Credentials,
  amzDate: string,
  canonicalRequest: string,
): { scope: string; signature: string } {
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${credentials.region}/${credentials.service}/aws4_request`;

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    hexSha256(canonicalRequest),
  ].join("\n");

  return {
    scope,
    signature: createHmac("sha256", signingKey(credentials, dateStamp))
      .update(stringToSign)
      .digest("hex"),
  };
}

/** Времето на подписа: "20260805T120000Z", винаги UTC, точно 16 знака. */
export function toAmzDate(when: Date): string {
  return when.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export interface SignQueryInput {
  method: string;
  /** Хостът от endpoint-а, с порт, ако е нестандартен. */
  host: string;
  /**
   * СУРОВИЯТ път — "/bucket/фактура №5.pdf", без каквото и да е
   * кодиране. Подписвачът кодира сам, ЕДНОКРАТНО. Нарочно не се приема
   * URL: конструкторът на URL кодира кирилицата, но не и "$", и всяка
   * реализация върху url.pathname или гърми на кирилица (двойно
   * кодиране), или на "$" (никакво).
   */
  rawPath: string;
  /** Бизнес query параметри (response-content-disposition…), сурови. */
  query?: ReadonlyArray<[string, string]>;
  amzDate: string;
  expiresIn: number;
  credentials: SigV4Credentials;
  /** Headers за подписване ОСВЕН host. За presigned GET — никакви;
   *  за presigned PUT — content-type, за да не качи браузърът друго. */
  headers?: ReadonlyArray<[string, string]>;
  protocol?: "https" | "http";
}

/**
 * Presigned URL: подписът пътува в query-то. Payload hash-ът е буквално
 * UNSIGNED-PAYLOAD — браузърът не може да хешира файла предварително.
 * Връща готовия адрес; валиден е от amzDate до amzDate + expiresIn.
 */
export function signQuery(input: SignQueryInput): string {
  const { credentials, amzDate } = input;

  const headerList: Array<[string, string]> = [
    ["host", input.host],
    ...(input.headers ?? []),
  ];
  const { block, signedNames } = canonicalHeaders(headerList);

  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${credentials.region}/${credentials.service}/aws4_request`;

  const queryPairs: Array<[string, string]> = [
    ...(input.query ?? []),
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${credentials.accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(input.expiresIn)],
    ["X-Amz-SignedHeaders", signedNames],
  ];

  const query = canonicalQuery(queryPairs);
  const path = canonicalUri(input.rawPath);

  const canonicalRequest = [
    input.method,
    path,
    query,
    block,
    signedNames,
    UNSIGNED_PAYLOAD,
  ].join("\n");

  const signed = signature(credentials, amzDate, canonicalRequest);

  // X-Amz-Signature НЕ влиза в canonical query — добавя се чак накрая.
  return `${input.protocol ?? "https"}://${input.host}${path}?${query}&X-Amz-Signature=${signed.signature}`;
}

export interface SignHeadersInput {
  method: string;
  host: string;
  /** Суров, некодиран път — виж бележката при SignQueryInput.rawPath. */
  rawPath: string;
  query?: ReadonlyArray<[string, string]>;
  /** Headers, които ЩЕ се пратят и ЩЕ се подпишат — включително
   *  x-amz-date и x-amz-content-sha256, ако заявката ги носи. host се
   *  добавя оттук, ако липсва. Не подписвай headers, които прокси може
   *  да пренапише (user-agent, accept-encoding). */
  headers: ReadonlyArray<[string, string]>;
  /** hex(sha256(тялото)), EMPTY_SHA256 за празно, или UNSIGNED_PAYLOAD. */
  payloadHash: string;
  amzDate: string;
  credentials: SigV4Credentials;
}

/**
 * Подпис в Authorization header — за сървърните заявки (HEAD/GET/PUT/
 * DELETE). Връща само стойността на Authorization; изпращаните headers
 * са отговорност на извикващия, за да не се разминат подписаното и
 * пратеното.
 */
export function signHeaders(input: SignHeadersInput): string {
  const { credentials, amzDate } = input;

  const hasHost = input.headers.some(([n]) => n.toLowerCase().trim() === "host");
  const headerList: Array<[string, string]> = hasHost
    ? [...input.headers]
    : [["host", input.host], ...input.headers];

  const { block, signedNames } = canonicalHeaders(headerList);
  const query = canonicalQuery([...(input.query ?? [])]);

  const canonicalRequest = [
    input.method,
    canonicalUri(input.rawPath),
    query,
    block,
    signedNames,
    input.payloadHash,
  ].join("\n");

  const signed = signature(credentials, amzDate, canonicalRequest);

  // Точно този формат, с интервал след запетаите — R2 е стриктен.
  return (
    `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${signed.scope}, ` +
    `SignedHeaders=${signedNames}, Signature=${signed.signature}`
  );
}
