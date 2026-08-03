// ТЕРИТОРИЯ НА БОБИ · задача 17m — локалният драйвер на хранилището.
//
// Файловата система на машината, под uploads/ (в .gitignore). Това е
// драйверът за РАЗРАБОТКА: дава работещ цикъл качване → сваляне без
// external акаунт. Продукцията ще говори с S3/R2 през отделен драйвер —
// когато ключовете съществуват (виж docs/ДЕПЛОЙ.md, „По-късно").
//
// Подписаните URL-и са истински и тук: HMAC върху ключ+срок+име, проверен
// от app/api/storage/route.ts. Така кодът, който КОНСУМИРА хранилището
// (свалянето на материали, файловете на продуктите), се държи еднакво в
// dev и в продукция — сменя се само драйверът отдолу.

import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageObject } from "./index";

/** Къде живеят файловете. Тестовете го местят в tmp през UPLOADS_DIR. */
function rootDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

/**
 * Тайната за подписите. В продукция ЗАДЪЛЖИТЕЛНО идва от средата —
 * константата по-долу е само за локална машина, където заплахата е нула,
 * а изискването за env променлива би било още едно стъпало преди първия
 * `npm run dev`.
 */
function secret(): string {
  const fromEnv = process.env.STORAGE_SECRET ?? process.env.AUTH_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Подписаните линкове искат STORAGE_SECRET (или AUTH_SECRET) в продукция.",
    );
  }
  return "nfi-dev-storage-secret";
}

/**
 * Ключът е път ВЪТРЕ в хранилището, никога извън него.
 *
 * Отхвърля се всичко извън [a-z0-9/_.-]: не защото друго не може да се
 * кодира, а защото ключовете ги правим НИЕ (slug + суфикс) и всичко
 * извън този азбучен минимум е знак за манипулиран вход.
 */
export function isSafeKey(key: string): boolean {
  if (key.length === 0 || key.length > 300) return false;
  if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key)) return false;
  // ".." се лови и от resolve проверката долу, но ранният отказ прави
  // намерението четимо.
  return !key.split("/").some((part) => part === ".." || part === "");
}

function resolveInsideRoot(key: string): string {
  const root = path.resolve(rootDir());
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) {
    throw new Error(`Ключът излиза извън хранилището: ${key}`);
  }
  return full;
}

interface SidecarMeta {
  mimeType: string;
  sizeBytes: number;
  checksum: string;
}

/** Метаданните стоят до файла: <key>.meta.json. */
function metaPath(fullPath: string): string {
  return `${fullPath}.meta.json`;
}

export async function localPut(
  key: string,
  body: Uint8Array,
  mimeType: string,
): Promise<StorageObject> {
  if (!isSafeKey(key)) throw new Error(`Невалиден ключ: ${key}`);

  const full = resolveInsideRoot(key);
  await mkdir(path.dirname(full), { recursive: true });

  const checksum = createHash("sha256").update(body).digest("hex");
  const meta: SidecarMeta = { mimeType, sizeBytes: body.length, checksum };

  await writeFile(full, body);
  await writeFile(metaPath(full), JSON.stringify(meta));

  return { key, sizeBytes: body.length, mimeType, checksum };
}

export async function localHead(key: string): Promise<StorageObject | null> {
  if (!isSafeKey(key)) return null;

  const full = resolveInsideRoot(key);

  try {
    const [fileStat, rawMeta] = await Promise.all([
      stat(full),
      readFile(metaPath(full), "utf8").catch(() => null),
    ]);

    const meta = rawMeta ? (JSON.parse(rawMeta) as SidecarMeta) : null;

    return {
      key,
      sizeBytes: fileStat.size,
      // Файл без sidecar (сложен на ръка в uploads/) пак се сервира —
      // browser-ите се оправят с octet-stream, а PDF-ите се разпознават.
      mimeType: meta?.mimeType ?? "application/octet-stream",
      checksum: meta?.checksum,
    };
  } catch {
    return null;
  }
}

export async function localRead(
  key: string,
): Promise<{ body: Buffer; mimeType: string } | null> {
  const head = await localHead(key);
  if (!head) return null;

  try {
    const body = await readFile(resolveInsideRoot(key));
    return { body, mimeType: head.mimeType };
  } catch {
    return null;
  }
}

export async function localRemove(key: string): Promise<boolean> {
  if (!isSafeKey(key)) return true;

  const full = resolveInsideRoot(key);
  // force: липсващият файл не е грешка — целта „да го няма" е постигната.
  await rm(full, { force: true });
  await rm(metaPath(full), { force: true });
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
//  Подписани URL-и
// ─────────────────────────────────────────────────────────────────────────

function signature(key: string, expiresAt: number, downloadAs: string): string {
  return createHmac("sha256", secret())
    .update(`${key}\n${expiresAt}\n${downloadAs}`)
    .digest("base64url");
}

export function localSignedPath(
  key: string,
  expiresInSeconds: number,
  downloadAs: string = "",
): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const sig = signature(key, expiresAt, downloadAs);

  const params = new URLSearchParams({ key, exp: String(expiresAt), sig });
  if (downloadAs) params.set("dl", downloadAs);

  return `/api/storage?${params.toString()}`;
}

/** Проверява подписа. Връща ключа само ако всичко е наред. */
export function verifySignedParams(params: {
  key: string | null;
  exp: string | null;
  sig: string | null;
  dl: string | null;
}): { key: string; downloadAs: string | null } | null {
  const { key, exp, sig } = params;
  if (!key || !exp || !sig || !isSafeKey(key)) return null;

  const expiresAt = Number.parseInt(exp, 10);
  if (!Number.isFinite(expiresAt)) return null;
  if (expiresAt * 1000 < Date.now()) return null;

  const expected = signature(key, expiresAt, params.dl ?? "");

  // Сравнение с постоянно време — иначе по разликата в отговора може да
  // се налучква байт по байт.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { key, downloadAs: params.dl };
}
