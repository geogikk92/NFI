// ТЕРИТОРИЯ НА БОБИ · задача 17m-b — кориците за публичните страници.
//
// Моделите държат само `coverMediaId` (без foreign key, нарочно) — тук
// идентификаторът се превръща в готова за next/image снимка: адрес,
// описание на езика на посетителя, размери. Липсваща или изтрита медия
// дава null и страницата просто остава без снимка — никога не гърми.

import { cache } from "react";
import { db } from "@/lib/db";
import { mediaUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";

export interface PublicCover {
  /** Готов адрес за next/image — /media/<ключ>. */
  url: string;
  /** Описание за екранен четец на езика на посетителя. */
  alt: string;
  width: number;
  height: number;
}

/**
 * Корицата по id на медия. `cache()`, защото generateMetadata и
 * страницата питат за същия запис в един и същ рендер.
 */
export const coverForMedia = cache(
  async (
    coverMediaId: string | null,
    locale: Locale,
  ): Promise<PublicCover | null> => {
    if (!coverMediaId) return null;

    const media = await db.media.findUnique({
      where: { id: coverMediaId },
      select: { key: true, alt: true, altDe: true, width: true, height: true },
    });

    // Без размери next/image няма как да запази място и страницата
    // подскача — по-добре без снимка, отколкото с подскачаща.
    if (!media || !media.width || !media.height) return null;

    // Езиците НЕ се смесват: немската страница взима немското описание,
    // а липсва ли то — празен alt (декоративна снимка) е по-честен от
    // български текст в немски екранен четец.
    const alt =
      locale === "de" ? (media.altDe ?? "") : (media.alt ?? media.altDe ?? "");

    return {
      url: mediaUrl(media.key),
      alt,
      width: media.width,
      height: media.height,
    };
  },
);
