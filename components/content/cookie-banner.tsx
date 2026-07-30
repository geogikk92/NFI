"use client";

// ТЕРИТОРИЯ НА БОБИ · задача 2c.
// Писано от Жоро, докато Боби е в отпуск.
//
// Двата основни бутона са РАВНОСТОЙНИ — еднакъв размер, еднаква тежест,
// един клик. Ако отказът е по-труден от приемането, съгласието не е
// свободно (Art. 7(4) GDPR) и не важи.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Locale } from "@/lib/i18n/config";
import { consentCopy } from "@/lib/i18n/pages/consent";

interface CookieBannerProps {
  locale: Locale;
  onAcceptAll: () => Promise<void>;
  onRejectAll: () => Promise<void>;
  onSaveSelection: (formData: FormData) => Promise<void>;
}

export function CookieBanner({
  locale,
  onAcceptAll,
  onRejectAll,
  onSaveSelection,
}: CookieBannerProps) {
  const t = consentCopy(locale).banner;
  const [showDetails, setShowDetails] = useState(false);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  // Пази от кражба на фокуса при първия рендер: банерът стои последен в
  // DOM-а, след футъра, и фокус, скочил там при зареждане, убива skip
  // link-а. Ефектът действа само след истински клик.
  const interacted = useRef(false);

  useEffect(() => {
    if (!interacted.current || !showDetails) return;
    firstOptionRef.current?.focus();
  }, [showDetails]);

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
          {t.title}
        </h2>

        <p id="cookie-text" className="mt-3 max-w-prose text-sm text-muted-foreground">
          {t.body} <strong>{t.bodyStrong}</strong>
          {t.bodyTail}{" "}
          {/* Връзката носи езика — иначе middleware пренасочва по
              Accept-Language и човекът излиза на друг език. */}
          <Link
            href={`/${locale}/datenschutz`}
            className="underline hover:text-primary"
          >
            {t.privacyLink}
          </Link>
        </p>

        {/* Редът с бутоните стои ВИНАГИ монтиран. Преди тук имаше тернар,
            който сменяше целия поддървесник — бутонът, току-що получил
            клика, се демонтираше, фокусът падаше на <body> и следващият Tab
            тръгваше от началото на страницата (WCAG 2.4.3).
            Двата основни бутона са нарочно с еднакъв вид и тежест. */}
        <div className="mt-6 flex flex-wrap gap-3">
          <form action={onAcceptAll}>
            <Button type="submit">{t.acceptAll}</Button>
          </form>
          <form action={onRejectAll}>
            <Button type="submit" variant="outline">
              {t.rejectAll}
            </Button>
          </form>
          <Button
            type="button"
            variant="ghost"
            aria-expanded={showDetails}
            aria-controls="cookie-details"
            onClick={() => {
              interacted.current = true;
              setShowDetails((value) => !value);
            }}
          >
            {showDetails ? t.settingsLess : t.settings}
          </Button>
        </div>

        {/* СЕСТРА на реда с бутоните, не негов потомък — вложени <form> са
            невалиден HTML и парсерът изхвърля вътрешните.
            `hidden`, не визуално скриване: иначе чекбоксовете остават в tab
            веригата, докато са невидими. */}
        <form
          id="cookie-details"
          action={onSaveSelection}
          hidden={!showDetails}
          className="mt-6"
        >
          <div role="group" aria-label={t.categories} className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox id="necessary" checked disabled aria-readonly />
              <div className="grid gap-1">
                <label htmlFor="necessary" className="text-sm font-medium">
                  {t.necessaryLabel}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t.necessaryBody}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              {/* Фокусът скача тук при разгъване — „necessary" е disabled и
                  не е фокусируем, значи не може да поеме фокуса. */}
              <Checkbox
                ref={firstOptionRef}
                id="functional"
                name="functional"
              />
              <div className="grid gap-1">
                <label htmlFor="functional" className="text-sm font-medium">
                  {t.functionalLabel}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t.functionalBody}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="analytics" name="analytics" />
              <div className="grid gap-1">
                <label htmlFor="analytics" className="text-sm font-medium">
                  {t.analyticsLabel}
                </label>
                <p className="text-sm text-muted-foreground">
                  {t.analyticsBody}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button type="submit">{t.save}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
