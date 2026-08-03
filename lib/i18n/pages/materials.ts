// ТЕРИТОРИЯ НА БОБИ · задача 8 — текстовете на безплатните материали.
// Българският е източникът; немският и английският са преводи.

import type { Locale } from "../config";
import type { MaterialKind } from "@/lib/cms/free-materials";

const bg = {
  metaTitle: "Безплатни материали по немски",
  metaDescription:
    "Записи от занятия, PDF-и и упражнения по немски — безплатно, срещу имейл. Гледаш, харесва ти — продължаваш с курс.",

  hero: {
    kicker: "Безплатно · записи и PDF",
    title: "Започни с безплатното. Сериозно.",
    lede: "Пълни записи от наши занятия и материали за сваляне. Гледаш, харесва ти — обаждаме се и продължаваш истински.",
  },

  kinds: {
    PDF: "PDF за сваляне",
    VIDEO_VIMEO: "Видео запис",
    VIDEO_GOTO: "Запис от занятие",
    AUDIO: "Аудио",
    LINK: "Външен материал",
  } satisfies Record<MaterialKind, string>,

  levelLabel: "Ниво",

  empty: {
    title: "Точно сега няма публикувани материали",
    body: "Подготвяме първите. Запиши се за бюлетина долу — там пристигат първо.",
  },

  detail: {
    open: "Отвори материала",
    watch: "Гледай записа",
    backToAll: "Всички материали",
    videoConsentTitle: "Записът се зарежда от външен доставчик",
  },

  form: {
    heading: "Вземи материала",
    lede: "Кажи ни име и имейл — линкът за сваляне се показва веднага и пристига в пощата ти.",
    videoLede:
      "Хареса ли ти? Остави име и имейл — пращаме ти новите записи, щом излязат.",
    videoSubmit: "Искам още такива материали",
    nameLabel: "Име",
    namePlaceholder: "Как да се обръщаме към теб",
    emailLabel: "Имейл адрес",
    emailPlaceholder: "ти@пример.бг",
    newsletterLabel:
      "Искам и бюлетина: учебни материали и новини, отписване с един клик.",
    submit: "Дай ми линка",
    submitting: "Момент…",
    privacyNote:
      "Ползваме имейла само за да ти пратим материала. Бюлетинът е отделна отметка — по избор.",
  },

  result: {
    successTitle: "Готово! Линкът е твой.",
    successBody:
      "Свали материала от бутона долу. Линкът работи 72 часа — и е само за теб.",
    download: "Свали материала",
    videoReady:
      "Материалът е видео — гледа се направо на тази страница, по-горе.",
    emailFollowup: "Пратихме линка и на имейла ти, за всеки случай.",
    checkFields: "Провери отбелязаните полета.",
    rateLimited:
      "Твърде много заявки от тази мрежа за кратко време. Опитай след час.",
    failed: "Нещо се обърка при записа. Опитай пак след минута.",
  },

  fieldErrors: {
    "name-too-short": "Името е твърде кратко.",
    "name-too-long": "Името е твърде дълго.",
    "email-invalid": "Провери имейл адреса.",
  } as Record<string, string>,

  download: {
    /** Страницата/отговорите на /download/[token]. */
    expired:
      "Линкът е изтекъл. Заяви материала отново от страницата му — отнема половин минута.",
    exhausted: "Този линк е използван максималния брой пъти.",
    revoked: "Линкът е спрян.",
    notFound: "Линкът не е разпознат — вероятно е копиран частично.",
    noFile: "Файлът на материала още не е качен. Пробвай по-късно.",
  },
};

export type MaterialsCopy = typeof bg;

const de: MaterialsCopy = {
  metaTitle: "Kostenlose Deutsch-Materialien",
  metaDescription:
    "Aufzeichnungen aus dem Unterricht, PDFs und Übungen — kostenlos gegen E-Mail. Anschauen, mögen — weitermachen mit einem Kurs.",

  hero: {
    kicker: "Kostenlos · Aufzeichnungen und PDF",
    title: "Fang mit dem Kostenlosen an. Wirklich.",
    lede: "Vollständige Aufzeichnungen aus unserem Unterricht und Materialien zum Herunterladen. Anschauen, mögen — wir rufen an und du machst richtig weiter.",
  },

  kinds: {
    PDF: "PDF zum Download",
    VIDEO_VIMEO: "Videoaufzeichnung",
    VIDEO_GOTO: "Unterrichtsaufzeichnung",
    AUDIO: "Audio",
    LINK: "Externes Material",
  },

  levelLabel: "Niveau",

  empty: {
    title: "Gerade sind keine Materialien veröffentlicht",
    body: "Die ersten sind in Arbeit. Trag dich unten in den Newsletter ein — dort kommen sie zuerst an.",
  },

  detail: {
    open: "Material öffnen",
    watch: "Aufzeichnung ansehen",
    backToAll: "Alle Materialien",
    videoConsentTitle: "Die Aufzeichnung wird von einem externen Anbieter geladen",
  },

  form: {
    heading: "Material erhalten",
    lede: "Name und E-Mail genügen — der Download-Link erscheint sofort und kommt zusätzlich per E-Mail.",
    videoLede:
      "Hat es dir gefallen? Name und E-Mail genügen — wir schicken dir neue Aufzeichnungen, sobald sie erscheinen.",
    videoSubmit: "Ich möchte mehr solche Materialien",
    nameLabel: "Name",
    namePlaceholder: "Wie sollen wir dich ansprechen",
    emailLabel: "E-Mail-Adresse",
    emailPlaceholder: "du@beispiel.de",
    newsletterLabel:
      "Ich möchte auch den Newsletter: Lernmaterialien und Neuigkeiten, Abmeldung mit einem Klick.",
    submit: "Link anzeigen",
    submitting: "Moment…",
    privacyNote:
      "Wir nutzen die E-Mail nur, um dir das Material zu schicken. Der Newsletter ist eine separate Checkbox — freiwillig.",
  },

  result: {
    successTitle: "Fertig! Der Link gehört dir.",
    successBody:
      "Lade das Material über den Button unten herunter. Der Link gilt 72 Stunden — und nur für dich.",
    download: "Material herunterladen",
    videoReady:
      "Das Material ist ein Video — du kannst es direkt oben auf dieser Seite ansehen.",
    emailFollowup: "Wir haben den Link zur Sicherheit auch an deine E-Mail geschickt.",
    checkFields: "Prüfe die markierten Felder.",
    rateLimited:
      "Zu viele Anfragen aus diesem Netzwerk in kurzer Zeit. Versuche es in einer Stunde.",
    failed: "Beim Speichern ging etwas schief. Versuche es in einer Minute erneut.",
  },

  fieldErrors: {
    "name-too-short": "Der Name ist zu kurz.",
    "name-too-long": "Der Name ist zu lang.",
    "email-invalid": "Prüfe die E-Mail-Adresse.",
  },

  download: {
    expired:
      "Der Link ist abgelaufen. Fordere das Material neu an — dauert eine halbe Minute.",
    exhausted: "Dieser Link wurde bereits maximal oft benutzt.",
    revoked: "Der Link wurde deaktiviert.",
    notFound: "Link nicht erkannt — vermutlich unvollständig kopiert.",
    noFile: "Die Datei ist noch nicht hochgeladen. Versuche es später.",
  },
};

const en: MaterialsCopy = {
  metaTitle: "Free German learning materials",
  metaDescription:
    "Lesson recordings, PDFs and exercises — free, in exchange for an email. Watch, like it — continue with a course.",

  hero: {
    kicker: "Free · recordings and PDF",
    title: "Start with the free stuff. Seriously.",
    lede: "Full recordings from our lessons and downloadable materials. Watch, like it — we call you and you continue for real.",
  },

  kinds: {
    PDF: "PDF download",
    VIDEO_VIMEO: "Video recording",
    VIDEO_GOTO: "Lesson recording",
    AUDIO: "Audio",
    LINK: "External material",
  },

  levelLabel: "Level",

  empty: {
    title: "No materials published right now",
    body: "The first ones are in the works. Join the newsletter below — they arrive there first.",
  },

  detail: {
    open: "Open material",
    watch: "Watch the recording",
    backToAll: "All materials",
    videoConsentTitle: "The recording loads from an external provider",
  },

  form: {
    heading: "Get the material",
    lede: "Just your name and email — the download link appears immediately and also lands in your inbox.",
    videoLede:
      "Liked it? Leave your name and email — we send you new recordings as they come out.",
    videoSubmit: "Send me more like this",
    nameLabel: "Name",
    namePlaceholder: "What should we call you",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    newsletterLabel:
      "I also want the newsletter: learning materials and news, one-click unsubscribe.",
    submit: "Show me the link",
    submitting: "One moment…",
    privacyNote:
      "We use your email only to send you the material. The newsletter is a separate checkbox — optional.",
  },

  result: {
    successTitle: "Done! The link is yours.",
    successBody:
      "Download the material from the button below. The link works for 72 hours — and only for you.",
    download: "Download material",
    videoReady:
      "This material is a video — watch it right on this page, above.",
    emailFollowup: "We also sent the link to your email, just in case.",
    checkFields: "Check the highlighted fields.",
    rateLimited:
      "Too many requests from this network in a short time. Try again in an hour.",
    failed: "Something went wrong while saving. Try again in a minute.",
  },

  fieldErrors: {
    "name-too-short": "The name is too short.",
    "name-too-long": "The name is too long.",
    "email-invalid": "Check the email address.",
  },

  download: {
    expired:
      "The link has expired. Request the material again from its page — takes half a minute.",
    exhausted: "This link has been used the maximum number of times.",
    revoked: "The link has been disabled.",
    notFound: "Link not recognised — probably partially copied.",
    noFile: "The file has not been uploaded yet. Try again later.",
  },
};

const COPY: Record<Locale, MaterialsCopy> = { bg, de, en };

export function materialsCopy(locale: Locale): MaterialsCopy {
  return COPY[locale] ?? COPY.bg;
}
