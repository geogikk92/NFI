import { describe, expect, it } from "vitest";
import { collect, formValues, uniqueConflict } from "./form";

describe("collect", () => {
  it("събира ВСИЧКИ грешки, не спира на първата", () => {
    // Човек, който вижда по една грешка на изпращане, се отказва на третата.
    const result = collect({
      title: { ok: false, error: "Заглавие: задължително." } as const,
      level: { ok: false, error: "Ниво: не е избрано." } as const,
      slug: { ok: true, value: "a1" } as const,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("очаквах провал");
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["level", "title"]);
  });

  it("успехът връща разопакованите стойности", () => {
    const result = collect({
      title: { ok: true, value: "Немски A1" } as const,
      priceCents: { ok: true, value: 12900 } as const,
      startsAt: { ok: true, value: null } as const,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("очаквах успех");
    expect(result.value).toEqual({
      title: "Немски A1",
      priceCents: 12900,
      startsAt: null,
    });
  });

  it("нулата и празният низ НЕ се броят за грешка", () => {
    // Класическият капан: проверка `if (!value)` би отхвърлила безплатен
    // продукт (0 цента) и празно незадължително поле.
    const result = collect({
      priceCents: { ok: true, value: 0 } as const,
      note: { ok: true, value: "" } as const,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("очаквах успех");
    expect(result.value.priceCents).toBe(0);
    expect(result.value.note).toBe("");
  });
});

describe("formValues", () => {
  it("пази низовете и пропуска файловете", () => {
    const data = new FormData();
    data.set("title", "Немски A1");
    data.set("price", "129,50");
    data.set("cover", new File(["x"], "korica.png", { type: "image/png" }));

    const values = formValues(data);

    expect(values).toEqual({ title: "Немски A1", price: "129,50" });
    // `String(file)` дава „[object File]" — низ, който после се показва в
    // полето като стойност.
    expect(JSON.stringify(values)).not.toContain("object File");
  });
});

describe("uniqueConflict", () => {
  /**
   * ИСТИНСКАТА форма на грешката, снета от живата база с Prisma 7 и
   * driver adapter. Не е измислена: кодът първо четеше само `meta.target`,
   * а него го НЯМА в тази форма — заетият адрес излизаше като „грешка в
   * базата, опитай пак", което е съвет с гарантирано същия резултат.
   */
  const DRIVER_ADAPTER_P2002 = {
    name: "PrismaClientKnownRequestError",
    code: "P2002",
    meta: {
      modelName: "Course",
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          originalCode: "23505",
          originalMessage:
            'duplicate key value violates unique constraint "Course_slug_key"',
          kind: "UniqueConstraintViolation",
          constraint: { fields: ["slug"] },
        },
      },
    },
  };

  const SLUG = { slug: "Този адрес вече се ползва." };

  it("разпознава формата на driver adapter-а", () => {
    expect(uniqueConflict(DRIVER_ADAPTER_P2002, SLUG)).toEqual(SLUG);
  });

  it("разпознава и класическата форма от Rust engine-а", () => {
    // Пази поправката при евентуално връщане към engine без адаптер.
    expect(
      uniqueConflict({ code: "P2002", meta: { target: ["slug"] } }, SLUG),
    ).toEqual(SLUG);
    expect(
      uniqueConflict({ code: "P2002", meta: { target: "slug" } }, SLUG),
    ).toEqual(SLUG);
  });

  it("разпознава и име на индекс вместо колона", () => {
    expect(
      uniqueConflict(
        {
          code: "P2002",
          meta: {
            driverAdapterError: {
              cause: { constraint: { index: "Course_slug_key" } },
            },
          },
        },
        SLUG,
      ),
    ).toEqual(SLUG);
  });

  it("не залепя съобщението за грешното поле", () => {
    // „code" се съдържа в „discountCode" като подниз. Съвпадението е по
    // ограничена дума, за да не се получи точно това.
    const fields = { code: "Кодът е зает." };
    expect(
      uniqueConflict(
        {
          code: "P2002",
          meta: {
            driverAdapterError: {
              cause: { constraint: { index: "Order_discountCodeSnapshot_key" } },
            },
          },
        },
        fields,
      ),
    ).toBeNull();
  });

  it("мълчи за всичко, което не е нарушена уникалност", () => {
    expect(uniqueConflict(new Error("нещо друго"), SLUG)).toBeNull();
    expect(uniqueConflict({ code: "P2025" }, SLUG)).toBeNull();
    expect(uniqueConflict(null, SLUG)).toBeNull();
    expect(uniqueConflict(undefined, SLUG)).toBeNull();
    // P2002 върху колона, за която нямаме съобщение — по-добре общото
    // съобщение, отколкото грешка, залепена за случайно поле.
    expect(uniqueConflict(DRIVER_ADAPTER_P2002, { code: "…" })).toBeNull();
  });
});
