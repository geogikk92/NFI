// АДМИН · нов сертификат.

import type { Metadata } from "next";
import Link from "next/link";
import { CertificateIssueForm } from "@/components/admin/certificate-issue-form";
import { requireAdmin } from "@/lib/admin/guard";
import {
  CERTIFICATE_LEVELS,
} from "@/lib/admin/certificates";
import { courseOptionsForCertificates } from "@/lib/certificates/certificates-db";
import { toDateInputValue } from "@/lib/admin/input";
import { issueCertificateAction } from "../actions";

export const metadata: Metadata = {
  title: "Нов сертификат",
  robots: { index: false, follow: false },
};

export default async function NewCertificatePage() {
  await requireAdmin();

  const courses = await courseOptionsForCertificates();

  return (
    <>
      <header>
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/sertifikati"
            className="underline underline-offset-4 hover:text-primary"
          >
            Сертификати
          </Link>{" "}
          / нов
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Нов сертификат
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Номерът идва от общия брояч, кодът за проверка се създава сам, а PDF
          файлът се генерира веднага след издаването.
        </p>
      </header>

      <div className="mt-8">
        <CertificateIssueForm
          action={issueCertificateAction}
          courses={courses.map((course) => ({
            value: course.id,
            label: `${course.title} · ${course.level}`,
            level: course.level,
          }))}
          levels={CERTIFICATE_LEVELS.map((level) => ({
            value: level,
            label: level,
          }))}
          today={toDateInputValue(new Date())}
        />
      </div>
    </>
  );
}
