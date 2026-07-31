// ТЕРИТОРИЯ НА БОБИ · задача 3c.
// Писано от Жоро, докато Боби е в отпуск.
//
// Widerrufsbelehrung. Текстът е ЗАДЪЛЖИТЕЛНО от юрист: официалният
// образец по Anlage 1 zu Art. 246a EGBGB дава защита само ако е ползван
// дословно. Всяко „подобрение" на формулировката я премахва.

import type { Metadata } from "next";
import { LegalPage, AwaitingLegalText } from "@/components/content/legal-page";
import { LEGAL_TEXT_VERSIONS, WITHDRAWAL_PERIOD_DAYS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Widerrufsrecht",
  robots: { index: true, follow: true },
  // ТВЪРД canonical към немската версия — БЕЗ hreflang.
  //
  // Страницата се отваря и на /bg/widerruf, и на /en/widerruf, но текстът е и
  // остава НЕМСКИ: това е правен документ по немско право и превод на
  // него не е превод, а нов документ с друга правна тежест (виж
  // components/content/legal-page.tsx).
  //
  // Значи трите адреса не са три езикови версии, а три копия на едно и
  // също. hreflang между тях би излъгал търсачката; canonical ѝ казва
  // истината — индексирай едната.
  alternates: { canonical: "/de/widerruf" },
};

// Езикът се приема само за да е подписът същият като на останалите
// страници под [locale]. НЕ се ползва: текстът е немски НАРОЧНО и чака
// юрист — преводът му би създал втора редакция, която никой не е одобрил.
type Props = { params: Promise<{ locale: string }> };

export default async function WiderrufPage({ params }: Props) {
  await params;

  return (
    <LegalPage title="Widerrufsrecht" version={LEGAL_TEXT_VERSIONS.widerruf}>
      <AwaitingLegalText
        what={`Die Muster-Widerrufsbelehrung nach Anlage 1 zu Art. 246a EGBGB — WÖRTLICH, nicht umformuliert`}
      />

      <h2>Widerrufsbelehrung</h2>
      <p>
        Sie haben das Recht, binnen {WITHDRAWAL_PERIOD_DAYS} Tagen ohne Angabe
        von Gründen diesen Vertrag zu widerrufen.
      </p>
      <AwaitingLegalText what="Fortsetzung des Mustertextes inklusive Fristbeginn und Anschrift" />

      <h2>Muster-Widerrufsformular</h2>
      <AwaitingLegalText what="Formular nach Anlage 2 zu Art. 246a EGBGB" />

      <h2>Erlöschen des Widerrufsrechts bei digitalen Inhalten</h2>
      <p>
        Bei Verträgen über digitale Inhalte erlischt das Widerrufsrecht,
        wenn Sie ausdrücklich zugestimmt haben, dass wir mit der Ausführung
        vor Ablauf der Widerrufsfrist beginnen, und Sie bestätigt haben,
        dass Sie dadurch Ihr Widerrufsrecht verlieren. Wir bestätigen Ihnen
        diese Zustimmung zusätzlich per E-Mail.
      </p>
      <p>
        Diese Zustimmung holen wir im Bestellvorgang ein. Vor der Zustimmung
        wird kein Download freigegeben.
      </p>
      <AwaitingLegalText what="Prüfung dieses Abschnitts gegen § 356 Abs. 5 BGB" />
    </LegalPage>
  );
}
