import "server-only";

// АДМИН · сертификатите — четенето на формата за издаване и отмяна.
// Устроен като lib/admin/materials.ts: collect() върху всички полета.
// Писането в базата е в lib/certificates/certificates-db.ts — то се дели
// с профила и публичната проверка и не е „админска" собственост.

import { collect } from "@/lib/admin/form";
import { oneOf, parseDateStart, requiredText } from "@/lib/admin/input";
import {
  CERTIFICATE_LEVELS,
  HOLDER_NAME_MAX,
  HOLDER_NAME_MIN,
  type CertificateLevel,
} from "@/lib/certificates/certificates";

export { CERTIFICATE_LEVELS, type CertificateLevel };

export interface CertificateIssueForm {
  email: string;
  holderName: string;
  courseId: string;
  level: CertificateLevel;
  issuedAt: Date | null;
}

export function parseCertificateIssueForm(
  data: FormData,
):
  | { ok: true; value: CertificateIssueForm }
  | { ok: false; fieldErrors: Record<string, string> } {
  const emailRaw = String(data.get("email") ?? "").trim().toLowerCase();

  // Проверката е нарочно груба: истинската е „има ли такъв профил в
  // базата" (resolveStudentByEmail). Тук се лови само очевидното, за да
  // получи човекът грешка до полето, а не до формата.
  const emailField =
    emailRaw.length === 0
      ? ({ ok: false, error: "Имейл: полето е задължително." } as const)
      : !emailRaw.includes("@") || emailRaw.length > 200
        ? ({ ok: false, error: "Имейл: това не изглежда като имейл адрес." } as const)
        : ({ ok: true, value: emailRaw } as const);

  return collect({
    email: emailField,

    holderName: requiredText(data.get("holderName"), {
      min: HOLDER_NAME_MIN,
      max: HOLDER_NAME_MAX,
      label: "Име в сертификата",
    }),

    courseId: requiredText(data.get("courseId"), {
      max: 40,
      label: "Курс",
    }),

    level: oneOf(data.get("level"), CERTIFICATE_LEVELS, "Ниво"),

    // Празно поле значи „днес" — решава се при издаването, не тук.
    issuedAt: parseDateStart(data.get("issuedAt"), "Дата на издаване"),
  });
}

export interface CertificateRevokeForm {
  reason: string;
}

export function parseCertificateRevokeForm(
  data: FormData,
):
  | { ok: true; value: CertificateRevokeForm }
  | { ok: false; fieldErrors: Record<string, string> } {
  return collect({
    reason: requiredText(data.get("reason"), {
      min: 3,
      max: 500,
      label: "Причина за отмяната",
    }),
  });
}
