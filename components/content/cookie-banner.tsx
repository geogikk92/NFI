"use client";

// ТЕРИТОРИЯ НА БОБИ · задача 2c.
// Писано от Жоро, докато Боби е в отпуск.
//
// Двата основни бутона са РАВНОСТОЙНИ — еднакъв размер, еднаква тежест,
// един клик. Ако отказът е по-труден от приемането, съгласието не е
// свободно (Art. 7(4) GDPR) и не важи.

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface CookieBannerProps {
  onAcceptAll: () => Promise<void>;
  onRejectAll: () => Promise<void>;
  onSaveSelection: (formData: FormData) => Promise<void>;
}

export function CookieBanner({
  onAcceptAll,
  onRejectAll,
  onSaveSelection,
}: CookieBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-titel"
      aria-describedby="cookie-text"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-lg"
    >
      <div className="mx-auto max-w-(--container-page) px-6 py-6">
        <h2 id="cookie-titel" className="font-display text-xl">
          Cookies und externe Inhalte
        </h2>

        <p id="cookie-text" className="mt-3 max-w-prose text-sm text-muted-foreground">
          Technisch notwendige Cookies (Sitzung, Warenkorb, diese Auswahl)
          setzen wir immer. Externe Videos und Statistik laden wir erst mit
          Ihrer Einwilligung — bis dahin werden sie{" "}
          <strong>nicht geladen</strong>, nicht nur ausgeblendet.{" "}
          <Link href="/datenschutz" className="underline hover:text-primary">
            Datenschutzerklärung
          </Link>
        </p>

        {showDetails ? (
          <form action={onSaveSelection} className="mt-6">
            <fieldset className="space-y-4">
              <legend className="sr-only">Cookie-Kategorien</legend>

              <div className="flex items-start gap-3">
                <Checkbox id="necessary" checked disabled aria-readonly />
                <div className="grid gap-1">
                  <label htmlFor="necessary" className="text-sm font-medium">
                    Notwendig · immer aktiv
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Sitzung, Warenkorb und Ihre Cookie-Entscheidung. Ohne diese
                    funktioniert die Seite nicht.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox id="functional" name="functional" />
                <div className="grid gap-1">
                  <label htmlFor="functional" className="text-sm font-medium">
                    Externe Inhalte
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Videos von Vimeo und GoTo. Ohne Einwilligung erscheint an
                    ihrer Stelle ein Platzhalter.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox id="analytics" name="analytics" />
                <div className="grid gap-1">
                  <label htmlFor="analytics" className="text-sm font-medium">
                    Statistik
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Anonyme Auswertung, welche Seiten gelesen werden.
                  </p>
                </div>
              </div>
            </fieldset>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit">Auswahl speichern</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDetails(false)}
              >
                Zurück
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-6 flex flex-wrap gap-3">
            {/* Двата бутона са нарочно с еднакъв вид и тежест. */}
            <form action={onAcceptAll}>
              <Button type="submit">Alle akzeptieren</Button>
            </form>
            <form action={onRejectAll}>
              <Button type="submit" variant="outline">
                Alle ablehnen
              </Button>
            </form>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowDetails(true)}
            >
              Einstellungen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
