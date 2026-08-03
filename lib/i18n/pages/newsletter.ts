// ТЕРИТОРИЯ НА БОБИ · задача 7 — текстовете на бюлетина.
// Българският е източникът; немският и английският са преводи.

import type { Locale } from "../config";

const bg = {
  /** Блокът във футъра. */
  form: {
    heading: "Бюлетин с материали",
    lede: "Учебни материали и новини, направо в пощата. Без спам, отписваш се с един клик.",
    emailLabel: "Имейл адрес",
    emailPlaceholder: "ти@пример.бг",
    submit: "Абонирай ме",
    submitting: "Записваме…",
    consentNote:
      "С абонирането се съгласяваш да получаваш бюлетина на NFI. Отписването е един клик във всяко писмо.",
    /** result-кодове от action-а. */
    result: {
      pending:
        "Почти готово! Изпратихме ти писмо — кликни линка в него, за да потвърдиш.",
      already: "Този имейл вече е в списъка. Радваме се, че си с нас!",
      invalid: "Провери имейл адреса — нещо в него не е наред.",
      failed: "Записът не мина. Опитай пак след минута.",
      devHint: "Имейлите още не са включени — потвърди директно оттук:",
    },
  },

  /** Страницата след клик върху линка за потвърждение. */
  confirm: {
    metaTitle: "Потвърждение на абонамента",
    confirmed: {
      title: "Абонаментът е потвърден.",
      body: "Добре дошъл в бюлетина на NFI! Първото писмо с материали идва скоро.",
    },
    already: {
      title: "Вече си потвърден.",
      body: "Този линк е използван по-рано — всичко е наред, в списъка си.",
    },
    notFound: {
      title: "Линкът не е разпознат.",
      body: "Или е изтекъл, или е копиран частично. Запиши се отново от формата долу във футъра.",
    },
    backHome: "Към началото",
  },

  /** Страницата за отписване. */
  unsubscribe: {
    metaTitle: "Отписване от бюлетина",
    done: {
      title: "Отписахме те.",
      body: "Няма да получаваш повече писма от нас. Ако размислиш, формата във футъра те чака.",
    },
    already: {
      title: "Вече си отписан.",
      body: "Този имейл не получава писма от нас.",
    },
    notFound: {
      title: "Линкът не е разпознат.",
      body: "Или е изтекъл, или е копиран частично.",
    },
    backHome: "Към началото",
  },
};

export type NewsletterCopy = typeof bg;

const de: NewsletterCopy = {
  form: {
    heading: "Newsletter mit Materialien",
    lede: "Lernmaterialien und Neuigkeiten, direkt ins Postfach. Kein Spam, Abmeldung mit einem Klick.",
    emailLabel: "E-Mail-Adresse",
    emailPlaceholder: "du@beispiel.de",
    submit: "Abonnieren",
    submitting: "Wird gespeichert…",
    consentNote:
      "Mit dem Abonnieren stimmst du dem NFI-Newsletter zu. Die Abmeldung ist ein Klick in jeder E-Mail.",
    result: {
      pending:
        "Fast geschafft! Wir haben dir eine E-Mail geschickt — klicke den Link darin zur Bestätigung.",
      already: "Diese E-Mail ist schon auf der Liste. Schön, dass du dabei bist!",
      invalid: "Prüfe die E-Mail-Adresse — etwas stimmt daran nicht.",
      failed: "Die Anmeldung hat nicht geklappt. Versuche es in einer Minute erneut.",
      devHint: "E-Mails sind noch nicht aktiv — bestätige direkt hier:",
    },
  },
  confirm: {
    metaTitle: "Anmeldung bestätigen",
    confirmed: {
      title: "Anmeldung bestätigt.",
      body: "Willkommen beim NFI-Newsletter! Die erste E-Mail mit Materialien kommt bald.",
    },
    already: {
      title: "Du bist schon bestätigt.",
      body: "Dieser Link wurde bereits benutzt — alles gut, du bist auf der Liste.",
    },
    notFound: {
      title: "Link nicht erkannt.",
      body: "Entweder abgelaufen oder unvollständig kopiert. Melde dich über das Formular im Footer neu an.",
    },
    backHome: "Zur Startseite",
  },
  unsubscribe: {
    metaTitle: "Vom Newsletter abmelden",
    done: {
      title: "Du bist abgemeldet.",
      body: "Du bekommst keine E-Mails mehr von uns. Falls du es dir anders überlegst — das Formular im Footer wartet.",
    },
    already: {
      title: "Schon abgemeldet.",
      body: "Diese E-Mail bekommt keine Nachrichten von uns.",
    },
    notFound: {
      title: "Link nicht erkannt.",
      body: "Entweder abgelaufen oder unvollständig kopiert.",
    },
    backHome: "Zur Startseite",
  },
};

const en: NewsletterCopy = {
  form: {
    heading: "Newsletter with materials",
    lede: "Learning materials and news, straight to your inbox. No spam, one-click unsubscribe.",
    emailLabel: "Email address",
    emailPlaceholder: "you@example.com",
    submit: "Subscribe",
    submitting: "Saving…",
    consentNote:
      "By subscribing you agree to receive the NFI newsletter. Unsubscribing is one click in every email.",
    result: {
      pending:
        "Almost there! We sent you an email — click the link inside to confirm.",
      already: "This email is already on the list. Glad to have you!",
      invalid: "Check the email address — something is off.",
      failed: "Sign-up failed. Try again in a minute.",
      devHint: "Emails are not live yet — confirm directly here:",
    },
  },
  confirm: {
    metaTitle: "Confirm subscription",
    confirmed: {
      title: "Subscription confirmed.",
      body: "Welcome to the NFI newsletter! The first email with materials is coming soon.",
    },
    already: {
      title: "Already confirmed.",
      body: "This link was used before — all good, you are on the list.",
    },
    notFound: {
      title: "Link not recognised.",
      body: "Either expired or partially copied. Sign up again from the footer form.",
    },
    backHome: "Back to home",
  },
  unsubscribe: {
    metaTitle: "Unsubscribe from the newsletter",
    done: {
      title: "You are unsubscribed.",
      body: "You will not receive further emails from us. If you change your mind, the footer form is waiting.",
    },
    already: {
      title: "Already unsubscribed.",
      body: "This email does not receive messages from us.",
    },
    notFound: {
      title: "Link not recognised.",
      body: "Either expired or partially copied.",
    },
    backHome: "Back to home",
  },
};

const COPY: Record<Locale, NewsletterCopy> = { bg, de, en };

export function newsletterCopy(locale: Locale): NewsletterCopy {
  return COPY[locale] ?? COPY.bg;
}
