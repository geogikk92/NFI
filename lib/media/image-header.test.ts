// Четенето на заглавки — фикстурите се СГЛОБЯВАТ в паметта.
//
// Никакви бинарни файлове в репото: всеки тест строи минимален валиден
// файл байт по байт, така че се вижда ТОЧНО кое свойство се проверява —
// CgBI чънк преди IHDR, вградена миниатюра в EXIF, изместването −1 на
// VP8L. Капаните идват от доклада на разузнаването (одит 05.08.2026),
// всеки е възпроизведен като фикстура.

import { describe, expect, it } from "vitest";
import { readImageHeader, stripJpegMetadata } from "./image-header";

// ── Строители на фикстури ────────────────────────────────────────────────

function bytes(...parts: Array<number[] | Uint8Array>): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

function u32be(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function u16be(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function u16le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function u24le(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff];
}

function fourCc(text: string): number[] {
  return [...text].map((ch) => ch.charCodeAt(0));
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG чънк: дължина + тип + данни + фалшив CRC (парсерът не го проверява). */
function pngChunk(type: string, data: number[]): number[] {
  return [...u32be(data.length), ...fourCc(type), ...data, 0, 0, 0, 0];
}

function pngIhdr(width: number, height: number): number[] {
  // width, height, bit depth 8, color type 6, compression 0, filter 0, interlace 0.
  return pngChunk("IHDR", [...u32be(width), ...u32be(height), 8, 6, 0, 0, 0]);
}

/** JPEG сегмент: FF маркер + дължина (включваща своите 2 байта) + данни. */
function jpegSegment(marker: number, data: number[]): number[] {
  return [0xff, marker, ...u16be(data.length + 2), ...data];
}

/** SOF0 тяло: precision + height + width + 3 компонента. */
function sofBody(width: number, height: number): number[] {
  return [8, ...u16be(height), ...u16be(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
}

function minimalJpeg(width: number, height: number, extraSegments: number[] = []): Uint8Array {
  return bytes(
    [0xff, 0xd8], // SOI
    extraSegments,
    jpegSegment(0xdb, new Array(65).fill(1)), // DQT
    jpegSegment(0xc0, sofBody(width, height)), // SOF0
    jpegSegment(0xda, [1, 1, 0, 0, 63, 0]), // SOS
    [0x12, 0x34, 0xff, 0xd9], // поток + EOI
  );
}

// ── PNG ──────────────────────────────────────────────────────────────────

describe("PNG", () => {
  it("чете размерите от IHDR", () => {
    const png = bytes(PNG_SIG, pngIhdr(1234, 567));
    expect(readImageHeader(png)).toEqual({
      mimeType: "image/png",
      width: 1234,
      height: 567,
    });
  });

  it("прескача CgBI чънка на iPhone преди IHDR", () => {
    // Фиксирани отмествания 16/20 тук четат боклук — обходът по
    // чънкове е причината тестът да минава.
    const png = bytes(PNG_SIG, pngChunk("CgBI", [0, 0, 0, 0]), pngIhdr(320, 480));
    expect(readImageHeader(png)).toEqual({
      mimeType: "image/png",
      width: 320,
      height: 480,
    });
  });

  it("отказва нулев размер и размер над тавана", () => {
    expect(readImageHeader(bytes(PNG_SIG, pngIhdr(0, 100)))).toBeNull();
    expect(readImageHeader(bytes(PNG_SIG, pngIhdr(25000, 100)))).toBeNull();
  });
});

// ── JPEG ─────────────────────────────────────────────────────────────────

describe("JPEG", () => {
  it("чете размерите от SOF0", () => {
    expect(readImageHeader(minimalJpeg(1234, 567))).toEqual({
      mimeType: "image/jpeg",
      width: 1234,
      height: 567,
    });
  });

  it("НЕ се хваща на вградената миниатюра в EXIF", () => {
    // APP1 сегмент, съдържащ ЦЯЛО мини-JPEG (16×9) със свой SOF0.
    // Наивното „намери първия FF C0" връща 16×9; обходът по дължини
    // прескача APP1 като непрозрачен блок и стига до истинския SOF.
    const thumbnail = [...minimalJpeg(16, 9)];
    const exif = jpegSegment(0xe1, [...fourCc("Exif"), 0, 0, ...thumbnail]);
    expect(readImageHeader(minimalJpeg(1234, 567, exif))).toEqual({
      mimeType: "image/jpeg",
      width: 1234,
      height: 567,
    });
  });

  it("чете progressive JPEG (SOF2)", () => {
    const progressive = bytes(
      [0xff, 0xd8],
      jpegSegment(0xc2, sofBody(800, 600)),
      jpegSegment(0xda, [1, 1, 0, 0, 63, 0]),
      [0xff, 0xd9],
    );
    expect(readImageHeader(progressive)).toEqual({
      mimeType: "image/jpeg",
      width: 800,
      height: 600,
    });
  });

  it("не бърка DHT (C4) със SOF", () => {
    const jpeg = bytes(
      [0xff, 0xd8],
      jpegSegment(0xc4, new Array(20).fill(0)), // DHT — не е SOF
      jpegSegment(0xc0, sofBody(50, 40)),
      jpegSegment(0xda, [1, 1, 0, 0, 63, 0]),
    );
    expect(readImageHeader(jpeg)).toEqual({
      mimeType: "image/jpeg",
      width: 50,
      height: 40,
    });
  });
});

describe("stripJpegMetadata", () => {
  it("маха APP1 и APP2, а размерите остават четими", () => {
    const exif = jpegSegment(0xe1, [...fourCc("Exif"), 0, 0, 1, 2, 3]);
    const icc = jpegSegment(0xe2, [...fourCc("ICC_"), 9, 9]);
    const original = minimalJpeg(1234, 567, [...exif, ...icc]);

    const cleaned = stripJpegMetadata(original);

    expect(cleaned.length).toBe(original.length - exif.length - icc.length);
    // EXIF маркерът е изчезнал…
    expect(findSegment(cleaned, 0xe1)).toBe(false);
    expect(findSegment(cleaned, 0xe2)).toBe(false);
    // …а картината е същата.
    expect(readImageHeader(cleaned)).toEqual({
      mimeType: "image/jpeg",
      width: 1234,
      height: 567,
    });
  });

  it("е идемпотентна: второ пускане не променя нищо", () => {
    const cleaned = stripJpegMetadata(
      minimalJpeg(100, 50, jpegSegment(0xe1, [...fourCc("Exif"), 0, 0])),
    );
    expect(stripJpegMetadata(cleaned)).toEqual(cleaned);
  });

  it("връща не-JPEG вход непроменен", () => {
    const png = bytes(PNG_SIG, pngIhdr(10, 10));
    expect(stripJpegMetadata(png)).toBe(png);
  });

  /** Има ли сегмент с този маркер ПРЕДИ SOS — след SOS е поток, не сегменти. */
  function findSegment(jpeg: Uint8Array, marker: number): boolean {
    let at = 2;
    while (at + 4 <= jpeg.length && jpeg[at] === 0xff) {
      if (jpeg[at + 1] === marker) return true;
      if (jpeg[at + 1] === 0xda) return false;
      at += 2 + ((jpeg[at + 2] << 8) | jpeg[at + 3]);
    }
    return false;
  }
});

// ── WebP ─────────────────────────────────────────────────────────────────

function riff(chunk: number[]): Uint8Array {
  const size = chunk.length + 4; // + "WEBP"
  return bytes(
    fourCc("RIFF"),
    [size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, 0],
    fourCc("WEBP"),
    chunk,
  );
}

describe("WebP", () => {
  it("VP8 (lossy): sync код + долни 14 бита", () => {
    const vp8 = riff([
      ...fourCc("VP8 "),
      ...u32be(12).reverse(), // размер на чънка, LE
      0, 0, 0, // frame tag
      0x9d, 0x01, 0x2a, // sync
      ...u16le(1234),
      ...u16le(567),
      0,
    ]);
    expect(readImageHeader(vp8)).toEqual({
      mimeType: "image/webp",
      width: 1234,
      height: 567,
    });
  });

  it("VP8L (lossless): изместването −1", () => {
    // Битово поле: width-1 в долните 14, height-1 в следващите 14.
    const w = 1234 - 1;
    const h = 567 - 1;
    const packed = (w | (h << 14)) >>> 0;
    const vp8l = riff([
      ...fourCc("VP8L"),
      ...u32be(10).reverse(),
      0x2f,
      packed & 0xff,
      (packed >> 8) & 0xff,
      (packed >> 16) & 0xff,
      (packed >> 24) & 0xff,
      0,
    ]);
    expect(readImageHeader(vp8l)).toEqual({
      mimeType: "image/webp",
      width: 1234,
      height: 567,
    });
  });

  it("VP8X (extended — обичайният случай при алфа/ICC): uint24 − 1", () => {
    const vp8x = riff([
      ...fourCc("VP8X"),
      ...u32be(10).reverse(),
      0x10, // флаг: има алфа
      0, 0, 0,
      ...u24le(321 - 1),
      ...u24le(222 - 1),
    ]);
    expect(readImageHeader(vp8x)).toEqual({
      mimeType: "image/webp",
      width: 321,
      height: 222,
    });
  });

  it("отказва VP8 без sync код", () => {
    const broken = riff([
      ...fourCc("VP8 "),
      ...u32be(12).reverse(),
      0, 0, 0,
      0xff, 0xff, 0xff, // грешен sync
      ...u16le(10),
      ...u16le(10),
      0,
    ]);
    expect(readImageHeader(broken)).toBeNull();
  });
});

// ── Отказаните формати ───────────────────────────────────────────────────

describe("отказани формати → null", () => {
  it("GIF", () => {
    expect(
      readImageHeader(bytes(fourCc("GIF89a"), u16le(100), u16le(50), [0, 0, 0])),
    ).toBeNull();
  });

  it("HEIC (ftyp кутия)", () => {
    expect(
      readImageHeader(
        bytes(u32be(24), fourCc("ftyp"), fourCc("heic"), new Array(12).fill(0)),
      ),
    ).toBeNull();
  });

  it("SVG (текст)", () => {
    expect(
      readImageHeader(new TextEncoder().encode('<svg width="10" height="10"/>')),
    ).toBeNull();
  });

  it("празен и отрязан вход", () => {
    expect(readImageHeader(new Uint8Array(0))).toBeNull();
    expect(readImageHeader(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(readImageHeader(bytes(PNG_SIG))).toBeNull();
  });
});
