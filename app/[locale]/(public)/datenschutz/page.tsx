// ТЕРИТОРИЯ НА БОБИ · задача 3c.
// Писано от Жоро, докато Боби е в отпуск.
//
// Структурата следва Art. 13 GDPR. Текстовете чакат юрист — виж
// docs/ПРАВНИ-ИЗИСКВАНИЯ.md, отворен въпрос 6.

import type { Metadata } from "next";
import {
  LegalPage,
  AwaitingLegalText,
  MissingRetentionJob,
} from "@/components/content/legal-page";
import { LEGAL_TEXT_VERSIONS, DOC_RETENTION_DAYS } from "@/lib/legal";
// Сроковете идват от КОНСТАНТИТЕ, не се пишат на ръка в текста. Число,
// преписано в правен документ, се разминава с кода при първата промяна — а
// разминаването между обещан и действителен срок е точно нарушението,
// което този раздел трябва да предотврати.
import { SESSION_TTL_DAYS } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: true, follow: true },
  // ТВЪРД canonical към немската версия — БЕЗ hreflang.
  //
  // Страницата се отваря и на /bg/datenschutz, и на /en/datenschutz, но текстът е и
  // остава НЕМСКИ: това е правен документ по немско право и превод на
  // него не е превод, а нов документ с друга правна тежест (виж
  // components/content/legal-page.tsx).
  //
  // Значи трите адреса не са три езикови версии, а три копия на едно и
  // също. hreflang между тях би излъгал търсачката; canonical ѝ казва
  // истината — индексирай едната.
  alternates: { canonical: "/de/datenschutz" },
};

// Езикът се приема само за да е подписът същият като на останалите
// страници под [locale]. НЕ се ползва: текстът е немски НАРОЧНО и чака
// юрист — преводът му би създал втора редакция, която никой не е одобрил.
type Props = { params: Promise<{ locale: string }> };

export default async function DatenschutzPage({ params }: Props) {
  await params;

  return (
    <LegalPage
      title="Datenschutzerklärung"
      version={LEGAL_TEXT_VERSIONS.privacy}
    >
      <h2>1. Verantwortlicher</h2>
      <AwaitingLegalText what="Name und Kontaktdaten des Verantwortlichen (Art. 13 Abs. 1 lit. a DSGVO)" />

      <h2>2. Welche Daten wir verarbeiten</h2>
      <p>
        Die folgende Übersicht listet jeden Datensatz auf, den die Anwendung
        anlegt — auch solche, die im Hintergrund entstehen und die man nicht
        selbst ausfüllt. Die rechtliche Formulierung muss noch geprüft
        werden.
      </p>
      <p>
        <strong>Zur letzten Spalte:</strong> Sie nennt, wie lange wir die
        Daten aufbewahren. Wo „vorgesehen“ steht, ist die Frist festgelegt,
        die automatische Löschung aber noch nicht in Betrieb — siehe den
        Hinweis unter der Tabelle.
      </p>

      {/* tabIndex={0} + role="region": таблицата се превърта настрани
      на тесен екран, а превъртаща се област без спирка на Tab е
      недостъпна без мишка (WCAG 2.1.1). Името е на НЕМСКИ като
      останалата страница — тя е правен документ на немски. */}
      <div
        className="table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Übersicht der gespeicherten Daten"
      >
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
              <td>
                Name, E-Mail, Telefon, Nachricht, Wunschzeit, der ausgewählte
                Kurs, IP-Adresse und Browserkennung (User-Agent)
              </td>
              <td>
                bis zur Erledigung, danach gesetzliche Fristen — noch keine
                automatische Löschung
              </td>
            </tr>
            <tr>
              <th scope="row">Konto</th>
              <td>
                E-Mail, Name, Telefon, Sprache und das Passwort — Letzteres
                ausschließlich als scrypt-Prüfsumme, niemals im Klartext
              </td>
              <td>bis zur Löschung des Kontos</td>
            </tr>
            <tr>
              <th scope="row">Bestätigungslink</th>
              <td>E-Mail-Adresse, Zufallsschlüssel, Ablaufzeitpunkt</td>
              <td>bis zur Bestätigung bzw. bis zum Ablauf</td>
            </tr>
            <tr>
              <th scope="row">Einwilligungen</th>
              <td>
                E-Mail, Art der Einwilligung (AGB, Datenschutz, Newsletter),
                die Fassung des Textes und deren Prüfsumme, Zeitpunkt,
                IP-Adresse, Browserkennung
              </td>
              <td>
                bleibt auch nach Löschung des Kontos bestehen — ohne diesen
                Nachweis lässt sich die Einwilligung nicht belegen
                (Art. 7 Abs. 1 DSGVO)
              </td>
            </tr>
            <tr>
              <th scope="row">Angemeldet bleiben</th>
              <td>
                Prüfsumme des Sitzungsschlüssels und Ablaufzeitpunkt. Der
                Schlüssel selbst steht nur in Ihrem Browser, nicht bei uns
              </td>
              <td>{SESSION_TTL_DAYS} Tage</td>
            </tr>
            <tr>
              <th scope="row">Fehlgeschlagene Anmeldung</th>
              <td>
                die <em>eingegebene</em> E-Mail-Adresse, IP-Adresse,
                Browserkennung und Zeitpunkt — auch dann, wenn zu dieser
                Adresse gar kein Konto besteht. Das schützt bestehende Konten
                vor dem Durchprobieren von Passwörtern
              </td>
              <td>
                vorgesehen: kurze Frist — automatische Löschung noch nicht in
                Betrieb
              </td>
            </tr>
            <tr>
              <th scope="row">Newsletter</th>
              <td>
                E-Mail, Name, Sprache, Bestätigungs- und Abmeldeschlüssel,
                Textfassung, Zeitpunkt, IP-Adresse
              </td>
              <td>bis zum Widerruf</td>
            </tr>
            <tr>
              <th scope="row">Bestellung</th>
              <td>
                Rechnungs- und Lieferdaten, Zahlungsart{" "}
                <em>(geplant — der Shop nimmt noch keine Zahlungen an)</em>
              </td>
              <td>10 Jahre (Buchhaltungspflicht)</td>
            </tr>
            <tr>
              <th scope="row">Übersetzungsauftrag</th>
              <td>
                hochgeladene Dokumente sowie Name, E-Mail, Telefon und die
                Sprachrichtung
              </td>
              <td>
                vorgesehen: {DOC_RETENTION_DAYS} Tage nach Lieferung —
                automatische Löschung noch nicht in Betrieb
              </td>
            </tr>
            <tr>
              <th scope="row">Einstufungstest</th>
              <td>
                die einzelnen Antworten, das Ergebnis sowie — freiwillig —
                Name und E-Mail
              </td>
              <td>bis zum Widerruf</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Низът е ЕДИН литерал, а не сглобен израз: скриптът
          scripts/check-legal-placeholders.mjs чете `what="…"` буквално и
          при израз изписва „(без описание)" — списък, който не казва
          какво липсва, не върши работа преди деплой. */}
      <MissingRetentionJob what="die automatische Löschung — zugesagt sind Fristen für Übersetzungsdokumente, Rückrufbitten und das Anmeldeprotokoll, es läuft aber keine einzige Löschroutine (vercel.json: crons ist leer)" />

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
