// ТЕРИТОРИЯ НА БОБИ · задача 3c.
// Писано от Жоро, докато Боби е в отпуск.
//
// Impressum по §5 DDG. Реквизитите ги изисква законът и са известни —
// стойностите идват от env, същите, с които се издават фактурите. Така
// адресът в Impressum-а и адресът във фактурата не могат да се разминат.

import type { Metadata } from "next";
import { LegalPage, AwaitingLegalText } from "@/components/content/legal-page";
import { LEGAL_TEXT_VERSIONS } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Impressum",
  // Impressum-ът се индексира — трябва да е намираем.
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  // Не се вика getSellerDetails(), защото тя хвърля при липсващи данни, а
  // Impressum-ът трябва да се отваря и докато env-ът е непълен — иначе
  // локалната разработка спира.
  const seller = {
    name: process.env.SELLER_NAME,
    eik: process.env.SELLER_EIK,
    vatId: process.env.SELLER_VAT_ID,
    address: process.env.SELLER_ADDRESS,
    mol: process.env.SELLER_MOL,
  };

  const complete = Boolean(seller.name && seller.eik && seller.address);

  return (
    <LegalPage title="Impressum" version={LEGAL_TEXT_VERSIONS.terms}>
      <h2>Angaben gemäß § 5 DDG</h2>

      {complete ? (
        <address>
          <strong>{seller.name}</strong>
          <br />
          {seller.address}
          <br />
          Bulgarien
        </address>
      ) : (
        <AwaitingLegalText
          what="Firmenangaben (SELLER_NAME, SELLER_EIK, SELLER_ADDRESS in der Umgebung)"
          who="der Buchhaltung"
        />
      )}

      <h3>Registereintrag</h3>
      <div className="table-wrap">
        <table>
          <tbody>
            <tr>
              <th scope="row">Handelsregister (EIK)</th>
              <td>{seller.eik || "—"}</td>
            </tr>
            <tr>
              <th scope="row">USt-IdNr.</th>
              <td>
                {seller.vatId || (
                  <span className="text-muted-foreground">
                    nicht umsatzsteuerpflichtig registriert
                  </span>
                )}
              </td>
            </tr>
            <tr>
              <th scope="row">Vertretungsberechtigt</th>
              <td>{seller.mol || "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Kontakt</h3>
      <AwaitingLegalText
        what="Telefonnummer und E-Mail-Adresse für das Impressum"
        who="der Kundin"
      />

      <h2>Verantwortlich für den Inhalt</h2>
      <AwaitingLegalText what="Angabe nach § 18 Abs. 2 MStV" />

      <h2>Streitschlichtung</h2>
      <p>
        Wir sind nicht verpflichtet und nicht bereit, an einem
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>
      <AwaitingLegalText
        what="Bestätigung dieser Formulierung — sie ist eine Entscheidung, keine Standardklausel"
      />

      <h2>Haftung für Inhalte und Links</h2>
      <AwaitingLegalText what="Haftungsausschluss" />
    </LegalPage>
  );
}
