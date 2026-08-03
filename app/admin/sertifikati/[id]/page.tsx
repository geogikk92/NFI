// АДМИН · детайлът на сертификат.
//
// Тук няма редакция на полетата: издаден сертификат е ДОКУМЕНТ. Сгрешено
// име не се „поправя" тихо — сертификатът се отменя (с причина в дневника)
// и се издава нов, с нов номер. Точно както при хартиените.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { CertificateRevokeSection } from "@/components/admin/certificate-revoke";
import { requireAdmin } from "@/lib/admin/guard";
import { getCertificateForAdmin } from "@/lib/certificates/certificates-db";
import {
  regenerateCertificatePdf,
  restoreCertificateAction,
  revokeCertificateAction,
} from "../actions";

export const metadata: Metadata = {
  title: "Сертификат",
  robots: { index: false, follow: false },
};

const FLASH = {
  izdaden: "Сертификатът е издаден.",
  otmenen: "Сертификатът е отменен.",
  vazstanoven: "Сертификатът е възстановен.",
  pdf: "PDF файлът е генериран наново.",
};

const FLASH_ERRORS = {
  ...commonFlashErrors("Сертификатът"),
  pdf: "PDF файлът не се генерира. Опитай пак — ако продължава, виж лога на сървъра.",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function AdminCertificatePage({
  params,
  searchParams,
}: Props) {
  await requireAdmin();

  const { id } = await params;
  const query = await searchParams;

  const certificate = await getCertificateForAdmin(id);
  if (!certificate) notFound();

  const pdfWarning = query.pdf === "greshka";

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/admin/sertifikati"
              className="underline underline-offset-4 hover:text-primary"
            >
              Сертификати
            </Link>{" "}
            / {certificate.number}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {certificate.number}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {certificate.holderName} · {certificate.courseTitle} ·{" "}
            {certificate.level}
          </p>
        </div>

        {certificate.revokedAt ? (
          <Badge variant="destructive">отменен</Badge>
        ) : (
          <Badge>валиден</Badge>
        )}
      </header>

      <Flash query={query} success={FLASH} errors={FLASH_ERRORS} />

      {pdfWarning ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          Сертификатът е издаден, но PDF файлът не се генерира. Опитай с бутона
          „Генерирай PDF наново“ по-долу.
        </p>
      ) : null}

      <dl className="mt-8 max-w-2xl border-t border-border">
        <Row label="Издаден на" value={certificate.holderName} />
        <Row
          label="Профил"
          value={
            certificate.userName
              ? `${certificate.userName} (${certificate.userEmail})`
              : certificate.userEmail
          }
        />
        <Row label="Курс" value={certificate.courseTitle} />
        <Row label="Ниво" value={certificate.level} />
        <Row label="Дата на издаване" value={formatDate(certificate.issuedAt)} />
        <Row
          label="Код за проверка"
          value={
            <Link
              href={`/bg/zertifikat/${certificate.verifyCode}`}
              className="underline underline-offset-4 hover:text-primary"
            >
              {certificate.verifyCode}
            </Link>
          }
        />
        <Row
          label="PDF файл"
          value={certificate.storageKey ? "генериран" : "липсва"}
        />
        {certificate.revokedAt ? (
          <>
            <Row label="Отменен на" value={formatDate(certificate.revokedAt)} />
            <Row
              label="Причина"
              value={certificate.revokeReason ?? "не е записана"}
            />
          </>
        ) : null}
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          {/* Админът тегли и отменени PDF-и — route-ът пуска само него. */}
          <a href={`/api/certificate/${certificate.id}`}>Свали PDF</a>
        </Button>

        <form action={regenerateCertificatePdf}>
          <input type="hidden" name="id" value={certificate.id} />
          <Button type="submit" variant="outline">
            Генерирай PDF наново
          </Button>
        </form>

        {certificate.revokedAt ? (
          <form action={restoreCertificateAction}>
            <input type="hidden" name="id" value={certificate.id} />
            <Button type="submit" variant="outline">
              Възстанови сертификата
            </Button>
          </form>
        ) : null}
      </div>

      {certificate.revokedAt ? null : (
        <CertificateRevokeSection
          action={revokeCertificateAction}
          id={certificate.id}
        />
      )}
    </>
  );
}
