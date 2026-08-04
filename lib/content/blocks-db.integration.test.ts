// Интеграционен тест на блоковете срещу ИСТИНСКА база.
//
// Проверява точно двете правила, върху които стъпва целият подход:
// езиците не се смесват, а четенето оцелява при липсваща база.
// Пропуска се тихо без DATABASE_URL — както counter теста.

import { afterAll, afterEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { AuditMeta } from "@/lib/admin/audit";
import { blockSpec, codeValueFor } from "./registry";
import {
  blockForEditor,
  blocksOverview,
  codeFingerprint,
  discardBlockDraft,
  publishBlock,
  resolveBlock,
  revertBlock,
  saveBlockDraft,
} from "./blocks-db";

const hasDb = Boolean(process.env.DATABASE_URL);
const suite = hasDb ? describe : describe.skip;

const PROSE = "about.who";
const OVERRIDE = "home.startDate";

const meta: AuditMeta = {
  actorId: null as unknown as string,
  actorEmail: "test-blokove@integration.local",
  ip: "127.0.0.1",
  userAgent: "vitest",
};

suite("Блокове срещу истински Postgres", () => {
  afterEach(async () => {
    await db.contentBlock.deleteMany({ where: { key: { in: [PROSE, OVERRIDE] } } });
    await db.auditLog.deleteMany({
      where: { entity: "ContentBlock", actorEmail: meta.actorEmail },
    });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  /** Пресни редове, без React кеша — след запис той би бил застоял. */
  async function freshBlocks() {
    const rows = await db.contentBlock.findMany();
    return new Map(rows.map((row) => [row.key, row]));
  }

  it("празна база = текстът от кода, а prose блокът остава незавършен", async () => {
    const blocks = await freshBlocks();

    // Блок СЪС стойност в кода я показва.
    const override = resolveBlock(blocks, OVERRIDE, "bg");
    expect(override.source).toBe("code");
    expect(override.value).toBe(codeValueFor(blockSpec(OVERRIDE)!, "bg"));

    // Блок БЕЗ стойност в кода няма какво да покаже — това е честно.
    const prose = resolveBlock(blocks, PROSE, "bg");
    expect(prose.source).toBe("missing");
    expect(prose.value).toBeNull();
  });

  it("ЕЗИЦИТЕ НЕ СЕ СМЕСВАТ: български презапис не се показва на /de", async () => {
    await publishBlock(PROSE, { bg: "Български текст", de: "", en: "" }, meta);

    const blocks = await freshBlocks();

    expect(resolveBlock(blocks, PROSE, "bg").value).toBe("Български текст");
    // Ако някога това падне на български, немска институция чете кирилица.
    expect(resolveBlock(blocks, PROSE, "de").value).toBeNull();
    expect(resolveBlock(blocks, PROSE, "de").source).toBe("missing");
  });

  it("празният низ се записва като NULL, не като празен текст", async () => {
    await publishBlock(PROSE, { bg: "нещо", de: "   ", en: "" }, meta);

    const row = await db.contentBlock.findUnique({ where: { key: PROSE } });
    expect(row?.de).toBeNull();
    expect(row?.en).toBeNull();
  });

  it("черновата не пипа публикуваното и се вижда само в preview", async () => {
    await publishBlock(PROSE, { bg: "публикувано", de: "", en: "" }, meta);
    await saveBlockDraft(PROSE, { bg: "чернова", de: "", en: "" });

    const blocks = await freshBlocks();

    expect(resolveBlock(blocks, PROSE, "bg").value).toBe("публикувано");
    expect(resolveBlock(blocks, PROSE, "bg", { draft: true }).value).toBe(
      "чернова",
    );
    expect(resolveBlock(blocks, PROSE, "bg", { draft: true }).source).toBe(
      "draft",
    );
  });

  it("публикуването изчиства черновата и оставя одитна следа", async () => {
    await saveBlockDraft(PROSE, { bg: "чернова", de: "", en: "" });
    await publishBlock(PROSE, { bg: "чернова", de: "", en: "" }, meta);

    const row = await db.contentBlock.findUnique({ where: { key: PROSE } });
    expect(row?.hasDraft).toBe(false);
    expect(row?.draftBg).toBeNull();
    expect(row?.publishedAt).toBeInstanceOf(Date);

    const trail = await db.auditLog.findMany({
      where: { entity: "ContentBlock", entityId: PROSE },
    });
    expect(trail).toHaveLength(1);
    expect(trail[0].action).toBe("content.publish");
  });

  it("изхвърлената чернова не пипа публикуваното", async () => {
    await publishBlock(PROSE, { bg: "остава", de: "", en: "" }, meta);
    await saveBlockDraft(PROSE, { bg: "за изхвърляне", de: "", en: "" });
    await discardBlockDraft(PROSE);

    const row = await db.contentBlock.findUnique({ where: { key: PROSE } });
    expect(row?.bg).toBe("остава");
    expect(row?.hasDraft).toBe(false);
  });

  it("„върни оригинала“ трие реда и стойността от кода се връща", async () => {
    await publishBlock(OVERRIDE, { bg: "01.01.2030", de: "01.01.2030", en: "01.01.2030" }, meta);

    expect(resolveBlock(await freshBlocks(), OVERRIDE, "bg").value).toBe(
      "01.01.2030",
    );

    await revertBlock(OVERRIDE, meta);

    expect(await db.contentBlock.findMany({ where: { key: OVERRIDE } })).toHaveLength(0);
    expect(resolveBlock(new Map(), OVERRIDE, "bg").source).toBe("code");
  });

  it("prose блок няма оригинал за връщане — отказва ясно", async () => {
    await expect(revertBlock(PROSE, meta)).rejects.toThrow(/оригинал в кода/);
  });

  it("отпечатъкът на кода се пази при публикуване", async () => {
    await publishBlock(OVERRIDE, { bg: "01.01.2030", de: "", en: "" }, meta);

    const row = await db.contentBlock.findUnique({ where: { key: OVERRIDE } });
    expect(row?.baseHash).toBe(codeFingerprint(blockSpec(OVERRIDE)!));

    // Блок без стойност в кода няма какво да отпечата.
    await publishBlock(PROSE, { bg: "текст", de: "", en: "" }, meta);
    const prose = await db.contentBlock.findUnique({ where: { key: PROSE } });
    expect(prose?.baseHash).toBeNull();
  });

  it("блок със стойност в кода се води „по подразбиране“, не „публикувано“", async () => {
    // Разликата има значение за Василена: „публикувано" върху текст,
    // който тя не е писала, я кара да мисли, че вече го е одобрила.
    const before = (await blocksOverview()).find((i) => i.spec.key === OVERRIDE);
    expect(before?.state).toBe("default");

    await publishBlock(OVERRIDE, { bg: "01.01.2030", de: "", en: "" }, meta);

    const after = (await blocksOverview()).find((i) => i.spec.key === OVERRIDE);
    expect(after?.state).toBe("published");
  });

  it("prose блок без текст се води празен и блокира деплой", async () => {
    const row = (await blocksOverview()).find((i) => i.spec.key === PROSE);
    expect(row?.state).toBe("missing");
  });

  it("прегледът показва „непреведено“ при само български", async () => {
    await publishBlock(PROSE, { bg: "само български", de: "", en: "" }, meta);

    const overview = await blocksOverview();
    const row = overview.find((item) => item.spec.key === PROSE);
    expect(row?.state).toBe("published");
    expect(row?.untranslated).toBe(true);

    await publishBlock(
      PROSE,
      { bg: "български", de: "deutsch", en: "english" },
      meta,
    );
    const after = (await blocksOverview()).find((i) => i.spec.key === PROSE);
    expect(after?.untranslated).toBe(false);
  });

  it("редакторът получава и публикуваното, и черновата, и кода", async () => {
    await publishBlock(OVERRIDE, { bg: "01.01.2030", de: "", en: "" }, meta);
    await saveBlockDraft(OVERRIDE, { bg: "02.02.2031", de: "", en: "" });

    const data = await blockForEditor(OVERRIDE);
    expect(data?.published.bg).toBe("01.01.2030");
    expect(data?.draft?.bg).toBe("02.02.2031");
    expect(data?.code?.bg).toBe(codeValueFor(blockSpec(OVERRIDE)!, "bg"));
  });

  it("непознат ключ е програмна грешка, не тихо празно", () => {
    expect(() => resolveBlock(new Map(), "nyama.takuv", "bg")).toThrow(
      /Непознат блок/,
    );
  });
});
