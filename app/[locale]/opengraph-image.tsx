// OG изображение · част от задача 22.
//
// Генерира се от кода, не е готов файл: така се сменя с токените и не
// остарява при всяка промяна на марката. Един шаблон на език.
//
// Без него всяко споделяне в Facebook, WhatsApp или Viber излиза като гола
// връзка — а точно там е публиката: мокъпът сочи Facebook общност от
// 22 000+ души и има бутони за WhatsApp и Viber.
//
// Шрифтът е нарочно системен: ImageResponse иска шрифтът да се достави
// като ArrayBuffer, а Oswald с кирилица тежи ~40 KB на всяко генериране.
// Заглавието е кратко и на едър кегел, така че разликата не си струва.

import { ImageResponse } from "next/og";
import { toLocale } from "@/lib/i18n/config";
import { homeCopy } from "@/lib/i18n/pages/home";

export const alt = "Nürnberger Fremdsprachen Institut";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Цветовете са от app/tokens.css. Тук са литерали, защото ImageResponse
// не вижда CSS променливи — при смяна на палитрата се сменят и тук.
const PAPER = "#f7f5f0";
const INK = "#16130f";
const RED = "#c11f2f";
const GOLD = "#b98a2b";
const GREEN = "#2f7d5b";
const INK2 = "#57503f";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = toLocale((await params).locale);
  const t = homeCopy(locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          fontFamily: "sans-serif",
        }}
      >
        {/* Флаг-линията — знакът на марката, същите проценти като в CSS. */}
        <div
          style={{
            height: 12,
            display: "flex",
            width: "100%",
          }}
        >
          <div style={{ width: "16.66%", background: INK }} />
          <div style={{ width: "16.66%", background: RED }} />
          <div style={{ width: "16.66%", background: GOLD }} />
          <div style={{ width: "16.66%", background: "#ffffff" }} />
          <div style={{ width: "16.66%", background: GREEN }} />
          <div style={{ width: "16.7%", background: RED }} />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 72px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: INK2,
            }}
          >
            <div style={{ width: 14, height: 14, background: RED }} />
            {t.hero.kicker}
          </div>

          <div
            style={{
              marginTop: 28,
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              fontSize: 82,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -1,
              color: INK,
            }}
          >
            <span>{t.hero.titleLead}</span>
            <span style={{ color: RED }}>{t.hero.titleAccent}</span>
          </div>

          <div
            style={{
              marginTop: 30,
              fontSize: 28,
              lineHeight: 1.4,
              color: INK2,
              maxWidth: 900,
            }}
          >
            {t.hero.badgeLevels}
          </div>
        </div>

        {/* Знакът „N" и името — долу вляво, както в хедъра. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "0 72px 56px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              background: RED,
              color: "#ffffff",
              fontSize: 30,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            N
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: INK }}>
            Nürnberger Fremdsprachen Institut
          </div>
        </div>
      </div>
    ),
    size,
  );
}
