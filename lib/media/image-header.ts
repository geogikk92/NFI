// ТЕРИТОРИЯ НА БОБИ · задача 17m-b — четене на заглавката на изображение.
//
// ЧИСТ модул, нула зависимости. Две задачи:
//
//   • readImageHeader: разпознава PNG/JPEG/WebP по МАГИЧЕСКИ БАЙТОВЕ и
//     чете широчина/височина от заглавката. На декларирания от клиента
//     mimeType не се вярва — той е поле във формуляр, а „media" е
//     публично четим scope. width/height са задължителни за next/image
//     без изместване на съдържанието (CLS) и живеят в Media.width/height.
//   • stripJpegMetadata: маха EXIF (APP1) и ICC (APP2) сегментите.
//     СЪРВЪРНО, не само в браузъра — това е гаранцията, която важи и
//     при изключен JavaScript: GPS координатите от телефона на
//     клиентката не бива да влизат в публично четим bucket.
//
// Всичко извън трите формата (HEIC, AVIF, SVG, GIF) → null, нарочно:
//   • HEIC/AVIF искат обход на ISOBMFF кутии с pitm/ipma съответствия —
//     и точно телефонните файлове (с миниатюра, алфа, мозайка) са
//     случаят, в който наивният обход връща РАЗМЕРА НА МИНИАТЮРАТА.
//   • SVG е XSS вектор (вграден <script>), а next/image и без това го
//     отказва с 400 при подразбиращото се dangerouslyAllowSVG: false.
//   • GIF не трябва на учебен сайт, а анимиран GIF next/image пропуска
//     неоптимизиран.
// Отказът с ясно съобщение („запиши като JPEG") маха 90% от сложността.
//
// sharp НЕ се ползва: резолвва се само като optional зависимост на next
// (фантомна — чупи се при npm ci --omit=optional), носи 15+ MB нативен
// код в лямбдата, а нуждата тук е 24 байта от PNG заглавка.

export interface ImageHeader {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
}

/**
 * Таван на страна. Не е естетика: широчината/височината влизат в
 * атрибути и в сметки за sizes — злонамерена заглавка с uint32 стойност
 * не бива да се превръща в „легитимни" 4 милиарда пиксела.
 */
const MAX_DIMENSION = 20000;

function validDimensions(width: number, height: number): boolean {
  return (
    width > 0 && height > 0 && width <= MAX_DIMENSION && height <= MAX_DIMENSION
  );
}

function u32be(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>>
    0
  );
}

function u16be(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 8) | bytes[at + 1];
}

function u16le(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8);
}

function u24le(bytes: Uint8Array, at: number): number {
  return bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(at, at + length));
}

// ── PNG ──────────────────────────────────────────────────────────────────

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readPng(bytes: Uint8Array): ImageHeader | null {
  if (bytes.length < 24) return null;
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null;

  // Обход на чънкове, НЕ фиксирано отместване 16/20: iPhone-оптимизиран
  // PNG (CgBI) слага свой чънк ПРЕДИ IHDR и фиксираните отмествания
  // четат боклук. Чънк: 4 байта дължина + 4 типа + данни + 4 CRC.
  let at = 8;
  while (at + 8 <= bytes.length) {
    const length = u32be(bytes, at);
    const type = ascii(bytes, at + 4, 4);

    if (type === "IHDR") {
      if (at + 16 > bytes.length) return null;
      const width = u32be(bytes, at + 8);
      const height = u32be(bytes, at + 12);
      return validDimensions(width, height)
        ? { mimeType: "image/png", width, height }
        : null;
    }

    at += 12 + length;
  }

  return null;
}

// ── JPEG ─────────────────────────────────────────────────────────────────

/** SOFn маркери: C0–CF без C4 (DHT), C8 (JPG ext) и CC (DAC). */
function isSofMarker(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

/**
 * Обхожда JPEG ПО ДЪЛЖИНИ на сегментите. Не „намери първия FF C0":
 * EXIF (APP1) може да носи ВГРАДЕНА миниатюра със свой SOF и наивното
 * сканиране връща размера на миниатюрата — 16×9 вместо 1234×567.
 * Обходът спира на SOS (FFDA): нататък е entropy-coded поток, в който
 * всяко сканиране лъже.
 */
function readJpeg(bytes: Uint8Array): ImageHeader | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let at = 2;
  while (at + 4 <= bytes.length) {
    // Пълнежни FF байтове преди маркера са допустими.
    if (bytes[at] !== 0xff) return null;
    while (at < bytes.length && bytes[at + 1] === 0xff) at += 1;

    const marker = bytes[at + 1];

    // Маркери без дължина: RSTn, SOI. EOI/SOS слагат край на търсенето.
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2;
      continue;
    }

    const length = u16be(bytes, at + 2);
    if (length < 2) return null;

    if (isSofMarker(marker)) {
      if (at + 9 > bytes.length) return null;
      const height = u16be(bytes, at + 5);
      const width = u16be(bytes, at + 7);
      return validDimensions(width, height)
        ? { mimeType: "image/jpeg", width, height }
        : null;
    }

    at += 2 + length;
  }

  return null;
}

/**
 * Маха APP1 (EXIF: GPS, серийни номера, миниатюра) и APP2 (ICC) от
 * JPEG. Останалите сегменти минават непокътнати — размерите и самата
 * картина не се пипат, затова функцията е идемпотентна.
 *
 * Връща ВХОДА непроменен, ако файлът не е JPEG: PNG и WebP от
 * телефона минават през прекодиране в браузъра (canvas), което и без
 * това не пренася метаданни, а PNG, качен директно, няма EXIF в 99% от
 * случаите — за останалия 1% не си струва парсер на PNG чънкове тук.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;

  const kept: Uint8Array[] = [bytes.subarray(0, 2)];
  let at = 2;

  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) break;

    const marker = bytes[at + 1];

    // От SOS нататък е потокът с данните — копира се до края.
    if (marker === 0xda) {
      kept.push(bytes.subarray(at));
      at = bytes.length;
      break;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      kept.push(bytes.subarray(at, at + 2));
      at += 2;
      continue;
    }

    const length = u16be(bytes, at + 2);
    if (length < 2) break;
    const end = at + 2 + length;

    // APP1 = FFE1 (EXIF/XMP), APP2 = FFE2 (ICC). Всичко друго остава.
    if (marker !== 0xe1 && marker !== 0xe2) {
      kept.push(bytes.subarray(at, Math.min(end, bytes.length)));
    }

    at = end;
  }

  // Недовършен файл: остатъкът се пренася, за да не режем тихо байтове.
  if (at < bytes.length) kept.push(bytes.subarray(at));

  const total = kept.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of kept) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// ── WebP ─────────────────────────────────────────────────────────────────

/**
 * WebP: RIFF контейнер с три подформата. ВСИЧКО тук е little-endian —
 * обратно на PNG/JPEG. VP8X не е екзотика: всяко webp с алфа, ICC или
 * анимация е VP8X, тоест това е обичайният случай за качени файлове.
 */
function readWebp(bytes: Uint8Array): ImageHeader | null {
  // Проверката за дължина е ПО ПОДФОРМАТ: най-късият валиден VP8L е
  // 26 байта и общ праг от 30 тихо би го отказвал.
  if (bytes.length < 25) return null;
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;

  // FourCC „VP8 " е с интервал накрая — сравнение с „VP8" би хванало и
  // VP8L/VP8X и би чело грешни отмествания.
  const fourCc = ascii(bytes, 12, 4);

  if (fourCc === "VP8 ") {
    // Lossy: sync код 9D 01 2A на 23–25, размерите след него, долни 14 бита.
    if (bytes.length < 30) return null;
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    const width = u16le(bytes, 26) & 0x3fff;
    const height = u16le(bytes, 28) & 0x3fff;
    return validDimensions(width, height)
      ? { mimeType: "image/webp", width, height }
      : null;
  }

  if (fourCc === "VP8L") {
    // Lossless: сигнатура 0x2F, после битово поле (little-endian).
    // Записва се width−1 — пропуснатото +1 дава тихо грешен размер с
    // един пиксел, който не се хваща на око.
    if (bytes[20] !== 0x2f) return null;
    const le =
      bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    const width = (le & 0x3fff) + 1;
    const height = ((le >> 14) & 0x3fff) + 1;
    return validDimensions(width, height)
      ? { mimeType: "image/webp", width, height }
      : null;
  }

  if (fourCc === "VP8X") {
    // Extended: размер на КАНВАТА като uint24, записан минус едно.
    if (bytes.length < 30) return null;
    const width = u24le(bytes, 24) + 1;
    const height = u24le(bytes, 27) + 1;
    return validDimensions(width, height)
      ? { mimeType: "image/webp", width, height }
      : null;
  }

  return null;
}

// ── Общият вход ──────────────────────────────────────────────────────────

/**
 * Разпознава формата по съдържанието и чете размерите. null значи
 * „не е от приетите формати или заглавката е повредена" — извикващият
 * решава какво да каже на човека.
 */
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  return readPng(bytes) ?? readJpeg(bytes) ?? readWebp(bytes);
}
