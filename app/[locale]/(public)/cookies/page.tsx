// ТЕРИТОРИЯ НА БОБИ · задача 2c.
// Писано от Жоро, докато Боби е в отпуск.
//
// Art. 7(3) GDPR: оттеглянето на съгласието трябва да е толкова лесно,
// колкото даването му. Банерът изчезва след първото решение, значи
// трябва да има постоянно място, откъдето изборът се променя — иначе
// съгласието е еднопосочно и не важи.
//
// Страницата е свързана от футъра, за да е достъпна отвсякъде.

import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { readConsent } from "@/lib/consent-cookie";
import { CONSENT_VERSION } from "@/lib/consent";
import { toDateTimeAttribute } from "@/lib/intl";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { cookiesCopy } from "@/lib/i18n/pages/cookies";
import { dateTime } from "@/lib/i18n/pages/formats";
import { rejectAllCookies, saveCookieSelection } from "../consent-actions";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: localeAlternates(toLocale(locale), "cookies"),
    title: cookiesCopy(toLocale(locale)).metaTitle,
    robots: { index: true, follow: true },
  };
}

export default async function CookieSettingsPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = cookiesCopy(locale);

  const consent = await readConsent();
  const decided = consent.decidedAt ? new Date(consent.decidedAt) : null;

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <span className="flagline w-16" aria-hidden />

      <header className="mt-6 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">{t.title}</h1>
        <p className="mt-4 text-muted-foreground">{t.lead}</p>
      </header>

      <div className="mt-10 max-w-2xl rounded-xl border border-border bg-card p-6">
        {decided ? (
          <p role="status" className="text-sm text-muted-foreground">
            {t.currentPrefix}{" "}
            <time dateTime={toDateTimeAttribute(decided)}>
              {dateTime(locale, decided)}
            </time>{" "}
            · {t.textVersion(consent.version)}
          </p>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            {t.noSelection}
          </p>
        )}

        <Separator className="my-6" />

        <form action={saveCookieSelection}>
          <fieldset className="space-y-5">
            <legend className="sr-only">{t.legend}</legend>

            <div className="flex items-start gap-3">
              <Checkbox id="c-necessary" checked disabled aria-readonly />
              <div className="grid gap-1">
                <label htmlFor="c-necessary" className="font-medium">
                  {t.necessaryLabel}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t.necessaryBody}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="c-functional"
                name="functional"
                defaultChecked={consent.functional}
              />
              <div className="grid gap-1">
                <label htmlFor="c-functional" className="font-medium">
                  {t.functionalLabel}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t.functionalBody}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="c-analytics"
                name="analytics"
                defaultChecked={consent.analytics}
              />
              <div className="grid gap-1">
                <label htmlFor="c-analytics" className="font-medium">
                  {t.analyticsLabel}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t.analyticsBody}
                </p>
              </div>
            </div>
          </fieldset>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="submit">{t.save}</Button>
          </div>
        </form>

        {/* Отделен формуляр: „отхвърли всичко" трябва да е един клик, не
            разчекване на три кутийки. */}
        <form action={rejectAllCookies} className="mt-3">
          <Button type="submit" variant="outline">
            {t.rejectAll}
          </Button>
        </form>
      </div>

      <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
        {t.footnote(CONSENT_VERSION)}
      </p>
    </main>
  );
}
