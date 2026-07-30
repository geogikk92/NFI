// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — текстове.
//
// Речникът (lib/i18n/dictionaries.ts) вече има ключ `auth` с етикетите на
// полетата и заглавията — той се ползва първо и НЕ се пипа оттук, защото по
// него работят други агенти. Тук са само нещата, които го нямат: текстовете
// на грешките (по код от lib/auth/register.ts), правните пояснения и
// частите на етикета, в които влиза връзка.
//
// Образецът е същият като на речника: `de` е източникът, типът се извежда
// от него, а `bg` и `en` се обявяват с този тип — така tsc не пуска
// непълен превод.

import type { Locale } from "@/lib/i18n/config";
import type { RegisterErrorCode } from "@/lib/auth/register";

const de = {
  /** Текстовете на кодовете от registerSchema. */
  errors: {
    nameTooShort: "Bitte geben Sie Ihren Namen an (mindestens zwei Zeichen).",
    nameTooLong: "Der Name ist zu lang.",
    emailInvalid: "Bitte prüfen Sie Ihre E-Mail-Adresse.",
    emailTooLong: "Die E-Mail-Adresse ist zu lang.",
    passwordTooShort:
      "Das Passwort braucht mindestens 10 Zeichen. Ein Satz ist leichter zu merken als ein kurzes, kompliziertes Passwort.",
    passwordTooLong: "Das Passwort ist zu lang (höchstens 200 Zeichen).",
    passwordTooCommon:
      "Dieses Passwort wird sehr häufig verwendet. Bitte wählen Sie ein anderes.",
    passwordLooksLikeEmail:
      "Das Passwort darf nicht Ihre E-Mail-Adresse enthalten.",
    passwordMismatch: "Die beiden Passwörter stimmen nicht überein.",
    phoneTooLong: "Die Telefonnummer ist zu lang.",
    phoneInvalid: "Bitte prüfen Sie die Telefonnummer.",
    termsRequired:
      "Ohne Zustimmung zu den AGB können wir kein Konto anlegen.",
    privacyRequired:
      "Ohne Kenntnisnahme der Datenschutzerklärung können wir kein Konto anlegen.",
    fieldInvalid: "Bitte füllen Sie dieses Feld aus.",
  } satisfies Record<RegisterErrorCode, string>,

  /** Обобщението над формата, когато има сгрешени полета. */
  formError: "Bitte prüfen Sie die markierten Felder.",
  formErrorTitle: "Das Konto wurde noch nicht angelegt",
  genericError:
    "Das Konto konnte gerade nicht angelegt werden. Bitte versuchen Sie es erneut oder rufen Sie uns an.",

  /** Групата с отметките. */
  consentLegend: "Einverständnis",
  acceptTermsBefore: "Ich akzeptiere die",
  termsLink: "AGB",
  acceptPrivacyBefore: "Ich habe die",
  privacyLink: "Datenschutzerklärung",
  acceptPrivacyAfter: "gelesen",

  /** Подсказки под полетата. */
  emailHint: "An diese Adresse schicken wir den Bestätigungslink.",
  phoneHint: "Nur für Rückfragen zu Ihren Kursen. Freiwillig.",
  passwordConfirmHint: "Zur Sicherheit noch einmal — Tippfehler passieren.",

  /** Правната бележка под формата. */
  consentRecordNote:
    "Wir speichern zu Ihrer Zustimmung Datum, Uhrzeit, IP-Adresse und die Fassung des Textes, dem Sie zugestimmt haben. Das ist gesetzlich vorgeschrieben (Art. 7 DSGVO) und dient dem Nachweis. Sie können Ihre Zustimmung zum Newsletter jederzeit widerrufen.",

  /** Вход. */
  loginPasswordLabel: "Passwort",
  loginEmailHint: "Die Adresse, mit der Sie sich registriert haben.",
  loginErrorEmail: "Bitte prüfen Sie Ihre E-Mail-Adresse.",
  loginErrorPassword: "Bitte geben Sie Ihr Passwort ein.",
  /**
   * ЕДНО съобщение за двата случая — непознат имейл и грешна парола.
   * Разделени, формата се превръща в справка кой има профил при нас: чужд
   * човек въвежда адрес и по отговора разбира дали клиентът е наш.
   */
  loginFailed:
    "E-Mail-Adresse oder Passwort stimmen nicht. Bitte versuchen Sie es erneut.",
  loginLocked:
    "Dieses Konto ist nicht aktiv. Bitte melden Sie sich bei uns.",
  loginTooMany:
    "Zu viele Versuche. Bitte warten Sie 15 Minuten — oder rufen Sie uns an, wir helfen sofort.",

  /**
   * Текстовете от времето, когато входът не работеше.
   *
   * ЗАПАЗЕНИ нарочно: същият вид бележка ще потрябва при спиране за
   * поддръжка. Не се показват никъде — формата вече влиза наистина
   * (30.07.2026).
   */
  loginPendingTitle: "Die Anmeldung ist noch nicht freigeschaltet",
  // Без обещан срок („in wenigen Tagen"): датата не е потвърдена от клиента,
  // а обещание на страницата е обещание към човека (правило 8).
  loginPendingBody:
    "Die Konten werden gerade eingerichtet. Ihre Registrierung wird gespeichert — sobald die Anmeldung freigeschaltet ist, können Sie sich damit anmelden. Wenn Sie jetzt etwas brauchen, rufen Sie uns an oder schreiben Sie uns.",
  loginPendingCta: "Zum Kontakt",
};

/**
 * Типът се ИЗВЕЖДА от немския — както в речника. Липсващ ключ в `bg` или
 * `en` е грешка при компилация, а не празно място в продукция.
 */
type AuthTexts = typeof de;

const bg: AuthTexts = {
  errors: {
    nameTooShort: "Напиши името си (поне два знака).",
    nameTooLong: "Името е прекалено дълго.",
    emailInvalid: "Провери имейл адреса.",
    emailTooLong: "Имейл адресът е прекалено дълъг.",
    passwordTooShort:
      "Паролата трябва да е поне 10 знака. Цяло изречение се помни по-лесно от кратка сложна парола.",
    passwordTooLong: "Паролата е прекалено дълга (най-много 200 знака).",
    passwordTooCommon:
      "Тази парола се среща много често. Избери друга.",
    passwordLooksLikeEmail: "Паролата не бива да съдържа имейла ти.",
    passwordMismatch: "Двете пароли не съвпадат.",
    phoneTooLong: "Телефонният номер е прекалено дълъг.",
    phoneInvalid: "Провери телефонния номер.",
    termsRequired: "Без съгласие с общите условия не можем да създадем профил.",
    privacyRequired:
      "Без да си прочел политиката за защита на данните не можем да създадем профил.",
    fieldInvalid: "Попълни това поле.",
  },

  formError: "Провери отбелязаните полета.",
  formErrorTitle: "Профилът още не е създаден",
  genericError:
    "Профилът не можа да бъде създаден в момента. Опитай отново или ни се обади.",

  consentLegend: "Съгласия",
  acceptTermsBefore: "Приемам",
  termsLink: "общите условия",
  acceptPrivacyBefore: "Прочетох",
  privacyLink: "политиката за защита на данните",
  acceptPrivacyAfter: "",

  emailHint: "На този адрес изпращаме линка за потвърждение.",
  phoneHint: "Само за въпроси по курсовете. По желание.",
  passwordConfirmHint: "За сигурност още веднъж — печатните грешки се случват.",

  consentRecordNote:
    "За съгласието ти запазваме дата, час, IP адрес и версията на текста, с който си се съгласил. Това се изисква по закон (чл. 7 GDPR) и служи за доказване. Съгласието за бюлетина може да се оттегли по всяко време.",

  loginPasswordLabel: "Парола",
  loginEmailHint: "Адресът, с който си се регистрирал.",
  loginErrorEmail: "Провери имейл адреса.",
  loginErrorPassword: "Въведи паролата.",
  loginFailed: "Имейлът или паролата не съвпадат. Опитай пак.",
  loginLocked: "Профилът не е активен. Потърси ни.",
  loginTooMany:
    "Твърде много опити. Изчакай 15 минути — или ни се обади, помагаме веднага.",

  loginPendingTitle: "Входът още не е пуснат",
  loginPendingBody:
    "Профилите се настройват в момента. Регистрацията се запазва — щом входът бъде пуснат, ще можеш да влезеш с нея. Ако ти трябва нещо сега, обади ни се или ни пиши.",
  loginPendingCta: "Към контактите",
};

const en: AuthTexts = {
  errors: {
    nameTooShort: "Please enter your name (at least two characters).",
    nameTooLong: "That name is too long.",
    emailInvalid: "Please check your email address.",
    emailTooLong: "That email address is too long.",
    passwordTooShort:
      "The password needs at least 10 characters. A whole sentence is easier to remember than a short, complicated password.",
    passwordTooLong: "That password is too long (200 characters maximum).",
    passwordTooCommon:
      "This password is used very often. Please pick a different one.",
    passwordLooksLikeEmail: "The password must not contain your email address.",
    passwordMismatch: "The two passwords do not match.",
    phoneTooLong: "That phone number is too long.",
    phoneInvalid: "Please check the phone number.",
    termsRequired:
      "We cannot create an account without your agreement to the terms.",
    privacyRequired:
      "We cannot create an account until you have read the privacy policy.",
    fieldInvalid: "Please fill in this field.",
  },

  formError: "Please check the highlighted fields.",
  formErrorTitle: "The account has not been created yet",
  genericError:
    "We could not create the account just now. Please try again, or give us a call.",

  consentLegend: "Consent",
  acceptTermsBefore: "I accept the",
  termsLink: "terms and conditions",
  acceptPrivacyBefore: "I have read the",
  privacyLink: "privacy policy",
  acceptPrivacyAfter: "",

  emailHint: "We send the confirmation link to this address.",
  phoneHint: "Only for questions about your courses. Optional.",
  passwordConfirmHint: "Once more, to be safe — typos happen.",

  consentRecordNote:
    "For your consent we store the date, time, IP address and the version of the text you agreed to. This is required by law (Art. 7 GDPR) and serves as proof. You can withdraw your newsletter consent at any time.",

  loginPasswordLabel: "Password",
  loginEmailHint: "The address you registered with.",
  loginErrorEmail: "Please check your email address.",
  loginErrorPassword: "Please enter your password.",
  loginFailed: "Email or password does not match. Please try again.",
  loginLocked: "This account is not active. Please get in touch.",
  loginTooMany:
    "Too many attempts. Please wait 15 minutes — or call us, we'll help right away.",

  loginPendingTitle: "Signing in is not switched on yet",
  loginPendingBody:
    "Accounts are being set up right now. Your registration is stored — as soon as signing in is switched on, you will be able to use it. If you need something today, call us or send us a message.",
  loginPendingCta: "Go to contact",
};

const TEXTS: Record<Locale, AuthTexts> = { de, bg, en };

/**
 * Синхронно, както getDictionary: текстовете са малки и статични, а
 * динамичен import би направил всеки сървърен компонент async без нужда.
 */
export function getAuthTexts(locale: Locale): AuthTexts {
  return TEXTS[locale] ?? TEXTS.de;
}

export type { AuthTexts };
