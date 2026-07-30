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
import { formatDateTime, toDateTimeAttribute } from "@/lib/intl";
import { rejectAllCookies, saveCookieSelection } from "../consent-actions";

export const metadata: Metadata = {
  title: "Cookie-Einstellungen",
  robots: { index: true, follow: true },
};

export default async function CookieSettingsPage() {
  const consent = await readConsent();
  const decided = consent.decidedAt ? new Date(consent.decidedAt) : null;

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <span className="flagline w-16" aria-hidden />

      <header className="mt-6 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">
          Cookie-Einstellungen
        </h1>
        <p className="mt-4 text-muted-foreground">
          Sie können Ihre Entscheidung jederzeit ändern. Externe Inhalte werden
          ohne Ihre Einwilligung nicht geladen — nicht nur ausgeblendet.
        </p>
      </header>

      <div className="mt-10 max-w-2xl rounded-xl border border-border bg-card p-6">
        {decided ? (
          <p role="status" className="text-sm text-muted-foreground">
            Ihre aktuelle Auswahl vom{" "}
            <time dateTime={toDateTimeAttribute(decided)}>
              {formatDateTime(decided)}
            </time>{" "}
            · Textfassung {consent.version}
          </p>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Sie haben noch keine Auswahl getroffen. Es sind nur technisch
            notwendige Cookies aktiv.
          </p>
        )}

        <Separator className="my-6" />

        <form action={saveCookieSelection}>
          <fieldset className="space-y-5">
            <legend className="sr-only">Cookie-Kategorien</legend>

            <div className="flex items-start gap-3">
              <Checkbox id="c-necessary" checked disabled aria-readonly />
              <div className="grid gap-1">
                <label htmlFor="c-necessary" className="font-medium">
                  Notwendig · immer aktiv
                </label>
                <p className="text-sm text-muted-foreground">
                  Sitzung, Warenkorb und diese Auswahl selbst. Ohne sie
                  funktioniert die Seite nicht, deshalb sind sie nicht
                  abwählbar.
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
                  Externe Inhalte
                </label>
                <p className="text-sm text-muted-foreground">
                  Videos von Vimeo und GoTo. Beim Laden erhalten diese Dienste
                  Ihre IP-Adresse.
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
                  Statistik
                </label>
                <p className="text-sm text-muted-foreground">
                  Anonyme Auswertung, welche Seiten gelesen werden.
                </p>
              </div>
            </div>
          </fieldset>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button type="submit">Auswahl speichern</Button>
          </div>
        </form>

        {/* Отделен формуляр: „отхвърли всичко" трябва да е един клик, не
            разчекване на три кутийки. */}
        <form action={rejectAllCookies} className="mt-3">
          <Button type="submit" variant="outline">
            Alles ablehnen
          </Button>
        </form>
      </div>

      <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
        Wenn wir den Text dieser Einwilligung ändern, fragen wir erneut — Ihre
        Zustimmung gilt immer für die Fassung, die Sie gesehen haben. Aktuelle
        Fassung: {CONSENT_VERSION}.
      </p>
    </main>
  );
}
