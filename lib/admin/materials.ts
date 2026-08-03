import "server-only";

// АДМИН · безплатните материали — четене за формата и писане в базата.
// Устроен като lib/admin/courses.ts: collect() върху всички полета,
// $transaction + AuditLog за всяка промяна.

import { db } from "@/lib/db";
import { type AuditMeta, type AuditTx, recordChange } from "@/lib/admin/audit";
import { collect } from "@/lib/admin/form";
import {
  oneOf,
  optionalText,
  parseWholeNumber,
  requiredText,
} from "@/lib/admin/input";
import { slugProblem } from "@/lib/admin/slug";
import { MATERIAL_KINDS, type MaterialKind } from "@/lib/cms/free-materials";
import { isSafeKey } from "@/lib/storage";
import {
  MATERIAL_LEVELS,
  type MaterialLevel,
} from "@/lib/admin/material-labels";

export { MATERIAL_LEVELS, type MaterialLevel };

const LIMITS = {
  title: 160,
  description: 2000,
  externalId: 300,
  storageKey: 300,
  sortOrder: 10_000,
} as const;

export interface MaterialInput {
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  kind: MaterialKind;
  storageKey: string | null;
  externalId: string | null;
  level: MaterialLevel | null;
  sortOrder: number;
  published: boolean;
}

export function parseMaterialForm(
  data: FormData,
):
  | { ok: true; value: MaterialInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  const slugRaw = String(data.get("slug") ?? "").trim();
  const slugIssue = slugProblem(slugRaw);

  const kindRaw = String(data.get("kind") ?? "");
  const storageKeyRaw = String(data.get("storageKey") ?? "").trim();
  const externalIdRaw = String(data.get("externalId") ?? "").trim();
  const levelRaw = String(data.get("level") ?? "");

  // Видът определя кое поле е ЗАДЪЛЖИТЕЛНО: PDF/аудио без файл е
  // материал, който не може да се достави; видео без id — празен екран.
  const needsFile = kindRaw === "PDF" || kindRaw === "AUDIO";
  const needsExternal =
    kindRaw === "VIDEO_VIMEO" || kindRaw === "VIDEO_GOTO" || kindRaw === "LINK";

  let storageKeyField:
    | { ok: true; value: string | null }
    | { ok: false; error: string };
  if (needsFile && !storageKeyRaw) {
    storageKeyField = {
      ok: false,
      error: "PDF и аудио изискват ключ на файл в хранилището.",
    };
  } else if (storageKeyRaw && !isSafeKey(storageKeyRaw)) {
    storageKeyField = {
      ok: false,
      error:
        "Ключът може да съдържа само латиница, цифри, наклонени черти, тире и точка.",
    };
  } else {
    storageKeyField = { ok: true, value: storageKeyRaw || null };
  }

  return collect({
    slug: slugIssue
      ? ({ ok: false, error: slugIssue } as const)
      : ({ ok: true, value: slugRaw } as const),

    title: requiredText(data.get("title"), {
      min: 2,
      max: LIMITS.title,
      label: "Заглавие (български)",
    }),
    titleDe: optionalText(data.get("titleDe"), LIMITS.title, "Заглавие (немски)"),
    titleEn: optionalText(
      data.get("titleEn"),
      LIMITS.title,
      "Заглавие (английски)",
    ),

    description: optionalText(
      data.get("description"),
      LIMITS.description,
      "Описание (български)",
    ),
    descriptionDe: optionalText(
      data.get("descriptionDe"),
      LIMITS.description,
      "Описание (немски)",
    ),
    descriptionEn: optionalText(
      data.get("descriptionEn"),
      LIMITS.description,
      "Описание (английски)",
    ),

    kind: oneOf(data.get("kind"), MATERIAL_KINDS, "Вид"),

    storageKey: storageKeyField,

    externalId:
      needsExternal && !externalIdRaw
        ? ({
            ok: false,
            error:
              kindRaw === "VIDEO_VIMEO"
                ? "Видеото иска Vimeo ID (цифрите от адреса на видеото)."
                : "Този вид иска външен адрес или идентификатор.",
          } as const)
        : optionalText(data.get("externalId"), LIMITS.externalId, "Външен ID"),

    // Празното ниво значи „за всички" — колоната е nullable нарочно.
    level:
      levelRaw === ""
        ? ({ ok: true, value: null } as const)
        : oneOf(data.get("level"), MATERIAL_LEVELS, "Ниво"),

    sortOrder: parseWholeNumber(data.get("sortOrder") || "0", {
      min: -LIMITS.sortOrder,
      max: LIMITS.sortOrder,
      label: "Подредба",
    }),

    published: { ok: true, value: data.get("published") !== null } as const,
  });
}

// ─────────────────────────────────────────────────────────────────────────

const AUDITED = {
  id: true,
  slug: true,
  title: true,
  titleDe: true,
  titleEn: true,
  description: true,
  descriptionDe: true,
  descriptionEn: true,
  kind: true,
  storageKey: true,
  externalId: true,
  level: true,
  published: true,
  publishedAt: true,
  sortOrder: true,
} as const;

export interface AdminMaterialDetail {
  id: string;
  slug: string;
  title: string;
  titleDe: string | null;
  titleEn: string | null;
  description: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
  kind: MaterialKind;
  storageKey: string | null;
  externalId: string | null;
  level: MaterialLevel | null;
  published: boolean;
  publishedAt: Date | null;
  sortOrder: number;
}

export async function getMaterialForEdit(
  id: string,
): Promise<AdminMaterialDetail | null> {
  return db.freeMaterial.findUnique({
    where: { id },
    select: AUDITED,
  }) as Promise<AdminMaterialDetail | null>;
}

export interface AdminMaterialRow {
  id: string;
  slug: string;
  title: string;
  kind: MaterialKind;
  level: MaterialLevel | null;
  published: boolean;
  sortOrder: number;
  /** Колко души са го поискали — лийдовете, които формата е донесла. */
  requestCount: number;
}

export async function listMaterialsForAdmin(): Promise<AdminMaterialRow[]> {
  const rows = await db.freeMaterial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
      level: true,
      published: true,
      sortOrder: true,
      _count: { select: { grants: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind as MaterialKind,
    level: row.level as MaterialLevel | null,
    published: row.published,
    sortOrder: row.sortOrder,
    requestCount: row._count.grants,
  }));
}

// ─────────────────────────────────────────────────────────────────────────

function publishedAtFor(published: boolean, current: Date | null): Date | null {
  if (!published) return current;
  return current ?? new Date();
}

export class MaterialGone extends Error {
  constructor() {
    super("Материалът вече не съществува.");
    this.name = "MaterialGone";
  }
}

export async function createMaterial(
  input: MaterialInput,
  meta: AuditMeta,
): Promise<{ id: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const material = await tx.freeMaterial.create({
      data: { ...input, publishedAt: publishedAtFor(input.published, null) },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "material.create",
      entity: "FreeMaterial",
      entityId: material.id,
      after: material,
    });

    return { id: material.id };
  });
}

export async function updateMaterial(
  id: string,
  input: MaterialInput,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.freeMaterial.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new MaterialGone();

    const after = await tx.freeMaterial.update({
      where: { id },
      data: {
        ...input,
        publishedAt: publishedAtFor(
          input.published,
          before.publishedAt as Date | null,
        ),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: "material.update",
      entity: "FreeMaterial",
      entityId: id,
      before,
      after,
    });
  });
}

export async function setMaterialPublished(
  id: string,
  published: boolean,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.freeMaterial.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new MaterialGone();

    const after = await tx.freeMaterial.update({
      where: { id },
      data: {
        published,
        publishedAt: publishedAtFor(published, before.publishedAt as Date | null),
      },
      select: AUDITED,
    });

    await recordChange(tx, meta, {
      action: published ? "material.publish" : "material.unpublish",
      entity: "FreeMaterial",
      entityId: id,
      before,
      after,
    });
  });
}

export async function deleteMaterial(
  id: string,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.freeMaterial.findUnique({
      where: { id },
      select: AUDITED,
    });
    if (!before) throw new MaterialGone();

    // Изтриването каскадира и заявките (DownloadGrant) — това е нарочно
    // изписано в потвърждението на формата, защото са лийдове.
    await tx.freeMaterial.delete({ where: { id } });

    await recordChange(tx, meta, {
      action: "material.delete",
      entity: "FreeMaterial",
      entityId: id,
      before,
    });
  });
}
