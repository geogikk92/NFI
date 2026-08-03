// Страницата на влезлия човек.
//
// Отключена от сесиите (30.07.2026) — дотогава стоеше в списъка „блокирани
// задачи", защото нямаше как да се разбере кой пита.
//
// Показва СЪЩЕСТВУВАЩИ данни и нищо друго. Няма измислени раздели „моите
// курсове" и „моите поръчки" с празно състояние: раздел, който обещава
// нещо, което не е направено, е по-лош от липсващ раздел.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session-db";
import { getAccountOverview } from "@/lib/auth/account-db";
import { certificatesForUser } from "@/lib/certificates/certificates-db";
import { getAccountTexts, consentLabel } from "@/lib/i18n/pages/account";
import { certificatesCopy } from "@/lib/i18n/pages/certificates";
import { pick, toLocale, type Locale } from "@/lib/i18n/config";
import { signOut } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getAccountTexts(locale);

  return {
    title: t.title,
    // Личната страница НЕ се индексира. И `follow: true`, защото връзките
    // от нея сочат публични страници.
    robots: { index: false, follow: true },
  };
}

/** Дата, изписана по правилата на съответния език. */
function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(
    locale === "bg" ? "bg-BG" : locale === "en" ? "en-GB" : "de-DE",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(value);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function AccountPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = getAccountTexts(locale);

  const visitor = await currentUser();
  if (!visitor) {
    // Пренасочване към входа, НЕ 404: тази страница не е тайна, просто иска
    // вход. Разликата с /admin е нарочна — там самото съществуване на
    // панела не бива да се потвърждава.
    redirect(`/${locale}/anmelden`);
  }

  const account = await getAccountOverview(visitor.id);
  if (!account) {
    // Сесия има, профил няма: изтрит е, докато човекът е бил влязъл.
    redirect(`/${locale}/anmelden`);
  }

  const certificates = await certificatesForUser(visitor.id);
  const tCert = certificatesCopy(locale).profile;

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.lead}</p>

        {/* ── Данни ── */}
        <section className="mt-12" aria-labelledby="danni">
          <h2 id="danni" className="font-title text-xl font-semibold">
            {t.dataHeading}
          </h2>
          <dl className="mt-4">
            <Row label={t.name} value={account.name ?? t.notGiven} />
            <Row label={t.email} value={account.email} />
            <Row label={t.phone} value={account.phone ?? t.notGiven} />
            <Row label={t.language} value={account.locale} />
            <Row
              label={t.memberSince}
              value={formatDate(account.createdAt, locale)}
            />
            <Row
              label={t.emailVerified}
              value={
                account.emailVerified
                  ? formatDate(account.emailVerified, locale)
                  : t.emailNotVerified
              }
            />
          </dl>

          {account.emailVerified ? null : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t.emailNotVerifiedNote}
            </p>
          )}
        </section>

        {/* ── Съгласия ── */}
        <section className="mt-12" aria-labelledby="saglasiya">
          <h2 id="saglasiya" className="font-title text-xl font-semibold">
            {t.consentsHeading}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.consentsLead}</p>

          {account.consents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t.consentsEmpty}
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {account.consents.map((consent) => {
                const revoked = Boolean(consent.revokedAt) || !consent.granted;
                return (
                  <li
                    key={consent.id}
                    className="border-l-2 border-border pl-4 text-sm"
                  >
                    <p className="font-medium">
                      {consentLabel(locale, consent.type)}
                    </p>
                    <p className="text-muted-foreground">
                      {revoked ? t.consentRevoked : t.consentGranted} ·{" "}
                      {formatDate(
                        consent.revokedAt ??
                          consent.confirmedAt ??
                          consent.requestedAt,
                        locale,
                      )}{" "}
                      · {t.consentVersion} {consent.textVersion}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Тестове за ниво ── */}
        <section className="mt-12" aria-labelledby="testove">
          <h2 id="testove" className="font-title text-xl font-semibold">
            {t.testsHeading}
          </h2>

          {account.testResults.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t.testsEmpty}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {account.testResults.map((result) => (
                <li
                  key={result.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {formatDate(result.createdAt, locale)}
                  </span>
                  <span>
                    {result.score}/{result.maxScore} {t.testScore} ·{" "}
                    <span className="font-semibold">{result.resultLevel}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Сертификати ── */}
        <section className="mt-12" aria-labelledby="sertifikati">
          <h2 id="sertifikati" className="font-title text-xl font-semibold">
            {tCert.heading}
          </h2>

          {certificates.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{tCert.empty}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">{tCert.lead}</p>
              <ul className="mt-4 space-y-4">
                {certificates.map((certificate) => (
                  <li
                    key={certificate.id}
                    className="border-l-2 border-border pl-4"
                  >
                    <p className="text-sm font-medium">
                      {pick(locale, {
                        bg: certificate.courseTitle,
                        de: certificate.courseTitleDe,
                        en: certificate.courseTitleEn,
                      })}{" "}
                      · {certificate.level}
                      {certificate.revokedAt ? (
                        <span className="ml-2 text-xs font-normal text-destructive">
                          {tCert.revokedNote}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {certificate.number} ·{" "}
                      {formatDate(certificate.issuedAt, locale)}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                      {certificate.revokedAt ? null : (
                        <a
                          href={`/api/certificate/${certificate.id}`}
                          className="draw-link font-medium text-primary"
                        >
                          {tCert.download}
                        </a>
                      )}
                      <Link
                        href={`/${locale}/zertifikat/${certificate.verifyCode}`}
                        className="draw-link text-muted-foreground"
                      >
                        {tCert.verifyLink}
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ── Права ── */}
        <section className="mt-12" aria-labelledby="prava">
          <h2 id="prava" className="font-title text-xl font-semibold">
            {t.rightsHeading}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.rightsBody}{" "}
            <Link
              href={`/${locale}/datenschutz`}
              className="underline hover:text-primary"
            >
              {t.rightsLink}
            </Link>
          </p>
        </section>

        <form action={signOut} className="mt-12">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline">
            {t.signOut}
          </Button>
        </form>
      </div>
    </main>
  );
}
