// СВАЛЯНЕ НА СЕРТИФИКАТ · задача 16.
//
// Автентикиран route, НЕ подписан линк: сертификатът е личен документ и
// принадлежи на профила. Линкът от профила така никога не изтича (за
// разлика от 5-минутен подписан URL, който умира, докато страницата стои
// отворена), а PDF-ът се генерира при първото поискване, ако още го няма.
//
// Достъп: собственикът или админ. Отмененият сертификат не се предоставя
// на собственика — на хартия той изглежда валиден, а не е; админът може
// да го тегли за архива.

import { currentUser } from "@/lib/auth/session-db";
import { db } from "@/lib/db";
import {
  CertificateGone,
  ensureCertificatePdf,
} from "@/lib/certificates/certificates-db";
import { certificateDownloadName } from "@/lib/certificates/certificates";
import { readObject } from "@/lib/storage";
import { certificatesCopy } from "@/lib/i18n/pages/certificates";

export const dynamic = "force-dynamic";

/** Същият трижезичен мини-екран като /download/[token] — кратък и ясен. */
function errorPage(
  status: number,
  key: "needLogin" | "notFound" | "revoked",
): Response {
  const messages = (["bg", "de", "en"] as const).map(
    (locale) => certificatesCopy(locale).download[key],
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
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const visitor = await currentUser();
  if (!visitor) return errorPage(401, "needLogin");

  const certificate = await db.certificate.findUnique({
    where: { id },
    select: { id: true, userId: true, number: true, revokedAt: true },
  });

  // Чуждият сертификат и несъществуващият изглеждат еднакво — 404, а не
  // 403: иначе id-тата стават проверими отвън.
  const isOwner = certificate?.userId === visitor.id;
  const isAdmin = visitor.role === "ADMIN";
  if (!certificate || (!isOwner && !isAdmin)) {
    return errorPage(404, "notFound");
  }

  if (certificate.revokedAt && !isAdmin) {
    return errorPage(410, "revoked");
  }

  let key: string;
  try {
    key = await ensureCertificatePdf(certificate.id);
  } catch (error) {
    if (error instanceof CertificateGone) return errorPage(404, "notFound");
    throw error;
  }

  const object = await readObject(key);
  if (!object) return errorPage(404, "notFound");

  return new Response(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-length": String(object.body.length),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(certificateDownloadName(certificate.number))}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
