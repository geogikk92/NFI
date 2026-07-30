// Типографска корица · пренесена от мокъпа (magazin.html).
//
// Учебните материали на NFI нямат снимки. Корицата е цветен блок с текст,
// като немски учебник — решение на мокъпа, и добро: всяка корица е
// разпознаваема, без да чакаме фотограф, и не остарява.
//
// Мащабира се с container queries (виж .cover в globals.css), затова един
// и същ компонент стои и в тесен рафт, и голям на детайлната страница —
// без варианти по размер.

import type { Locale } from "@/lib/i18n/config";
import { pick } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export type CoverColor = "INK" | "RED" | "GREEN" | "GOLD";

const COLOR_CLASS: Record<CoverColor, string> = {
  INK: "cover-ink",
  RED: "cover-red",
  GREEN: "cover-green",
  GOLD: "cover-gold",
};

export interface ProductCoverProps {
  color: CoverColor;
  brand?: string | null;
  eyebrow?: string | null;
  /** Заглавието на корицата. Кратка немска форма, не пълното име. */
  coverTitle?: string | null;
  meta?: string | null;
  /** Резервни варианти, ако корицата не е попълнена от админа. */
  fallback: { bg: string | null; de?: string | null; en?: string | null };
  locale: Locale;
  className?: string;
}

export function ProductCover({
  color,
  brand,
  eyebrow,
  coverTitle,
  meta,
  fallback,
  locale,
  className,
}: ProductCoverProps) {
  // Ако админът не е попълнил корицата, пада на заглавието на продукта —
  // празна цветна кутия е по-лоша от кутия с името вътре.
  const title = coverTitle?.trim() || pick(locale, fallback);

  return (
    <div
      className={cn("cover", COLOR_CLASS[color], className)}
      // Корицата е декоративна: цялата информация в нея се повтаря като
      // истински текст до нея в рафта. За екранния четец е шум.
      aria-hidden
    >
      {brand ? <span className="cover-brand">{brand}</span> : <span />}

      <div className="cover-mid">
        {eyebrow ? <span className="cover-eyebrow">{eyebrow}</span> : null}
        <span className="cover-title">{title}</span>
      </div>

      {meta ? <span className="cover-meta">{meta}</span> : <span />}

      {/* Флаг-линията долу — знакът на марката върху всеки материал. */}
      <span className="flagline" />
    </div>
  );
}
