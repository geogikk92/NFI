import { describe, expect, it } from "vitest";
import {
  keepableValues,
  readRegisterForm,
  validateRegistration,
} from "./register";

/** Минимално валиден вход — тестовете го променят по едно поле. */
function raw(overrides: Record<string, unknown> = {}) {
  return {
    name: "Maria Ivanova",
    email: "maria@example.de",
    password: "sonnenblume im garten",
    passwordConfirm: "sonnenblume im garten",
    phone: "",
    acceptTerms: "on",
    acceptPrivacy: "on",
    newsletter: undefined,
    ...overrides,
  };
}

function errorsOf(input: Record<string, unknown>) {
  const result = validateRegistration(input);
  if (result.ok) throw new Error("очаквахме грешка, а входът мина");
  return result.errors;
}

describe("validateRegistration · щастливият случай", () => {
  it("пуска пълен вход и нормализира имейла", () => {
    const result = validateRegistration(
      raw({ email: "  Maria@Example.DE  ", name: "  Maria Ivanova  " }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.email).toBe("maria@example.de");
    expect(result.data.name).toBe("Maria Ivanova");
    expect(result.data.newsletter).toBe(false);
  });

  it("телефонът е по желание", () => {
    expect(validateRegistration(raw({ phone: "" })).ok).toBe(true);
    expect(validateRegistration(raw({ phone: "+49 (0)911 12 34 56" })).ok).toBe(
      true,
    );
    // Липсващо поле е законно „не съм казал", не повреден вход.
    expect(validateRegistration(raw({ phone: undefined })).ok).toBe(true);
  });

  it("бюлетинът се разпознава от 'on'", () => {
    const result = validateRegistration(raw({ newsletter: "on" }));
    expect(result.ok && result.data.newsletter).toBe(true);
  });
});

describe("validateRegistration · съгласия", () => {
  it("без AGB няма профил", () => {
    expect(errorsOf(raw({ acceptTerms: undefined })).acceptTerms).toBe(
      "termsRequired",
    );
  });

  it("без Datenschutz няма профил", () => {
    expect(errorsOf(raw({ acceptPrivacy: undefined })).acceptPrivacy).toBe(
      "privacyRequired",
    );
  });

  it("липсващият чекбокс е 'не', а не повреден вход", () => {
    // FormData не носи немаркиран чекбокс. Ако това се четеше като грешка в
    // типа, човекът щеше да вижда „попълнете полето" вместо смисленото
    // „без съгласие не може".
    const errors = errorsOf(raw({ acceptTerms: undefined }));
    expect(errors.acceptTerms).not.toBe("fieldInvalid");
  });
});

describe("validateRegistration · парола", () => {
  it("под 10 знака не минава", () => {
    expect(
      errorsOf(raw({ password: "kurz1234", passwordConfirm: "kurz1234" }))
        .password,
    ).toBe("passwordTooShort");
  });

  it("несъвпадението застава при ПОВТОРНАТА парола", () => {
    const errors = errorsOf(raw({ passwordConfirm: "sonnenblume im garte" }));
    expect(errors.passwordConfirm).toBe("passwordMismatch");
    expect(errors.password).toBeUndefined();
  });

  it("честа парола не минава, макар и достатъчно дълга", () => {
    expect(
      errorsOf(raw({ password: "passwort1234", passwordConfirm: "passwort1234" }))
        .password,
    ).toBe("passwordTooCommon");
  });

  it("един повторен знак не е парола", () => {
    expect(
      errorsOf(raw({ password: "aaaaaaaaaaaa", passwordConfirm: "aaaaaaaaaaaa" }))
        .password,
    ).toBe("passwordTooCommon");
  });

  it("паролата не бива да съдържа имейла", () => {
    expect(
      errorsOf(
        raw({
          email: "maria.ivanova@example.de",
          password: "maria.ivanova2026",
          passwordConfirm: "maria.ivanova2026",
        }),
      ).password,
    ).toBe("passwordLooksLikeEmail");
  });

  it("прекалено дългата парола се отхвърля", () => {
    const long = "x".repeat(201);
    expect(
      errorsOf(raw({ password: long, passwordConfirm: long })).password,
    ).toBe("passwordTooLong");
  });
});

describe("validateRegistration · останалите полета", () => {
  it("късо име", () => {
    expect(errorsOf(raw({ name: "M" })).name).toBe("nameTooShort");
  });

  it("невалиден имейл", () => {
    expect(errorsOf(raw({ email: "maria(at)example.de" })).email).toBe(
      "emailInvalid",
    );
  });

  it("телефон, който не е телефон", () => {
    expect(errorsOf(raw({ phone: "ще ви кажа по-късно" })).phone).toBe(
      "phoneInvalid",
    );
  });

  it("пълен боклук вместо обект пак дава грешка, а не изключение", () => {
    const result = validateRegistration("не е обект");
    expect(result.ok).toBe(false);
  });

  it("всяко поле носи НАЙ-МНОГО една грешка", () => {
    const errors = errorsOf(raw({ name: "", email: "", password: "" }));
    for (const value of Object.values(errors)) {
      expect(typeof value).toBe("string");
    }
  });
});

describe("readRegisterForm", () => {
  it("немаркираният чекбокс отсъства от FormData и става 'не'", () => {
    const formData = new FormData();
    formData.set("name", "Maria Ivanova");
    formData.set("email", "maria@example.de");
    formData.set("password", "sonnenblume im garten");
    formData.set("passwordConfirm", "sonnenblume im garten");
    formData.set("phone", "");
    formData.set("acceptTerms", "on");
    formData.set("acceptPrivacy", "on");

    const parsed = readRegisterForm(formData);
    expect(parsed.newsletter).toBeUndefined();

    const result = validateRegistration(parsed);
    expect(result.ok && result.data.newsletter).toBe(false);
  });
});

describe("keepableValues", () => {
  it("НЕ връща паролите — те не бива да влизат в HTML-а", () => {
    const values = keepableValues(raw({ newsletter: "on" }));

    expect(values.password).toBeUndefined();
    expect(values.passwordConfirm).toBeUndefined();
  });

  it("връща вписаното, за да не се губи при грешка", () => {
    const values = keepableValues(raw({ phone: "0911 123456", newsletter: "on" }));

    expect(values.name).toBe("Maria Ivanova");
    expect(values.email).toBe("maria@example.de");
    expect(values.phone).toBe("0911 123456");
    expect(values.acceptTerms).toBe("on");
    expect(values.newsletter).toBe("on");
  });
});
