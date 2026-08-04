// СВАЛЯНЕ ПО ТОКЕН · задача 8 (ползва се и от M12 за продуктите).
//
// Извън /[locale]/, защото не е страница: токенът Е достъпът и езикът на
// човека не се знае. Съобщенията за грешка са на трите езика наведнъж —
// кратки са, а излишният език не пречи, липсващият пречи.
//
// Осребряването брои: redeemDownloadToken() вдига брояча с УСЛОВНО
// updateMany, така че два паралелни клика на изчерпан токен не минават.

import {
  redeemDownloadToken,
  refundDownloadAttempt,
} from "@/lib/cms/free-materials-db";
import { readObject } from "@/lib/storage";
import { materialsCopy } from "@/lib/i18n/pages/materials";
import { miniErrorPage } from "@/lib/error-page";

export const dynamic = "force-dynamic";

function errorPage(status: number, key: "expired" | "exhausted" | "revoked" | "notFound" | "noFile"): Response {
  const messages = (["bg", "de", "en"] as const).map(
    (locale) => materialsCopy(locale).download[key],
  );

  return miniErrorPage(status, messages);
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
  if (!object) {
    // Файлът липсва на диска СЛЕД успешното осребряване — опитът не
    // бива да брои: човекът не е получил нищо.
    await refundDownloadAttempt(token);
    return errorPage(404, "noFile");
  }

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
