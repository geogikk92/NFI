// ТЕРИТОРИЯ НА БОБИ · задача 3c.
// Писано от Жоро, докато Боби е в отпуск.

import type { Metadata } from "next";
import { LegalPage, AwaitingLegalText } from "@/components/content/legal-page";
import { LEGAL_TEXT_VERSIONS, ORDER_BUTTON_LABEL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "AGB",
  robots: { index: true, follow: true },
};

export default function AgbPage() {
  return (
    <LegalPage
      title="Allgemeine Geschäftsbedingungen"
      version={LEGAL_TEXT_VERSIONS.terms}
    >
      <AwaitingLegalText what="Der vollständige AGB-Text" />

      <h2>1. Geltungsbereich</h2>
      <AwaitingLegalText what="§ 1" />

      <h2>2. Vertragsschluss</h2>
      <p>
        Der Vertrag kommt zustande, wenn Sie im letzten Schritt der Bestellung
        auf „{ORDER_BUTTON_LABEL}&ldquo; klicken. Unmittelbar davor sehen Sie die
        wesentlichen Merkmale der Leistung, den Gesamtpreis inklusive
        Mehrwertsteuer, etwaige Versandkosten und die Vertragslaufzeit.
      </p>
      <AwaitingLegalText what="Prüfung dieser Formulierung gegen § 312j Abs. 3 BGB" />

      <h2>3. Preise und Zahlung</h2>
      <p>
        Alle Preise verstehen sich inklusive der gesetzlichen
        Mehrwertsteuer. Die Zahlung erfolgt über Mollie per Karte, PayPal,
        Klarna oder SEPA-Lastschrift. Barzahlung ist nicht möglich.
      </p>

      <h2>4. Lieferung digitaler Inhalte</h2>
      <AwaitingLegalText what="§ 4 — muss auf § 356 Abs. 5 BGB abgestimmt sein" />

      <h2>5. Kursanmeldung und Rücktritt</h2>
      <AwaitingLegalText what="Bedingungen für Kurse — Rücktritt, Ausfall, Mindestteilnehmerzahl" />

      <h2>6. Übersetzungsleistungen</h2>
      <AwaitingLegalText what="Bedingungen für beglaubigte Übersetzungen" />

      <h2>7. Gewährleistung und Haftung</h2>
      <AwaitingLegalText what="§ 7" />
    </LegalPage>
  );
}
