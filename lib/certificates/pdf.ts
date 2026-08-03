import "server-only";

// ТЕРИТОРИЯ НА БОБИ · задача 16 — рисуването на сертификата.
//
// PDF-ът се строи с pdf-lib + fontkit и ВГРАДЕНИ шрифтове (assets/fonts/):
// стандартните 14 PDF шрифта нямат кирилица, а името на курсиста е
// най-важният ред на документа. Шрифтовете са същите като на сайта
// (Oswald за заглавия, Inter за текст) — сертификатът е страница от
// същата марка, не чужд документ.
//
// Дизайнът следва „Der rote Faden": flagline лента горе, червена нишка
// отляво, много бяло, никакви рамки-виньетки от шаблон за грамоти.
// Всичко е ляво подравнено като сайта; печатът с нивото е единственият
// „игрив" елемент — леко завъртян, като ударен на ръка.

import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, degrees, rgb } from "pdf-lib";
import type { CertificateLevel } from "./certificates";

export interface CertificatePdfInput {
  number: string;
  verifyCode: string;
  /** Пълният адрес за проверка — идва отвън, тук не се знае домейнът. */
  verifyUrl: string;
  holderName: string;
  courseTitleDe: string;
  courseTitleBg: string;
  level: CertificateLevel;
  issuedAt: Date;
}

// ── Цветовете на марката — същите шестнайсетични като в globals.css ──
const INK = rgb(22 / 255, 19 / 255, 15 / 255);
const RED = rgb(193 / 255, 31 / 255, 47 / 255);
const GOLD = rgb(185 / 255, 138 / 255, 43 / 255);
const GREEN = rgb(47 / 255, 125 / 255, 91 / 255);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.42, 0.4, 0.38);

// A4 пейзаж. Пейзаж, защото сертификатът се гледа на екран и се закача
// в рамка — портретът е за писма.
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 64;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// ─────────────────────────────────────────────────────────────────────────
//  Шрифтове — четат се от диска веднъж на процес
// ─────────────────────────────────────────────────────────────────────────

interface FontFiles {
  oswaldMedium: Uint8Array;
  oswaldSemiBold: Uint8Array;
  interRegular: Uint8Array;
  interSemiBold: Uint8Array;
}

let fontFilesPromise: Promise<FontFiles> | null = null;

function loadFontFiles(): Promise<FontFiles> {
  if (!fontFilesPromise) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    fontFilesPromise = (async () => ({
      oswaldMedium: await readFile(path.join(dir, "Oswald-Medium.ttf")),
      oswaldSemiBold: await readFile(path.join(dir, "Oswald-SemiBold.ttf")),
      interRegular: await readFile(path.join(dir, "Inter-Regular.ttf")),
      interSemiBold: await readFile(path.join(dir, "Inter-SemiBold.ttf")),
    }))().catch((error) => {
      // Провалът не се кешира — иначе един липсващ файл при deploy маркира
      // процеса завинаги, дори файлът да се появи.
      fontFilesPromise = null;
      throw error;
    });
  }
  return fontFilesPromise;
}

// ─────────────────────────────────────────────────────────────────────────
//  Дребни помощници за текст
// ─────────────────────────────────────────────────────────────────────────

/**
 * Разредка между буквите (letter-spacing). pdf-lib няма такава опция,
 * затова знаците се рисуват един по един. Ползва се пестеливо — само за
 * двата „kicker" реда, където разредката е част от дизайна на сайта.
 */
function drawTracked(
  page: PDFPage,
  text: string,
  options: {
    x: number;
    y: number;
    font: PDFFont;
    size: number;
    color: ReturnType<typeof rgb>;
    tracking: number;
  },
): number {
  let x = options.x;
  for (const char of text) {
    page.drawText(char, {
      x,
      y: options.y,
      font: options.font,
      size: options.size,
      color: options.color,
    });
    x += options.font.widthOfTextAtSize(char, options.size) + options.tracking;
  }
  return x - options.tracking;
}

/** Свива размера, докато текстът се събере — дълго име не чупи реда. */
function fitSize(
  font: PDFFont,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
): number {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

/** Прост пренос по думи. Дума, по-дълга от реда, си остава на своя ред. */
function wrapText(
  font: PDFFont,
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────
//  Елементите на дизайна
// ─────────────────────────────────────────────────────────────────────────

/** Лентата на марката: DE (черно·червено·злато) → BG (бяло·зелено·червено). */
function drawFlagline(page: PDFPage, x: number, y: number, width: number) {
  const colors = [INK, RED, GOLD, WHITE, GREEN, RED];
  const seg = width / colors.length;

  for (let i = 0; i < colors.length; i += 1) {
    page.drawRectangle({
      x: x + i * seg,
      y,
      width: seg,
      height: 4,
      color: colors[i],
    });
  }

  // Тънка мастилена рамка, за да не се разтвори бялото стъпало в листа —
  // същото прави box-shadow-ът на .flagline в globals.css.
  page.drawRectangle({
    x,
    y,
    width,
    height: 4,
    borderColor: INK,
    borderWidth: 0.5,
    opacity: 0,
    borderOpacity: 0.18,
  });
}

/** Печатът с нивото: два червени кръга и текст, леко завъртени. */
function drawLevelStamp(
  page: PDFPage,
  fonts: { oswald: PDFFont; inter: PDFFont },
  level: CertificateLevel,
  cx: number,
  cy: number,
) {
  const TILT = -8; // градуса — „ударен на ръка", не изравнен от машина
  const rad = (TILT * Math.PI) / 180;

  /** Точка на отместване (dx, dy) от центъра, завъртяна на ъгъла на печата. */
  const at = (dx: number, dy: number) => ({
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  });

  page.drawCircle({
    x: cx,
    y: cy,
    size: 56,
    borderColor: RED,
    borderWidth: 1.6,
    opacity: 0,
    borderOpacity: 1,
  });
  page.drawCircle({
    x: cx,
    y: cy,
    size: 50,
    borderColor: RED,
    borderWidth: 0.6,
    opacity: 0,
    borderOpacity: 1,
  });

  const levelSize = 34;
  const levelWidth = fonts.oswald.widthOfTextAtSize(level, levelSize);
  const levelPos = at(-levelWidth / 2, -12);
  page.drawText(level, {
    x: levelPos.x,
    y: levelPos.y,
    font: fonts.oswald,
    size: levelSize,
    color: RED,
    rotate: degrees(TILT),
  });

  const topLabel = "NIVEAU";
  const topSize = 8.5;
  const topWidth = fonts.inter.widthOfTextAtSize(topLabel, topSize);
  const topPos = at(-topWidth / 2, 28);
  page.drawText(topLabel, {
    x: topPos.x,
    y: topPos.y,
    font: fonts.inter,
    size: topSize,
    color: RED,
    rotate: degrees(TILT),
  });

  const bottomLabel = "GER · CEFR";
  const bottomSize = 7.5;
  const bottomWidth = fonts.inter.widthOfTextAtSize(bottomLabel, bottomSize);
  const bottomPos = at(-bottomWidth / 2, -34);
  page.drawText(bottomLabel, {
    x: bottomPos.x,
    y: bottomPos.y,
    font: fonts.inter,
    size: bottomSize,
    color: RED,
    rotate: degrees(TILT),
  });
}

/** Колонка в долния ред: етикет с разредка, стойност отдолу. */
function drawFooterColumn(
  page: PDFPage,
  fonts: { label: PDFFont; value: PDFFont },
  x: number,
  label: string,
  value: string,
  valueMaxWidth: number,
) {
  drawTracked(page, label, {
    x,
    y: 118,
    font: fonts.label,
    size: 7,
    color: MUTED,
    tracking: 0.8,
  });

  const size = fitSize(fonts.value, value, valueMaxWidth, 10.5, 7);
  page.drawText(value, {
    x,
    y: 103,
    font: fonts.value,
    size,
    color: INK,
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  Самият документ
// ─────────────────────────────────────────────────────────────────────────

/** Дата като в немски документ: „03.08.2026" — четима и на трите езика. */
function formatStampDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Sofia",
  }).format(date);
}

export async function renderCertificatePdf(
  input: CertificatePdfInput,
): Promise<Uint8Array> {
  const files = await loadFontFiles();

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Oswald влиза със subset (само използваните глифи). Inter — ЦЕЛИЯТ:
  // subset-ването на pdf-lib поврежда точно този шрифт — половината глифи
  // излизат празни в macOS Preview (проверено с очи, 03.08.2026). Цената е
  // ~330 КБ на файл; повреден сертификат няма цена, на която да е евтин.
  const oswaldMedium = await doc.embedFont(files.oswaldMedium, { subset: true });
  const oswaldSemiBold = await doc.embedFont(files.oswaldSemiBold, {
    subset: true,
  });
  const interRegular = await doc.embedFont(files.interRegular);
  const interSemiBold = await doc.embedFont(files.interSemiBold);

  doc.setTitle(`Zertifikat ${input.number} — ${input.holderName}`);
  doc.setAuthor("Nürnberger Fremdsprachen Institut");
  doc.setSubject(
    `Deutschkurs „${input.courseTitleDe}“ — Niveau ${input.level} (GER)`,
  );
  doc.setCreator("NFI · сертификати (задача 16)");
  doc.setLanguage("de");
  doc.setCreationDate(input.issuedAt);
  doc.setModificationDate(input.issuedAt);

  const page = doc.addPage([PAGE_W, PAGE_H]);

  // ── Горе: лентата на марката и името на института ──
  drawFlagline(page, MARGIN, PAGE_H - 60, CONTENT_W);

  drawTracked(page, "NÜRNBERGER FREMDSPRACHEN INSTITUT", {
    x: MARGIN,
    y: PAGE_H - 92,
    font: oswaldMedium,
    size: 11,
    color: INK,
    tracking: 2.4,
  });

  // ── Червената нишка: свързва заглавието с подписа ──
  page.drawLine({
    start: { x: MARGIN - 20, y: PAGE_H - 60 },
    end: { x: MARGIN - 20, y: 96 },
    thickness: 2,
    color: RED,
  });

  // ── Заглавие ──
  page.drawText("ZERTIFIKAT", {
    x: MARGIN,
    y: PAGE_H - 168,
    font: oswaldSemiBold,
    size: 58,
    color: INK,
  });

  drawTracked(page, "СЕРТИФИКАТ ЗА ЗАВЪРШЕН ЕЗИКОВ КУРС", {
    x: MARGIN,
    y: PAGE_H - 190,
    font: interRegular,
    size: 9,
    color: MUTED,
    tracking: 1.6,
  });

  // Печатът стои вдясно от тялото — текстът не бива да минава под него.
  const stampCx = PAGE_W - MARGIN - 92;
  const stampCy = 320;
  const bodyMaxWidth = stampCx - 56 - 24 - MARGIN;

  // ── Тяло: немският води, българският потвърждава ──
  page.drawText("Hiermit wird bestätigt, dass", {
    x: MARGIN,
    y: 358,
    font: interRegular,
    size: 12.5,
    color: MUTED,
  });

  const nameSize = fitSize(
    oswaldSemiBold,
    input.holderName,
    bodyMaxWidth,
    34,
    18,
  );
  page.drawText(input.holderName, {
    x: MARGIN,
    y: 318,
    font: oswaldSemiBold,
    size: nameSize,
    color: INK,
  });

  const courseLine = `den Kurs „${input.courseTitleDe}“`;
  const courseSize = fitSize(interSemiBold, courseLine, bodyMaxWidth, 15, 11);
  const courseLines = wrapText(interSemiBold, courseLine, courseSize, bodyMaxWidth);
  let cursorY = 284;
  for (const line of courseLines.slice(0, 2)) {
    page.drawText(line, {
      x: MARGIN,
      y: cursorY,
      font: interSemiBold,
      size: courseSize,
      color: INK,
    });
    cursorY -= courseSize + 5;
  }

  page.drawText(
    `mit dem Niveau ${input.level} nach GER erfolgreich abgeschlossen hat.`,
    {
      x: MARGIN,
      y: cursorY,
      font: interRegular,
      size: 12.5,
      color: INK,
    },
  );
  cursorY -= 26;

  // Българското огледало — един тих ред, не втори документ. Нивото не се
  // повтаря: казано е на немски и стои в печата, а заглавието на курса
  // често също го съдържа.
  const mirror = `Удостоверява се, че ${input.holderName} успешно завърши курса „${input.courseTitleBg}“.`;
  const mirrorLines = wrapText(interRegular, mirror, 9, bodyMaxWidth);
  for (const line of mirrorLines.slice(0, 2)) {
    page.drawText(line, {
      x: MARGIN,
      y: cursorY,
      font: interRegular,
      size: 9,
      color: MUTED,
    });
    cursorY -= 13;
  }

  // ── Печат ──
  drawLevelStamp(
    page,
    { oswald: oswaldSemiBold, inter: interSemiBold },
    input.level,
    stampCx,
    stampCy,
  );

  // ── Долен ред: номер, дата, проверка, подпис ──
  drawFooterColumn(
    page,
    { label: interRegular, value: interSemiBold },
    MARGIN,
    "NUMMER · НОМЕР",
    input.number,
    150,
  );
  drawFooterColumn(
    page,
    { label: interRegular, value: interSemiBold },
    MARGIN + 172,
    "AUSGESTELLT AM · ИЗДАДЕН НА",
    formatStampDate(input.issuedAt),
    130,
  );
  drawFooterColumn(
    page,
    { label: interRegular, value: interSemiBold },
    MARGIN + 344,
    "PRÜFCODE · КОД ЗА ПРОВЕРКА",
    input.verifyCode,
    170,
  );

  // Адресът за проверка — под кода, дребен: за очите на проверяващия.
  const urlSize = fitSize(interRegular, input.verifyUrl, 190, 8, 6);
  page.drawText(input.verifyUrl, {
    x: MARGIN + 344,
    y: 90,
    font: interRegular,
    size: urlSize,
    color: MUTED,
  });

  // Подпис — дясно долу, над реда стои ръкописното място.
  const signX = PAGE_W - MARGIN - 170;
  page.drawLine({
    start: { x: signX, y: 112 },
    end: { x: PAGE_W - MARGIN, y: 112 },
    thickness: 0.7,
    color: INK,
  });
  page.drawText("Vasilena Nürnberger", {
    x: signX,
    y: 98,
    font: oswaldMedium,
    size: 13,
    color: INK,
  });
  page.drawText("Kursleitung · Ръководител на курсовете", {
    x: signX,
    y: 85,
    font: interRegular,
    size: 8,
    color: MUTED,
  });

  return doc.save();
}
