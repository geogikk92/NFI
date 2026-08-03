// ТЕРИТОРИЯ НА БОБИ · задача 17m — сервиране на подписани локални линкове.
//
// Съществува само за ЛОКАЛНИЯ драйвер: S3/R2 ще дава свои presigned URL-и
// и този route няма да участва. Затова и отговаря 404, когато S3 е
// конфигуриран — да не остане страничен вход.
//
// Проверката е изцяло в подписа (HMAC ключ+срок+име). Никакви сесии:
// линкът Е достъпът, точно като presigned URL. Кратък срок, private cache.

import { verifySignedParams, localRead } from "@/lib/storage/local";

export async function GET(request: Request): Promise<Response> {
  if (process.env.S3_BUCKET) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const verified = verifySignedParams({
    key: url.searchParams.get("key"),
    exp: url.searchParams.get("exp"),
    sig: url.searchParams.get("sig"),
    dl: url.searchParams.get("dl"),
  });

  // Едно и също съобщение за грешен подпис, изтекъл срок и липсващ
  // параметър: разликата би казала на атакуващия кое е познал.
  if (!verified) {
    return new Response("Линкът е невалиден или изтекъл.", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const object = await localRead(verified.key);
  if (!object) {
    return new Response("Файлът не е намерен.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const headers: Record<string, string> = {
    "content-type": object.mimeType,
    "content-length": String(object.body.length),
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };

  if (verified.downloadAs) {
    // RFC 5987 за кирилица в името — иначе browser-ът сваля „_____.pdf".
    headers["content-disposition"] =
      `attachment; filename*=UTF-8''${encodeURIComponent(verified.downloadAs)}`;
  }

  return new Response(new Uint8Array(object.body), { status: 200, headers });
}
