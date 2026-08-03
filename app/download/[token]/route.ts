// СВАЛЯНЕ ПО ТОКЕН · задача 8 (ползва се и от M12 за продуктите).
//
// Извън /[locale]/, защото не е страница: токенът Е достъпът и езикът на
// човека не се знае. Съобщенията за грешка са на трите езика наведнъж —
// кратки са, а излишният език не пречи, липсващият пречи.
//
// Осребряването брои: redeemDownloadToken() вдига брояча с УСЛОВНО
// updateMany, така че два паралелни клика на изчерпан токен не минават.

import { redeemDownloadToken } from "@/lib/cms/free-materials-db";
import { readObject } from "@/lib/storage";
import { materialsCopy } from "@/lib/i18n/pages/materials";

export const dynamic = "force-dynamic";

function errorPage(status: number, key: "expired" | "exhausted" | "revoked" | "notFound" | "noFile"): Response {
  const messages = (["bg", "de", "en"] as const).map(
    (locale) => materialsCopy(locale).download[key],
  );

  const html = `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>NFI</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f7f5f0;color:#16130f;
    display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
  main{max-width:34rem}
  .line{height:3px;background:linear-gradient(90deg,#16130f 0 16.66%,#c11f2f 16.66% 33.32%,#b98a2b 33.32% 49.98%,#fff 49.98% 66.64%,#2f7d5b 66.64% 83.3%,#c11f2f 83.3% 100%);margin-bottom:20px}
  p{line-height:1.55;margin:0 0 12px}
  p+p{color:#57503f;font-size:.9rem}
  a{color:#c11f2f}
</style>
</head>
<body><main>
<div class="line"></div>
${messages.map((m, i) => `<p${i > 0 ? ' lang="' + ["bg", "de", "en"][i] + '"' : ""}>${m}</p>`).join("\n")}
<p><a href="/">nfi</a></p>
</main></body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;

  const redeemed = await redeemDownloadToken(token);

  if (!redeemed.ok) {
    switch (redeemed.reason) {
      case "expired":
        return errorPage(410, "expired");
      case "exhausted":
        return errorPage(410, "exhausted");
      case "revoked":
        return errorPage(410, "revoked");
      case "no-file":
        return errorPage(404, "noFile");
      default:
        return errorPage(404, "notFound");
    }
  }

  const object = await readObject(redeemed.storageKey);
  if (!object) return errorPage(404, "noFile");

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "content-type": object.mimeType,
      "content-length": String(object.body.length),
      // RFC 5987 — името може да е на кирилица.
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(redeemed.filename)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
