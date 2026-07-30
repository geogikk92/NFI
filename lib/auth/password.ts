// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — пароли.
//
// ЗАЩО scrypt, а не bcrypt или argon2:
// bcrypt и argon2 са НОВИ зависимости с нативен код (node-gyp, различни
// бинарни файлове за dev машината и за Vercel). scrypt е ВЪТРЕ в Node
// (node:crypto), стандартизиран е в RFC 7914 и е memory-hard — точно
// свойството, което прави атаката с GPU скъпа. Разликата с argon2id е
// теоретична за нашия случай, а цената на пакет в дървото на
// зависимостите е реална: още един път за одит и още едно нещо, което
// може да не се компилира при deploy.
//
// ФАЙЛЪТ Е САМО ЗА СЪРВЪРА. node:crypto няма в браузъра — клиентски
// компонент, който го внесе, гърми при build. Формата ползва
// lib/auth/register.ts (чист) за имената на полетата, не този файл.

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
// Границите на паролата стоят в register.ts, за да ги вижда и формата:
// клиентски компонент не може да внесе ТОЗИ файл (node:crypto).
import { MAX_PASSWORD_LENGTH } from "./register";

/**
 * Параметрите на scrypt. N е цената, r е блокът, p е паралелизмът.
 *
 * N=16384 (2^14) при r=8 иска 128 · N · r ≈ 16 MiB памет и дава ~80 ms на
 * сървърен процесор. Това е компромисът: достатъчно бавно, за да е масовият
 * подбор безсмислен, достатъчно бързо, за да не се превърне самата форма
 * за вход в начин да ни съборят.
 *
 * Стойностите се ЗАПИСВАТ във всеки хеш (виж формата по-долу), затова
 * могат да се вдигнат по-късно, без старите пароли да станат непроверими.
 */
export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

/** Дължина на извлечения ключ. 64 байта е повече от достатъчно. */
const KEY_LENGTH = 64;

/** Дължина на солта. 16 байта случайност изключват дъгови таблици. */
const SALT_LENGTH = 16;

/**
 * Горна граница на паметта за scrypt. Node отказва да работи, ако
 * 128·N·r надхвърли maxmem, а стойността по подразбиране (32 MiB) е точно
 * на ръба при N=32768 — вдига се предварително, за да не е смяната на N
 * причина за необясним провал.
 */
const MAX_MEMORY = 96 * 1024 * 1024;

/**
 * Версия на СХЕМАТА на записа, не на параметрите.
 *
 * Сменя се само ако се смени самият формат (друг алгоритъм, друго
 * кодиране). Смяната на N/r/p не изисква нова версия — те се четат от
 * самия запис.
 */
const RECORD_VERSION = 1;

/** Разделителят не се среща в base64 — затова е „$", както в /etc/shadow. */
const SEPARATOR = "$";

/**
 * Форматът на записа:
 *
 *   scrypt$v=1$N=16384,r=8,p=1$<сол base64>$<ключ base64>
 *
 * Параметрите пътуват ЗАЕДНО с хеша нарочно. Ако бяха само в кода, вдигането
 * на N щеше да направи всички стари пароли неверни наведнъж и всички
 * клиенти щяха да останат отвън. Така новите пароли се хешират с новите
 * параметри, старите продължават да се проверяват със своите, а
 * `needsRehash` казва кои да се презапишат при следващия успешен вход.
 */
export interface PasswordRecord {
  algorithm: "scrypt";
  version: number;
  params: { N: number; r: number; p: number };
  salt: Buffer;
  hash: Buffer;
}

function scrypt(
  password: string,
  salt: Buffer,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      normalize(password),
      salt,
      KEY_LENGTH,
      { N: params.N, r: params.r, p: params.p, maxmem: MAX_MEMORY },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey);
      },
    );
  });
}

/**
 * Unicode нормализация преди хеширане.
 *
 * „ü" се въвежда или като един знак, или като „u" + комбиниращ умлаут. За
 * човека това е една и съща парола, за байтовете — две различни. Немска
 * или българска парола, въведена на друга клавиатура, иначе просто не
 * работи. Интервалите НЕ се махат: краен интервал може да е нарочен.
 */
function normalize(password: string): string {
  return password.normalize("NFKC");
}

/**
 * Хешира парола с нова случайна сол.
 *
 * Солта е НА ПАРОЛА, не глобална: с обща сол две еднакви пароли дават
 * еднакъв хеш и една пробита разкрива всички останали.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await scrypt(password, salt, SCRYPT_PARAMS);

  return [
    "scrypt",
    `v=${RECORD_VERSION}`,
    `N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}`,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join(SEPARATOR);
}

/**
 * Разчита запис. Връща null при всичко, което не е наш валиден запис —
 * повредена стойност в базата не бива да хвърля изключение в средата на
 * вход, защото това е 500 вместо „грешна парола".
 */
export function parsePasswordRecord(stored: string): PasswordRecord | null {
  if (typeof stored !== "string") return null;

  const parts = stored.split(SEPARATOR);
  if (parts.length !== 5) return null;

  const [algorithm, versionPart, paramsPart, saltPart, hashPart] = parts;
  if (algorithm !== "scrypt") return null;

  const version = Number.parseInt(versionPart.replace(/^v=/, ""), 10);
  if (!Number.isInteger(version) || version < 1) return null;

  const params: Record<string, number> = {};
  for (const entry of paramsPart.split(",")) {
    const [key, rawValue] = entry.split("=");
    const value = Number.parseInt(rawValue ?? "", 10);
    if (!key || !Number.isInteger(value) || value < 1) return null;
    params[key] = value;
  }

  if (!params.N || !params.r || !params.p) return null;

  let salt: Buffer;
  let hash: Buffer;
  try {
    salt = Buffer.from(saltPart, "base64");
    hash = Buffer.from(hashPart, "base64");
  } catch {
    return null;
  }

  // Buffer.from не гърми при невалиден base64 — то мълчаливо реже. Затова
  // празните буфери се отхвърлят изрично: иначе запис „scrypt$v=1$…$$" би
  // минал за валиден и би сравнявал нула байта с нула байта.
  if (salt.length === 0 || hash.length === 0) return null;

  return {
    algorithm: "scrypt",
    version,
    params: { N: params.N, r: params.r, p: params.p },
    salt,
    hash,
  };
}

/**
 * Проверява парола срещу запис.
 *
 * Сравнението е с timingSafeEqual, а не с `===`: обикновеното сравнение на
 * низове излиза при първия различен байт и времето му издава колко от
 * началото е познато. При хеш това е слаба атака, но нищо не струва да я
 * няма.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  // Профил без парола (създаден през OAuth) не се влиза с парола.

  const record = parsePasswordRecord(stored);
  if (!record) return false;

  if (password.length > MAX_PASSWORD_LENGTH) return false;

  let candidate: Buffer;
  try {
    candidate = await scrypt(password, record.salt, record.params);
  } catch {
    // Невъзможни параметри в записа (например N над maxmem) — не е вход.
    return false;
  }

  // timingSafeEqual хвърля при различна дължина, а дължината и без това не
  // е тайна. Проверява се предварително.
  if (candidate.length !== record.hash.length) return false;

  return timingSafeEqual(candidate, record.hash);
}

/**
 * Трябва ли паролата да се презапише с днешните параметри.
 *
 * Ползва се СЛЕД успешен вход, когато чистата парола е в ръцете ни за
 * последен път: `if (needsRehash(user.passwordHash)) → hashPassword`.
 * Така вдигането на N постепенно обхваща всички, без нито един принудителен
 * ресет.
 */
export function needsRehash(stored: string | null | undefined): boolean {
  if (!stored) return false;

  const record = parsePasswordRecord(stored);
  if (!record) return true;

  return (
    record.version !== RECORD_VERSION ||
    record.params.N !== SCRYPT_PARAMS.N ||
    record.params.r !== SCRYPT_PARAMS.r ||
    record.params.p !== SCRYPT_PARAMS.p ||
    record.hash.length !== KEY_LENGTH
  );
}

/**
 * Изравнява времето при НЕСЪЩЕСТВУВАЩ имейл.
 *
 * Без това входът отговаря веднага, когато профил няма, и след ~80 ms,
 * когато има — и формата за вход се превръща в справка кой е клиент на
 * института. Затова при липсващ потребител се хешира срещу изхвърлен
 * запис и се връща false.
 *
 * Записът се прави при първата нужда и се пази: константа в кода би била
 * хеш на позната стойност, а изчисляване при импорт би искало 80 ms от
 * всяко студено стартиране.
 */
let throwawayRecord: string | null = null;

export async function verifyAgainstNothing(password: string): Promise<false> {
  if (!throwawayRecord) {
    throwawayRecord = await hashPassword(randomBytes(32).toString("hex"));
  }
  await verifyPassword(password, throwawayRecord);
  return false;
}
