// АДМИН · сертификатите.
//
// Списъкът отговаря на два въпроса: „какво сме издали" (за справка пред
// институция) и „има ли сертификат без PDF" (провалено генериране, което
// чака бутона на детайла).

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import { listCertificatesForAdmin } from "@/lib/certificates/certificates-db";
import { formatNumber } from "@/lib/intl";

export const metadata: Metadata = {
  title: "Сертификати",
  robots: { index: false, follow: false },
};

const FLASH = {
  izdaden: "Сертификатът е издаден.",
  otmenen: "Сертификатът е отменен.",
  vazstanoven: "Сертификатът е възстановен.",
  pdf: "PDF файлът е генериран наново.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export default async function AdminCertificatesPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const certificates = await listCertificatesForAdmin();
  const valid = certificates.filter((row) => !row.revokedAt).length;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Сертификати</h1>
          <p className="mt-2 text-muted-foreground">
            Издадени за завършени курсове. Валидни:{" "}
            {formatNumber(valid, "bg")} от{" "}
            {formatNumber(certificates.length, "bg")}.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/sertifikati/nov">Нов сертификат</Link>
        </Button>
      </header>

      <Flash
        query={query}
        success={FLASH}
        errors={commonFlashErrors("Сертификатът")}
      />

      {certificates.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Още няма издадени сертификати"
          description="Издай първия: избираш курсист по имейла на профила му, курс и ниво — номерът и PDF файлът стават сами."
          action={
            <Button asChild>
              <Link href="/admin/sertifikati/nov">Нов сертификат</Link>
            </Button>
          }
        />
      ) : (
        <div
          className="mt-8 overflow-x-auto rounded-xl border border-border"
          tabIndex={0}
          role="region"
          aria-label="Сертификати"
        >
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Сертификати с номер, име, курс, ниво, дата и състояние
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Номер
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Издаден на
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Курс
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Ниво
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Дата
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Състояние
                </th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((certificate) => (
                <tr
                  key={certificate.id}
                  className="border-t border-border align-top"
                >
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    <Link
                      href={`/admin/sertifikati/${certificate.id}`}
                      className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {certificate.number}
                    </Link>
                  </th>
                  <td className="px-4 py-3">
                    {certificate.holderName}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {certificate.userEmail}
                    </span>
                  </td>
                  <td className="px-4 py-3">{certificate.courseTitle}</td>
                  <td className="px-4 py-3">{certificate.level}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatDate(certificate.issuedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {certificate.revokedAt ? (
                      <Badge variant="destructive">отменен</Badge>
                    ) : (
                      <Badge>валиден</Badge>
                    )}
                    {certificate.hasPdf ? null : (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        без PDF
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
