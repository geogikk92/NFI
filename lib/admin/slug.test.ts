import { describe, expect, it } from "vitest";
import {
  MAX_SLUG_LENGTH,
  slugProblem,
  slugify,
  suggestSlug,
} from "./slug";

describe("slugify", () => {
  it("възпроизвежда съществуващите адреси от сийда", () => {
    // Договорът с вече публикуваните страници. Смени ли се таблицата,
    // тези три реда падат ПРЕДИ някой да е загубил адреса си.
    expect(slugify("Deutsch A1 · Abendkurs")).toBe("deutsch-a1-abendkurs");
    expect(slugify("Prüfungsvorbereitung B2")).toBe(
      "pruefungsvorbereitung-b2",
    );
    expect(slugify("Verben mit Präposition")).toBe("verben-mit-praeposition");
  });

  it("заменя немските умлаути с две букви, не с една", () => {
    // Същината: „ü" → „ue". Ако нормализацията изпревари таблицата,
    // резултатът е „prufung" и адресът се разминава с публикувания.
    expect(slugify("Prüfung")).toBe("pruefung");
    expect(slugify("Öffnungszeiten")).toBe("oeffnungszeiten");
    expect(slugify("Übung")).toBe("uebung");
    expect(slugify("Straße")).toBe("strasse");
  });

  it("транслитерира кирилицата по официалната таблица", () => {
    expect(slugify("Немски за начинаещи")).toBe("nemski-za-nachinaeshti");
    expect(slugify("Щастие")).toBe("shtastie");
    expect(slugify("Юлия Жекова")).toBe("yuliya-zhekova");
    expect(slugify("Ъгъл")).toBe("agal");
  });

  it("маха диакритика извън немската таблица", () => {
    expect(slugify("Café")).toBe("cafe");
    expect(slugify("Señor")).toBe("senor");
  });

  it("превръща препинателните знаци в едно тире", () => {
    expect(slugify("Курс   —   ниво   A1!!!")).toBe("kurs-nivo-a1");
    expect(slugify("„Немски“ (вечерен)")).toBe("nemski-vecheren");
  });

  it("не оставя водещо или крайно тире", () => {
    expect(slugify("  ·Курс·  ")).toBe("kurs");
    expect(slugify("!!!")).toBe("");
  });

  it("реже по граница на дума, не по буква", () => {
    // Дълго заглавие, чиято 80-та буква пада вътре в дума.
    const long = `${"abendkurs ".repeat(9)}ende`;
    const slug = slugify(long);

    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    // Отрязаният край НЕ е половин дума и няма висящо тире.
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.split("-").at(-1)).toBe("abendkurs");
  });

  it("дава валиден адрес за всичко, което не се е изпразнило", () => {
    // Кръстосана проверка: двете функции трябва да са съгласни. Ако
    // slugify пусне нещо, което slugProblem отхвърля, формата влиза в
    // задънена улица — предложеният адрес е невалиден и не се вижда защо.
    const titles = [
      "Deutsch A1 · Abendkurs",
      "Прüфунг B2",
      "Курс 2026 — нова група",
      "Café für Anfänger",
      "Щурите щуреи",
    ];

    for (const title of titles) {
      const slug = slugify(title);
      expect(slug, title).not.toBe("");
      expect(slugProblem(slug), `${title} → ${slug}`).toBeNull();
    }
  });
});

describe("suggestSlug", () => {
  it("предпочита немското заглавие", () => {
    expect(
      suggestSlug({ de: "Abendkurs A1", bg: "Вечерен курс A1" }),
    ).toBe("abendkurs-a1");
  });

  it("пада на българското, когато немското го няма", () => {
    expect(suggestSlug({ de: null, bg: "Вечерен курс A1" })).toBe(
      "vecheren-kurs-a1",
    );
    // Празен низ се брои за липсващ, не за валидно немско заглавие —
    // иначе новосъздаден курс без превод получава празен адрес.
    expect(suggestSlug({ de: "   ", bg: "Вечерен курс" })).toBe(
      "vecheren-kurs",
    );
  });

  it("дава празен низ, когато няма нито едното", () => {
    expect(suggestSlug({})).toBe("");
  });
});

describe("slugProblem", () => {
  it("приема нормален адрес", () => {
    expect(slugProblem("deutsch-a1-abendkurs")).toBeNull();
    expect(slugProblem("a1")).toBeNull();
  });

  it("отхвърля празно", () => {
    expect(slugProblem("")).not.toBeNull();
  });

  it("отхвърля кирилица, интервали и главни букви", () => {
    expect(slugProblem("курс")).not.toBeNull();
    expect(slugProblem("deutsch a1")).not.toBeNull();
    expect(slugProblem("Deutsch-A1")).not.toBeNull();
  });

  it("отхвърля висящо, водещо и двойно тире", () => {
    // Тези три са невалидни в URL смисъл и издават сгрешено ръчно писане.
    expect(slugProblem("-a1")).not.toBeNull();
    expect(slugProblem("a1-")).not.toBeNull();
    expect(slugProblem("a1--b2")).not.toBeNull();
  });

  it("отхвърля адрес само от цифри", () => {
    expect(slugProblem("2026")).not.toBeNull();
  });

  it("отхвърля прекалено дълъг адрес", () => {
    expect(slugProblem("a".repeat(MAX_SLUG_LENGTH + 1))).not.toBeNull();
  });
});
