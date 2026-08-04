// СВАЛЯНЕ НА СЕРТИФИКАТ · задача 16.
//
// Автентикиран route, НЕ подписан линк: сертификатът е личен документ и
// принадлежи на профила. Линкът от профила така не носи собствен срок (за
// разлика от 5-минутен подписан URL, който умира, докато страницата стои
// отворена) — изтече ли СЕСИЯТА, човекът получава 401 с път към входа и
// линкът проработва пак след вход. PDF-ът се генерира при първото
// поискване, ако още го няма.
//
// Достъп: собственикът или админ. Отмененият сертификат не се предоставя
// на собственика — на хартия той изглежда валиден, а не е; админът може
// да го тегли за архива.

import { currentUser } from "@/lib/auth/session-db";
import { adminCheck } from "@/lib/admin/guard";
import { db } from "@/lib/db";
import {
  CertificateGone,
  ensureCertificatePdf,
} from "@/lib/certificates/certificates-db";
import {
  certificateDownloadName,
  certificateState,
} from "@/lib/certificates/certificates";
import { readObject } from "@/lib/storage";
import { certificatesCopy } from "@/lib/i18n/pages/certificates";
import { miniErrorPage } from "@/lib/error-page";

export const dynamic = "force-dynamic";

function errorPage(
  status: number,
  key: "needLogin" | "notFound" | "revoked",
): Response {
  const messages = (["bg", "de", "en"] as const).map(
    (locale) => certificatesCopy(locale).download[key],
  );

  // При изтекла сесия долната връзка е ВХОДЪТ, не началото: голият
  // /anmelden минава през middleware-а и получава езика на човека.
  return miniErrorPage(
    status,
    messages,
    key === "needLogin" ? { linkHref: "/anmelden", linkLabel: "→ /anmelden" } : {},
  );
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
  //
  // Админът се разпознава през СЪЩАТА проверка като /admin панела
  // (adminCheck включва и ADMIN_EMAIL предпазителя) — голото
  // `role === "ADMIN"` тук би било по-широка врата от самия панел.
  const isOwner = certificate?.userId === visitor.id;
  const isAdmin = (await adminCheck(visitor)).ok;
  if (!certificate || (!isOwner && !isAdmin)) {
    return errorPage(404, "notFound");
  }

  if (certificateState(certificate) === "revoked" && !isAdmin) {
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
