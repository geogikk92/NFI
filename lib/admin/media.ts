import "server-only";

// АДМИН · медийната библиотека — четене за екраните и писане в базата.
// Устроен като lib/admin/materials.ts: collect() върху полетата,
// $transaction + AuditLog за всяка промяна.
//
// Особеността на Media спрямо другите модели: content.prisma НАРОЧНО
// държи `coverMediaId String?` БЕЗ foreign key към Media (една снимка се
// ползва на много места; каскадно триене би трило съдържание). Значи
// референциалната цялост е НАША работа, в кода — затова mediaUsage()
// съществува и изтриването пита нея, преди да пипне каквото и да е.

import { db } from "@/lib/db";
import { type AuditMeta, type AuditTx, recordChange } from "@/lib/admin/audit";
import { collect } from "@/lib/admin/form";
import { optionalText } from "@/lib/admin/input";
import { MEDIA_LIMITS } from "@/lib/admin/limits";
import { mediaUrl } from "@/lib/media/url";

export interface MediaMetaInput {
  alt: string | null;
  altDe: string | null;
  title: string | null;
}

/**
 * Разборът на РЕДАКТИРУЕМИТЕ полета. Ключ, размери и тип не са тук:
 * те се раждат при качването (от самия файл) и после не се редактират —
 * ключът е адресът в bucket-а и смяната му не мести обекта, а само
 * чупи всяка вече издадена връзка.
 */
export function parseMediaMetaForm(
  data: FormData,
):
  | { ok: true; value: MediaMetaInput }
  | { ok: false; fieldErrors: Record<string, string> } {
  return collect({
    // Достъпност: alt е двуезичен, защото сайтът е двуезичен
    // (prisma/schema/base.prisma:184-185). Не е задължителен при
    // качване — човек още не знае къде ще отиде снимката — но липсата
    // му свети в списъка (задължение по Директива (ЕС) 2019/882).
    alt: optionalText(data.get("alt"), MEDIA_LIMITS.alt, "Описание (български)"),
    altDe: optionalText(data.get("altDe"), MEDIA_LIMITS.alt, "Описание (немски)"),
    title: optionalText(data.get("title"), MEDIA_LIMITS.title, "Заглавие"),
  });
}

// ─────────────────────────────────────────────────────────────────────────

/**
 * ЕДИН select за before/after И за формата — два отделни се разминават
 * след първата промяна и следата почва да лъже. `variants` не е вътре:
 * полето остава NULL по решение (оразмеряването е на next/image, виж
 * lib/media/url.ts) и не бива да се влачи в снимки на промени.
 */
const AUDITED = {
  id: true,
  key: true,
  bucket: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  checksum: true,
  alt: true,
  altDe: true,
  title: true,
} as const;

export interface AdminMediaDetail {
  id: string;
  key: string;
  bucket: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  checksum: string | null;
  alt: string | null;
  altDe: string | null;
  title: string | null;
  createdAt: Date;
}

/** Хвърля се, когато редът е изчезнал между отварянето и записа. */
export class MediaGone extends Error {
  constructor() {
    super("Файлът вече не съществува.");
    this.name = "MediaGone";
  }
}

/** Избраната корица е изтрита, докато формата е стояла отворена. */
export class CoverMediaMissing extends Error {
  constructor() {
    super("Избраната корица вече не съществува.");
    this.name = "CoverMediaMissing";
  }
}

/**
 * Проверява, че корицата съществува — ВЪТРЕ в транзакцията на записа.
 *
 * Няма foreign key, който да пази вместо нас (нарочно, content.prisma),
 * значи висящо id би минало тихо и публичната страница би останала със
 * счупена картинка. Форматът се проверява в parse; съществуването — тук,
 * защото между отварянето на формата и „Запази" минава време.
 */
export async function assertCoverMediaExists(
  tx: AuditTx,
  coverMediaId: string | null,
): Promise<void> {
  if (!coverMediaId) return;

  const found = await tx.media.count({ where: { id: coverMediaId } });
  if (found === 0) throw new CoverMediaMissing();
}

export async function getMediaForEdit(
  id: string,
): Promise<AdminMediaDetail | null> {
  return db.media.findUnique({
    where: { id },
    select: { ...AUDITED, createdAt: true },
  });
}

/**
 * Къде се ползва файлът — по едно броене на модел с coverMediaId.
 *
 * Това е заместителят на липсващия foreign key. Прозорецът между
 * проверката и триенето остава (никаква заявка не го затваря без
 * ограничение в базата) — при един администратор рискът е теоретичен,
 * но не бива да се описва като гаранция.
 */
export interface MediaUsage {
  courses: Array<{ id: string; title: string }>;
  products: Array<{ id: string; title: string }>;
  materials: Array<{ id: string; title: string }>;
}

export async function mediaUsage(id: string): Promise<MediaUsage> {
  const [courses, products, materials] = await Promise.all([
    db.course.findMany({
      where: { coverMediaId: id },
      select: { id: true, title: true },
    }),
    db.product.findMany({
      where: { coverMediaId: id },
      select: { id: true, title: true },
    }),
    db.freeMaterial.findMany({
      where: { coverMediaId: id },
      select: { id: true, title: true },
    }),
  ]);

  return { courses, products, materials };
}

export function usageCount(usage: MediaUsage): number {
  return usage.courses.length + usage.products.length + usage.materials.length;
}

// ─────────────────────────────────────────────────────────────────────────
//  Списъкът
// ─────────────────────────────────────────────────────────────────────────

/** Твърд лимит на списъка — като AUDIT_LIMIT в дневника. */
export const MEDIA_LIMIT = 200;

export interface AdminMediaRow {
  id: string;
  key: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  title: string | null;
  createdAt: Date;
  /** Къде се ползва — за колоната „Ползва се в“ и за филтъра. */
  usedBy: Array<{ kind: "course" | "product" | "material"; id: string; title: string }>;
}

export async function listMediaForAdmin(options: {
  search?: string;
}): Promise<AdminMediaRow[]> {
  const search = options.search?.trim();

  const rows = await db.media.findMany({
    where: search
      ? {
          OR: [
            { key: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
            { alt: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: MEDIA_LIMIT,
    select: {
      id: true,
      key: true,
      mimeType: true,
      sizeBytes: true,
      width: true,
      height: true,
      alt: true,
      title: true,
      createdAt: true,
    },
  });

  if (rows.length === 0) return [];

  // Употребите за ЦЕЛИЯ списък с три заявки, не 3×N: списъкът е до 200
  // реда и findMany по индексиран набор от id-та е един кръг до базата.
  const ids = rows.map((row) => row.id);
  const [courses, products, materials] = await Promise.all([
    db.course.findMany({
      where: { coverMediaId: { in: ids } },
      select: { id: true, title: true, coverMediaId: true },
    }),
    db.product.findMany({
      where: { coverMediaId: { in: ids } },
      select: { id: true, title: true, coverMediaId: true },
    }),
    db.freeMaterial.findMany({
      where: { coverMediaId: { in: ids } },
      select: { id: true, title: true, coverMediaId: true },
    }),
  ]);

  const usedBy = new Map<string, AdminMediaRow["usedBy"]>();
  const add = (
    kind: "course" | "product" | "material",
    items: Array<{ id: string; title: string; coverMediaId: string | null }>,
  ) => {
    for (const item of items) {
      if (!item.coverMediaId) continue;
      const list = usedBy.get(item.coverMediaId) ?? [];
      list.push({ kind, id: item.id, title: item.title });
      usedBy.set(item.coverMediaId, list);
    }
  };
  add("course", courses);
  add("product", products);
  add("material", materials);

  return rows.map((row) => ({ ...row, usedBy: usedBy.get(row.id) ?? [] }));
}

/** Изборът за picker-а на корици: всичко, най-новото първо. */
export interface MediaChoice {
  id: string;
  key: string;
  title: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export async function listMediaChoices(): Promise<MediaChoice[]> {
  return db.media.findMany({
    orderBy: { createdAt: "desc" },
    take: MEDIA_LIMIT,
    select: {
      id: true,
      key: true,
      title: true,
      alt: true,
      width: true,
      height: true,
      createdAt: true,
    },
  });
}

/**
 * Опциите за picker-а на корици — ГОТОВИ прости обекти за клиентския
 * компонент (components/admin/media-field.tsx). Мапването е тук, а не в
 * страниците, защото ще го викат три форми и три пъти писано на ръка се
 * разминава.
 */
export interface CoverPickerOption {
  id: string;
  label: string;
  year: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

export async function listCoverOptions(): Promise<CoverPickerOption[]> {
  const rows = await listMediaChoices();

  return rows.map((row) => ({
    id: row.id,
    label: row.title ?? row.key.split("/").pop() ?? row.key,
    // Ключът е media/<година>/<файл> — втората част е годината.
    year: row.key.split("/")[1] ?? "",
    url: mediaUrl(row.key),
    width: row.width,
    height: row.height,
    alt: row.alt,
  }));
}

// ─────────────────────────────────────────────────────────────────────────
//  Писането
// ─────────────────────────────────────────────────────────────────────────

export interface CreateMediaInput {
  key: string;
  bucket: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  checksum: string | null;
  uploadedById: string;
}

export async function createMedia(
  input: CreateMediaInput,
  meta: AuditMeta,
): Promise<{ id: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const row = await tx.media.create({ data: input, select: AUDITED });

    await recordChange(tx, meta, {
      action: "media.create",
      entity: "Media",
      entityId: row.id,
      // При създаване се пази цялата снимка — „разлика" спрямо нищо няма.
      after: row,
    });

    return { id: row.id };
  });
}

export async function updateMediaMeta(
  id: string,
  input: MediaMetaInput,
  meta: AuditMeta,
): Promise<void> {
  await db.$transaction(async (tx: AuditTx) => {
    const before = await tx.media.findUnique({ where: { id }, select: AUDITED });
    if (!before) throw new MediaGone();

    const after = await tx.media.update({
      where: { id },
      data: input,
      select: AUDITED,
    });

    // recordChange пази само разликите и НЕ записва нищо при „Запази"
    // без промяна — дневникът не се пълни с празни редове.
    await recordChange(tx, meta, {
      action: "media.update",
      entity: "Media",
      entityId: id,
      before,
      after,
    });
  });
}

/**
 * Изтрива РЕДА. Самият обект в хранилището се трие от извикващия СЛЕД
 * успешната транзакция (виж app/admin/mediya/actions.ts) — вътре в нея
 * не бива: провали ли се следата, редът се връща, а файлът вече го няма.
 */
export async function deleteMedia(
  id: string,
  meta: AuditMeta,
): Promise<{ key: string }> {
  return db.$transaction(async (tx: AuditTx) => {
    const before = await tx.media.findUnique({ where: { id }, select: AUDITED });
    if (!before) throw new MediaGone();

    await tx.media.delete({ where: { id } });

    // При изтриване се пази цялата снимка — тя е единственото, което
    // остава от реда.
    await recordChange(tx, meta, {
      action: "media.delete",
      entity: "Media",
      entityId: id,
      before,
    });

    return { key: before.key };
  });
}
