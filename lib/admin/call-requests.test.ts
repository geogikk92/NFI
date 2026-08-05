import { describe, expect, it } from "vitest";
import {
  AUTO_NOTE_PREFIX,
  MAX_NOTE_LENGTH,
  isAutomaticNote,
  parseCallRequestForm,
} from "./call-requests";

/** FormData с подадените полета — по-четимо от четири реда `append`. */
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

describe("isAutomaticNote", () => {
  it("познава следата от honeypot защитата", () => {
    // Точният низ идва от lib/cms/call-requests-db.ts. Разминат ли се двата,
    // формата спира да предупреждава, че презаписва автоматична бележка.
    expect(isAutomaticNote(`${AUTO_NOTE_PREFIX} honeypot`)).toBe(true);
  });

  it("не обявява човешката бележка за автоматична", () => {
    expect(isAutomaticNote("Звъннах, не вдига. Пробвай следобед.")).toBe(false);
  });

  it("празната бележка не е автоматична", () => {
    // null е обичайното състояние — всяка истинска заявка влиза така.
    expect(isAutomaticNote(null)).toBe(false);
  });
});

describe("parseCallRequestForm", () => {
  it("приема състояние и бележка", () => {
    const result = parseCallRequestForm(
      form({ status: "CONTACTED", handledNote: "Звъннах в 14:30." }),
    );

    expect(result).toEqual({
      ok: true,
      value: { status: "CONTACTED", handledNote: "Звъннах в 14:30." },
    });
  });

  it("празната бележка става null, не празен низ", () => {
    // Разликата стига до базата: празен низ значи „писал е нещо и го е
    // изтрил", а null — „никой не е пипал". Дневникът показва второто
    // като липса, а първото като промяна.
    const result = parseCallRequestForm(
      form({ status: "NEW", handledNote: "   " }),
    );

    expect(result).toEqual({ ok: true, value: { status: "NEW", handledNote: null } });
  });

  it("отказва състояние, което не съществува", () => {
    const result = parseCallRequestForm(
      form({ status: "ARCHIVED", handledNote: "" }),
    );

    expect(result.ok).toBe(false);
  });

  it("отказва „toString“ за състояние", () => {
    // Капанът, заради който `oneOf` ползва масив вместо оператора `in`:
    // `in` обхожда прототипната верига и „toString" минава за валиден
    // избор, след което Prisma гърми с 500. Същото е поправяно в
    // lib/admin/queries.ts и lib/cms/courses.ts.
    const result = parseCallRequestForm(
      form({ status: "toString", handledNote: "" }),
    );

    expect(result.ok).toBe(false);
  });

  it("отказва липсващо състояние", () => {
    expect(parseCallRequestForm(form({ handledNote: "" })).ok).toBe(false);
  });

  it("отказва бележка над границата, но приема точно нея", () => {
    const exact = "я".repeat(MAX_NOTE_LENGTH);

    expect(
      parseCallRequestForm(form({ status: "CLOSED", handledNote: exact })).ok,
    ).toBe(true);

    expect(
      parseCallRequestForm(form({ status: "CLOSED", handledNote: `${exact}я` }))
        .ok,
    ).toBe(false);
  });

  it("събира грешките от ДВЕТЕ полета наведнъж", () => {
    // Иначе човек поправя състоянието, натиска „Запази" и чак тогава вижда,
    // че и бележката е дълга. Три пъти подред това затваря раздела.
    const result = parseCallRequestForm(
      form({ status: "няма такова", handledNote: "я".repeat(MAX_NOTE_LENGTH + 1) }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(Object.keys(result.fieldErrors).sort()).toEqual([
      "handledNote",
      "status",
    ]);
  });
});
