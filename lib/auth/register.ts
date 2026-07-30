// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — валидация.
//
// ЧИСТ модул: нито Prisma, нито node:crypto, нито next/headers. Формата
// (клиентски компонент) внася оттук имената на полетата и границите, за да
// не се разминават HTML атрибутите и сървърната проверка. Влезе ли тук
// `db`, pg тръгва към браузърния бъндъл и страницата дава 500 — виж
// lib/auth/register-db.ts за половината с базата.
//
// ГРЕШКИТЕ СА КОДОВЕ, не текстове. Регистрацията е на три езика, а
// съобщение, зашито в схемата, е на един. Кодът се превежда в
// lib/i18n/pages/auth.ts, където tsc пази пълнотата на превода.

import { z } from "zod";

/**
 * Минимална дължина на паролата.
 *
 * 10 знака без изисквания за главни букви и знаци — нарочно. Правилата
 * „поне един специален знак" произвеждат „Passwort1!", която е по-слаба от
 * „сонцето грее над Нюрнберг" и по-трудна за помнене. NIST SP 800-63B
 * казва същото: дължина, без задължителна сложност.
 *
 * Границите живеят ТУК, а не в password.ts, защото формата (клиентски
 * компонент) ги ползва за атрибута minLength — а password.ts внася
 * node:crypto и не може да стигне до браузъра.
 */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Горна граница. Цената на scrypt не зависи от дължината на входа, така че
 * това не е защита от натоварване — а от полета, в които някой е поставил
 * цял документ.
 */
export const MAX_PASSWORD_LENGTH = 200;

// ─────────────────────────────────────────────────────────────────────────
//  Имена на полетата
// ─────────────────────────────────────────────────────────────────────────

/**
 * Едно място за имената в HTML, в FormData и в схемата.
 *
 * Разписването им на ръка на три места е класическият начин полето да се
 * преименува в формата и валидацията тихо да започне да чете undefined.
 */
export const REGISTER_FIELDS = [
  "name",
  "email",
  "password",
  "passwordConfirm",
  "phone",
  "acceptTerms",
  "acceptPrivacy",
  "newsletter",
] as const;

export type RegisterField = (typeof REGISTER_FIELDS)[number];

/** Скритото поле, което носи езика до server action-а. */
export const LOCALE_FIELD = "locale";

// ─────────────────────────────────────────────────────────────────────────
//  Кодове на грешките
// ─────────────────────────────────────────────────────────────────────────

export const REGISTER_ERROR_CODES = [
  "nameTooShort",
  "nameTooLong",
  "emailInvalid",
  "emailTooLong",
  "passwordTooShort",
  "passwordTooLong",
  "passwordTooCommon",
  "passwordLooksLikeEmail",
  "passwordMismatch",
  "phoneTooLong",
  "phoneInvalid",
  "termsRequired",
  "privacyRequired",
  /** Резервен: поле, което изобщо липсва или е с невъзможен тип. */
  "fieldInvalid",
] as const;

export type RegisterErrorCode = (typeof REGISTER_ERROR_CODES)[number];

function isRegisterErrorCode(value: string): value is RegisterErrorCode {
  return (REGISTER_ERROR_CODES as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────────────────────────────────
//  Схема
// ─────────────────────────────────────────────────────────────────────────

/** 254 знака е максимумът на адрес по RFC 5321. */
const MAX_EMAIL_LENGTH = 254;

/**
 * Телефонът е свободен текст с граници, не строг формат: клиентите пишат
 * „0911 / 12 34 56", „+49 (0)911 123456" и „089-1234567", и всичките са
 * верни. Отхвърля се само това, което очевидно не е телефон.
 */
const PHONE_PATTERN = /^[+0-9][0-9\s\-/().]{4,}$/;

/**
 * Пароли, които се срещат в първите редове на всеки речник за подбор.
 * Списъкът е нарочно кратък — сериозната проверка е дължината. Целта е да
 * не мине „passwort12", която пази 10 знака и не пази нищо.
 */
const COMMON_PASSWORDS = new Set([
  "passwort12",
  "passwort123",
  "passwort1234",
  "password12",
  "password123",
  "password1234",
  "1234567890",
  "12345678901",
  "123456789012",
  "qwertzuiop",
  "qwertyuiop",
  "willkommen",
  "willkommen1",
  "geheimnis1",
  "parola1234",
  "администратор",
]);

/**
 * FormData дава "on" за маркирано и НЕ дава нищо за немаркирано — липсата е
 * законен „не", не грешка във входа.
 */
function toCheckbox(value: unknown): boolean {
  return value === "on" || value === "true" || value === true;
}

function isTooCommon(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;

  // „aaaaaaaaaa" пази дължината и нула ентропия.
  return /^(.)\1+$/.test(password);
}

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "nameTooShort")
      .max(120, "nameTooLong"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("emailInvalid")
      .max(MAX_EMAIL_LENGTH, "emailTooLong"),
    // Паролата НЕ се trim-ва: краен интервал е част от нея.
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, "passwordTooShort")
      .max(MAX_PASSWORD_LENGTH, "passwordTooLong"),
    passwordConfirm: z.string(),
    // Обединението (`.or(z.literal(""))`) е избегнато нарочно: при съюз zod
    // връща issue с път към клона, а не към полето, и съобщението не стига
    // до входа във формата.
    phone: z
      .string()
      .trim()
      .max(40, "phoneTooLong")
      .refine((value) => value === "" || PHONE_PATTERN.test(value), "phoneInvalid")
      // `.optional()` (а не съюз с празен низ): липсващото поле е законно
      // „не съм казал", а пътят на грешката остава „phone".
      .optional(),
    acceptTerms: z.preprocess(
      toCheckbox,
      z.boolean().refine((value) => value, "termsRequired"),
    ),
    acceptPrivacy: z.preprocess(
      toCheckbox,
      z.boolean().refine((value) => value, "privacyRequired"),
    ),
    newsletter: z.preprocess(toCheckbox, z.boolean()),
  })
  .superRefine((value, ctx) => {
    // Потвърждението се проверява ТУК, а не в полето: то зависи от друго
    // поле и грешката трябва да застане при повторната парола, защото там
    // е поправката.
    if (value.password !== value.passwordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["passwordConfirm"],
        message: "passwordMismatch",
      });
    }

    if (isTooCommon(value.password)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "passwordTooCommon",
      });
    }

    // Паролата „ivan.petrov" при имейл ivan.petrov@… е публично известна.
    const localPart = value.email.split("@")[0] ?? "";
    if (
      localPart.length >= 4 &&
      value.password.toLowerCase().includes(localPart.toLowerCase())
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "passwordLooksLikeEmail",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ─────────────────────────────────────────────────────────────────────────
//  Вход от формата
// ─────────────────────────────────────────────────────────────────────────

/**
 * FormData → обикновен обект.
 *
 * Тук е, а не в server action-а, за да е тестваемо: точно превръщането на
 * „липсващ чекбокс" в „не" е мястото, където се допускат грешки.
 */
export function readRegisterForm(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  for (const field of REGISTER_FIELDS) {
    const value = formData.get(field);
    raw[field] = value === null ? undefined : String(value);
  }

  return raw;
}

export type RegisterFieldErrors = Partial<Record<RegisterField, RegisterErrorCode>>;

export type RegisterValidation =
  | { ok: true; data: RegisterInput }
  | { ok: false; errors: RegisterFieldErrors };

export function validateRegistration(raw: unknown): RegisterValidation {
  const parsed = registerSchema.safeParse(raw);

  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: RegisterFieldErrors = {};

  for (const issue of parsed.error.issues) {
    const path = String(issue.path[0] ?? "");
    if (!(REGISTER_FIELDS as readonly string[]).includes(path)) continue;

    const field = path as RegisterField;
    // Първата грешка за поле стига — стек от съобщения върху един вход е шум.
    if (errors[field]) continue;

    // zod слага свой текст, когато типът е сбъркан („expected string,
    // received undefined"). Той не е наш код и не бива да стига до екрана.
    errors[field] = isRegisterErrorCode(issue.message)
      ? issue.message
      : "fieldInvalid";
  }

  // Провалила се схема без разпознато поле пак трябва да спре нещата.
  if (Object.keys(errors).length === 0) errors.email = "fieldInvalid";

  return { ok: false, errors };
}

/**
 * Стойностите, които се връщат на формата след грешка.
 *
 * ПАРОЛИТЕ НЕ СА ТУК. Връщането им би ги написало в HTML-а (`value="…"`),
 * откъдето влизат в кеша на браузъра, в историята и във всеки прокси
 * лог по пътя. Човекът пише паролата пак — това е цената на нещо, което
 * не бива да напуска паметта.
 */
export function keepableValues(
  raw: Record<string, unknown>,
): Record<string, string> {
  const keep: RegisterField[] = [
    "name",
    "email",
    "phone",
    "acceptTerms",
    "acceptPrivacy",
    "newsletter",
  ];

  const values: Record<string, string> = {};
  for (const field of keep) {
    const value = raw[field];
    if (typeof value === "string") values[field] = value;
  }

  return values;
}
