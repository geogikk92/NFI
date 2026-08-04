// ПРОВЕРКА НА СЕРТИФИКАТ · задача 16 — страницата зад отпечатания код.
//
// Адресът стои върху всеки PDF сертификат и живее ГОДИНИ — човек го
// проверява при кандидатстване за работа, институция го проверява при
// прием. Затова: никакъв вход, никакво състояние, само фактите от базата.
//
// Кодът е с висока ентропия (виж generateVerifyCode), така че страницата
// не е оракул за изброяване — може да се гледа без ограничение на опити.

import Link from "next/link";
import type { Metadata } from "next";
import { pick, toLocale, type Locale } from "@/lib/i18n/config";
import { certificatesCopy } from "@/lib/i18n/pages/certificates";
import { formatDateLong } from "@/lib/intl";
import {
  findCertificateByVerifyCode,
  type VerifiedCertificate,
} from "@/lib/certificates/certificates-db";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return {
    title: certificatesCopy(locale).verify.metaTitle,
    // Лични имена зад случаен код — индекс в търсачка би направил кода
    // безсмислен като защита.
    robots: { index: false, follow: false },
  };
}

// Датите МИНАВАТ през lib/intl (заключена часова зона): issuedAt се пази
// като берлинска полунощ и гол Intl.DateTimeFormat на UTC сървър би
// показал предишния ден — точно на екрана, който потвърждава документа.
function formatDate(value: Date, locale: Locale): string {
  return formatDateLong(value, locale);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function CertificateRecord({
  certificate,
  locale,
}: {
  certificate: VerifiedCertificate;
  locale: Locale;
}) {
  const t = certificatesCopy(locale).verify;

  const courseTitle = pick(locale, {
    bg: certificate.courseTitle,
    de: certificate.courseTitleDe,
    en: certificate.courseTitleEn,
  });

  return (
    <dl className="mt-10 w-full max-w-xl border-t border-border">
      <Row label={t.labels.number} value={certificate.number} />
      <Row label={t.labels.holder} value={certificate.holderName} />
      <Row label={t.labels.course} value={courseTitle} />
      <Row label={t.labels.level} value={certificate.level} />
      <Row
        label={t.labels.issuedAt}
        value={formatDate(certificate.issuedAt, locale)}
      />
      {certificate.revokedAt ? (
        <Row
          label={t.labels.revokedAt}
          value={formatDate(certificate.revokedAt, locale)}
        />
      ) : null}
      <Row
        label={t.labels.status}
        value={
          certificate.state === "valid" ? t.statusValid : t.statusRevoked
        }
      />
    </dl>
  );
}

export default async function VerifyCertificatePage({ params }: Props) {
  const { locale: rawLocale, code } = await params;
  const locale = toLocale(rawLocale);
  const t = certificatesCopy(locale).verify;

  // Невалидна URL-кодировка (/zertifikat/%E0) не бива да е 500 — това е
  // сгрешено копиране, тоест „кодът не е разпознат".
  let rawCode = code;
  try {
    rawCode = decodeURIComponent(code);
  } catch {
    // остава суровият сегмент; normalizeVerifyCode ще го отхвърли
  }

  const certificate = await findCertificateByVerifyCode(rawCode);

  const copy = !certificate
    ? t.notFound
    : certificate.state === "valid"
      ? t.valid
      : t.revoked;

  return (
    <main className="mx-auto flex min-h-[55vh] max-w-(--container-page) flex-col items-start justify-center px-6 py-20">
      <span className="flagline w-24" aria-hidden />
      <p className="kicker mt-8">
        <span className="kicker-sq" aria-hidden />
        {t.kicker}
      </p>
      <h1 className="mt-3 max-w-2xl font-title text-(length:--text-display-l) font-bold leading-tight">
        {copy.title}
      </h1>
      <p className="mt-4 max-w-(--container-lede) text-(length:--text-lede) leading-relaxed text-muted-foreground">
        {copy.body}
      </p>

      {certificate ? (
        <CertificateRecord certificate={certificate} locale={locale} />
      ) : null}

      <Button asChild size="lg" variant="outline" className="mt-10">
        <Link href={`/${locale}`}>{t.backHome}</Link>
      </Button>
    </main>
  );
}
