import { readFileSync } from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { renderCertificatePdf, type CertificatePdfInput } from "./pdf";

const SAMPLE: CertificatePdfInput = {
  number: "NFI-Z-2026-00042",
  verifyCode: "XK7M-2PQ9-WD4T",
  verifyUrl: "https://nfi.example/zertifikat/XK7M-2PQ9-WD4T",
  holderName: "Мария Щерева-Караджова",
  courseTitleDe: "Deutsch für den Alltag — Niveau B1",
  courseTitleBg: "Немски за ежедневието — ниво B1",
  level: "B1",
  issuedAt: new Date("2026-08-03T10:00:00Z"),
};

describe("шрифтовете в assets/fonts", () => {
  // Тестът пази твърдението от README-то на папката: PDF-ът носи имена на
  // кирилица и немски курсове с умлаути — липсващ глиф е счупен сертификат.
  const REQUIRED = ["ж", "щ", "ю", "Я", "ä", "ö", "ü", "ß", "„", "“", "·", "№"];

  it.each([
    "Oswald-Medium.ttf",
    "Oswald-SemiBold.ttf",
    "Inter-Regular.ttf",
    "Inter-SemiBold.ttf",
  ])("%s покрива кирилицата и немските знаци", (file) => {
    const font = fontkit.create(
      readFileSync(path.join(process.cwd(), "assets", "fonts", file)),
    );
    const missing = REQUIRED.filter(
      (char) => !font.hasGlyphForCodePoint(char.codePointAt(0) ?? 0),
    );
    expect(missing).toEqual([]);
  });
});

describe("renderCertificatePdf", () => {
  it("дава истински PDF с една страница A4 пейзаж", async () => {
    const bytes = await renderCertificatePdf(SAMPLE);

    expect(bytes.length).toBeGreaterThan(10_000);
    // Заглавието на файла: %PDF-
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");

    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBe(1);

    const { width, height } = loaded.getPage(0).getSize();
    expect(Math.round(width)).toBe(842);
    expect(Math.round(height)).toBe(595);
  });

  it("носи номера и името в метаданните", async () => {
    const bytes = await renderCertificatePdf(SAMPLE);
    const loaded = await PDFDocument.load(bytes);

    expect(loaded.getTitle()).toContain(SAMPLE.number);
    expect(loaded.getTitle()).toContain(SAMPLE.holderName);
    expect(loaded.getAuthor()).toBe("Nürnberger Fremdsprachen Institut");
  });

  it("размерът остава в очаквания коридор", async () => {
    // Inter се вгражда цял (subset-ването на pdf-lib го поврежда — виж
    // коментара в pdf.ts), Oswald — подмножество. Падне ли под 300 КБ,
    // някой е върнал subset на Inter; мине ли 500 КБ, нещо влачи излишно.
    const bytes = await renderCertificatePdf(SAMPLE);
    expect(bytes.length).toBeGreaterThan(300_000);
    expect(bytes.length).toBeLessThan(500_000);
  });

  it("оцелява крайно дълго име и дълъг курс, без да хвърли", async () => {
    const bytes = await renderCertificatePdf({
      ...SAMPLE,
      holderName:
        "Александрина-Константина Щерева-Каранфилова-Първанова фон Мюнхаузен",
      courseTitleDe:
        "Intensivkurs Deutsch für Beruf, Alltag und Integration mit Prüfungsvorbereitung — Niveau C1",
      courseTitleBg:
        "Интензивен курс по немски за работа, ежедневие и интеграция с подготовка за изпит — ниво C1",
    });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it("две генерирания дават еднакво съдържание при еднакъв вход", async () => {
    // Не байт по байт (PDF trailer-ът носи случаен документен ID), а по
    // размер — разминаване тук значи недетерминизъм в рисуването.
    const first = await renderCertificatePdf(SAMPLE);
    const second = await renderCertificatePdf(SAMPLE);
    expect(Math.abs(first.length - second.length)).toBeLessThan(200);
  });
});
