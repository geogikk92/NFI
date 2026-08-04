import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/config";
import {
  BLOCKS,
  BLOCK_KEYS,
  blockProblemMessage,
  blockSpec,
  blocksForPage,
  checkBlockValue,
  codeValueFor,
  hasCodeFallback,
  toParagraphs,
} from "./registry";

describe("регистърът е здрав", () => {
  it("ключовете са уникални", () => {
    expect(new Set(BLOCK_KEYS).size).toBe(BLOCK_KEYS.length);
  });

  it("ключовете са ASCII и стават валидни DOM идентификатори", () => {
    for (const key of BLOCK_KEYS) {
      expect(key).toMatch(/^[a-z][a-zA-Z0-9.]*$/);
    }
  });

  it("всеки блок има български етикет и обяснение", () => {
    for (const spec of BLOCKS) {
      expect(spec.label.length).toBeGreaterThan(2);
      expect(spec.help.length).toBeGreaterThan(10);
    }
  });

  it("немската граница е поне колкото българската", () => {
    // Съставните думи правят немския 20–35% по-дълъг. Граница, по-стегната
    // от българската, би отказала верен превод.
    for (const spec of BLOCKS) {
      expect(spec.max.de).toBeGreaterThanOrEqual(spec.max.bg);
    }
  });

  it("седемте блока от клиентката нямат стойност в кода", () => {
    // Точно това ги прави видимо незавършени, докато тя не ги напише.
    const awaiting = BLOCKS.filter((spec) => !hasCodeFallback(spec));
    expect(awaiting.map((spec) => spec.key).sort()).toEqual([
      "about.method",
      "about.teachers",
      "about.who",
      "community.cafe",
      "community.groups",
      "contact.address",
      "contact.direct",
    ]);
  });
});

describe("стойностите от кода", () => {
  it("съществуват и се събират в границата на ВСЕКИ език", () => {
    // Пази от сгрешена граница при въвеждането ѝ: ако някой сложи лимит,
    // по-къс от одобрения днешен текст, редакторът не би могъл да запази
    // дори това, което вече е на сайта.
    for (const spec of BLOCKS) {
      if (!hasCodeFallback(spec)) continue;

      for (const locale of LOCALES) {
        const value = codeValueFor(spec, locale);
        expect(value, `${spec.key} · ${locale}`).toBeTruthy();
        expect(
          checkBlockValue(spec, locale, value as string),
          `${spec.key} · ${locale}: „${value}“`,
        ).toBeNull();
      }
    }
  });

  it("датата на старта в кода е във формата, която редакторът приема", () => {
    const spec = blockSpec("home.startDate");
    expect(spec).toBeDefined();
    for (const locale of LOCALES) {
      expect(codeValueFor(spec!, locale)).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    }
  });
});

describe("проверка на стойност", () => {
  const prose = blockSpec("about.who")!;
  const date = blockSpec("home.startDate")!;

  it("празното е позволено — изтриването е право на редактора", () => {
    expect(checkBlockValue(prose, "bg", "")).toBeNull();
    expect(checkBlockValue(prose, "bg", "   \n  ")).toBeNull();
  });

  it("прекалено дългото пада с числата в съобщението", () => {
    const problem = checkBlockValue(prose, "bg", "я".repeat(2000));
    expect(problem).toEqual({ code: "too-long", limit: 1800, actual: 2000 });
    expect(blockProblemMessage(prose, problem!)).toContain("1800");
  });

  it("границата е по език: същият текст минава на немски, пада на български", () => {
    const text = "x".repeat(2000);
    expect(checkBlockValue(prose, "de", text)).toBeNull();
    expect(checkBlockValue(prose, "bg", text)).not.toBeNull();
  });

  it("датата иска точки и латински цифри", () => {
    expect(checkBlockValue(date, "bg", "01.09.2026")).toBeNull();
    expect(checkBlockValue(date, "bg", "1.9.2026")).toEqual({ code: "bad-date" });
    expect(checkBlockValue(date, "bg", "септември")).toEqual({ code: "bad-date" });
  });

  it("кирилско А в числово поле не минава", () => {
    const count = blockSpec("home.communityCount")!;
    // Този блок е "line" — там кирилица е нормална. Проверката е за
    // числовите: буквите А, В, С, О изглеждат еднакво на двете азбуки.
    expect(count.kind).toBe("line");
    expect(checkBlockValue(count, "bg", "22 000+ българи учат заедно")).toBeNull();
  });
});

describe("групиране по страница", () => {
  it("за всяка страница има поне един блок", () => {
    expect(blocksForPage("about")).toHaveLength(3);
    expect(blocksForPage("community")).toHaveLength(2);
    expect(blocksForPage("contact")).toHaveLength(2);
    expect(blocksForPage("home").length).toBeGreaterThan(0);
  });

  it("сборът по страници покрива целия регистър", () => {
    const grouped = (["home", "about", "community", "contact"] as const).flatMap(
      blocksForPage,
    );
    expect(grouped).toHaveLength(BLOCKS.length);
  });
});

describe("абзаци", () => {
  it("празният ред разделя, единичният не", () => {
    expect(toParagraphs("първи\n\nвтори")).toEqual(["първи", "втори"]);
    expect(toParagraphs("един ред\nсъщият абзац")).toEqual([
      "един ред\nсъщият абзац",
    ]);
  });

  it("излишните празни редове не правят празни абзаци", () => {
    expect(toParagraphs("а\n\n\n\nб\n\n")).toEqual(["а", "б"]);
    expect(toParagraphs("   ")).toEqual([]);
  });
});
