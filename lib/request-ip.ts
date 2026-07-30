import "server-only";

import { headers } from "next/headers";

/**
 * Истинският IP зад обратен прокси.
 *
 * Vercel слага `x-forwarded-for`; ПЪРВИЯТ адрес е клиентът, останалите са
 * прокситата. Взима се само първият — иначе всяко ограничение по IP се
 * заобикаля с подправена глава: нападателят праща
 * `x-forwarded-for: 1.2.3.4, <негов адрес>` и всеки път изглежда различен.
 *
 * Живее тук, а не до формата, която го е поискала първа: второ копие на
 * тази функция рано или късно се разминава с първото, а разминаването е
 * тихо — ограничението просто спира да работи.
 */
export async function clientIp(): Promise<string | null> {
  const store = await headers();

  const forwarded = store.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return store.get("x-real-ip");
}
