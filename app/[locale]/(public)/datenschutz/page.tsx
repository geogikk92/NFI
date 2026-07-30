// ТЕРИТОРИЯ НА БОБИ · задача 3c.
// Писано от Жоро, докато Боби е в отпуск.
//
// Структурата следва Art. 13 GDPR. Текстовете чакат юрист — виж
// docs/ПРАВНИ-ИЗИСКВАНИЯ.md, отворен въпрос 6.

import type { Metadata } from "next";
import { LegalPage, AwaitingLegalText } from "@/components/content/legal-page";
import { LEGAL_TEXT_VERSIONS, DOC_RETENTION_DAYS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: true, follow: true },
};

export default function DatenschutzPage() {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      version={LEGAL_TEXT_VERSIONS.privacy}
    >
      <h2>1. Verantwortlicher</h2>
      <AwaitingLegalText what="Name und Kontaktdaten des Verantwortlichen (Art. 13 Abs. 1 lit. a DSGVO)" />

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Die folgende Übersicht ist technisch vollständig und entspricht dem,
        was die Anwendung tatsächlich speichert. Die rechtliche Formulierung
        muss noch geprüft werden.
      </p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Anlass</th>
              <th scope="col">Daten</th>
              <th scope="col">Speicherdauer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Rückrufbitte</th>
              <td>Name, E-Mail, Telefon, Nachricht, IP</td>
              <td>bis zur Erledigung, dann gesetzliche Fristen</td>
            </tr>
            <tr>
              <th scope="row">Newsletter</th>
              <td>E-Mail, Bestätigungszeitpunkt, IP, Textfassung</td>
              <td>bis zum Widerruf</td>
            </tr>
            <tr>
              <th scope="row">Bestellung</th>
              <td>Rechnungs- und Lieferdaten, Zahlungsart</td>
              <td>10 Jahre (Buchhaltungspflicht)</td>
            </tr>
            <tr>
              <th scope="row">Übersetzungsauftrag</th>
              <td>hochgeladene Dokumente</td>
              <td>{DOC_RETENTION_DAYS} Tage nach Lieferung</td>
            </tr>
            <tr>
              <th scope="row">Einstufungstest</th>
              <td>Antworten, Ergebnis, ggf. E-Mail</td>
              <td>bis zum Widerruf</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3. Rechtsgrundlagen</h2>
      <AwaitingLegalText what="Zuordnung der Verarbeitungen zu Art. 6 DSGVO" />

      <h2>4. Empfänger und Auftragsverarbeiter</h2>
      <p>
        Wir setzen die folgenden Dienste ein. Die Liste ist technisch
        vollständig; die Auftragsverarbeitungsverträge müssen vorliegen,
        bevor die Seite online geht.
      </p>
      <ul>
        <li>Vercel (Hosting, EU-Region)</li>
        <li>Mollie (Zahlungsabwicklung)</li>
        <li>Resend (transaktionale E-Mails)</li>
        <li>Cloudflare R2 bzw. S3 (Dateispeicher, EU-Region)</li>
      </ul>
      <AwaitingLegalText what="Bestätigung der Liste und der AV-Verträge" />

      <h2>5. Ihre Rechte</h2>
      <p>
        Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch,
        sowie das Recht, sich bei einer Aufsichtsbehörde zu beschweren.
      </p>
      <AwaitingLegalText what="Ausformulierung der Rechte und Nennung der zuständigen Aufsichtsbehörde" />

      <h2>6. Cookies</h2>
      <p>
        Ohne Ihre Einwilligung setzen wir nur technisch notwendige Cookies:
        die Sitzung, den Warenkorb und Ihre Cookie-Entscheidung selbst.
        Externe Videos und Analyse werden erst nach Ihrer Einwilligung
        geladen — nicht nur ausgeblendet.
      </p>
    </LegalPage>
  );
}
