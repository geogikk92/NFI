// ТЕРИТОРИЯ НА БОБИ · задача 16 — текстовете около сертификатите.
// Българският е източникът; немският и английският са преводи.
//
// Тук са И публичната проверка (/zertifikat/[code]), И разделът в профила
// — един файл, защото делят думите: „номер", „ниво", „издаден на".

import type { Locale } from "../config";

const bg = {
  /** Публичната страница за проверка на автентичност. */
  verify: {
    metaTitle: "Проверка на сертификат",
    kicker: "Проверка на сертификат",
    valid: {
      title: "Сертификатът е валиден.",
      body: "Този документ е издаден от Nürnberger Fremdsprachen Institut и данните по-долу са официалният му запис.",
    },
    revoked: {
      title: "Сертификатът е отменен.",
      body: "Този номер е съществувал, но е отменен от института и вече не удостоверява завършен курс.",
    },
    notFound: {
      title: "Кодът не е разпознат.",
      body: "Не открихме сертификат с този код. Провери дали е преписан точно както е отпечатан в PDF документа — без значение са малки и главни букви и тиретата.",
    },
    labels: {
      number: "Номер",
      holder: "Издаден на",
      course: "Курс",
      level: "Ниво (ОЕЕР)",
      issuedAt: "Дата на издаване",
      revokedAt: "Отменен на",
      status: "Състояние",
    },
    statusValid: "валиден",
    statusRevoked: "отменен",
    backHome: "Към началото",
  },

  /** Разделът в профила. */
  profile: {
    heading: "Сертификати",
    lead: "Издадените ти сертификати за завършени курсове. PDF файлът и кодът за проверка са ти винаги подръка.",
    empty:
      "Сертификатите се появяват тук, когато завършиш курс — заедно с PDF за сваляне и код за проверка.",
    download: "Свали PDF",
    verifyLink: "Страница за проверка",
    revokedNote: "Отменен",
  },

  /** Съобщенията на route-а за сваляне (/api/certificate/[id]). */
  download: {
    needLogin: "Свалянето на сертификат иска вход в профила.",
    notFound: "Няма такъв сертификат.",
    revoked: "Сертификатът е отменен и PDF файлът му вече не се предоставя.",
  },
};

export type CertificatesCopy = typeof bg;

const de: CertificatesCopy = {
  verify: {
    metaTitle: "Zertifikat prüfen",
    kicker: "Zertifikatsprüfung",
    valid: {
      title: "Das Zertifikat ist gültig.",
      body: "Dieses Dokument wurde vom Nürnberger Fremdsprachen Institut ausgestellt; die Angaben unten sind sein offizieller Eintrag.",
    },
    revoked: {
      title: "Das Zertifikat wurde widerrufen.",
      body: "Diese Nummer hat existiert, wurde aber vom Institut widerrufen und bestätigt keinen abgeschlossenen Kurs mehr.",
    },
    notFound: {
      title: "Der Code wurde nicht erkannt.",
      body: "Wir haben kein Zertifikat mit diesem Code gefunden. Prüfe, ob er genau wie im PDF-Dokument gedruckt übertragen wurde — Groß-/Kleinschreibung und Bindestriche spielen keine Rolle.",
    },
    labels: {
      number: "Nummer",
      holder: "Ausgestellt auf",
      course: "Kurs",
      level: "Niveau (GER)",
      issuedAt: "Ausstellungsdatum",
      revokedAt: "Widerrufen am",
      status: "Status",
    },
    statusValid: "gültig",
    statusRevoked: "widerrufen",
    backHome: "Zur Startseite",
  },
  profile: {
    heading: "Zertifikate",
    lead: "Deine Zertifikate für abgeschlossene Kurse. PDF-Datei und Prüfcode sind immer griffbereit.",
    empty:
      "Zertifikate erscheinen hier, sobald du einen Kurs abschließt — mit PDF zum Herunterladen und Prüfcode.",
    download: "PDF herunterladen",
    verifyLink: "Prüfseite",
    revokedNote: "Widerrufen",
  },
  download: {
    needLogin: "Zum Herunterladen des Zertifikats bitte anmelden.",
    notFound: "Kein solches Zertifikat.",
    revoked:
      "Das Zertifikat wurde widerrufen; die PDF-Datei wird nicht mehr bereitgestellt.",
  },
};

const en: CertificatesCopy = {
  verify: {
    metaTitle: "Verify a certificate",
    kicker: "Certificate verification",
    valid: {
      title: "The certificate is valid.",
      body: "This document was issued by the Nürnberger Fremdsprachen Institut; the details below are its official record.",
    },
    revoked: {
      title: "The certificate has been revoked.",
      body: "This number did exist, but the institute has revoked it and it no longer attests a completed course.",
    },
    notFound: {
      title: "The code was not recognised.",
      body: "We could not find a certificate with this code. Check that it matches the print in the PDF document — case and dashes do not matter.",
    },
    labels: {
      number: "Number",
      holder: "Issued to",
      course: "Course",
      level: "Level (CEFR)",
      issuedAt: "Date of issue",
      revokedAt: "Revoked on",
      status: "Status",
    },
    statusValid: "valid",
    statusRevoked: "revoked",
    backHome: "Back to home",
  },
  profile: {
    heading: "Certificates",
    lead: "Your certificates for completed courses. The PDF file and the verification code are always at hand.",
    empty:
      "Certificates appear here once you complete a course — with a downloadable PDF and a verification code.",
    download: "Download PDF",
    verifyLink: "Verification page",
    revokedNote: "Revoked",
  },
  download: {
    needLogin: "Downloading a certificate requires signing in.",
    notFound: "No such certificate.",
    revoked:
      "The certificate has been revoked; its PDF file is no longer provided.",
  },
};

const COPY: Record<Locale, CertificatesCopy> = { bg, de, en };

export function certificatesCopy(locale: Locale): CertificatesCopy {
  return COPY[locale] ?? COPY.bg;
}
