// АДМИН · етикетите на видовете материал.
//
// ОТДЕЛЕН от lib/admin/materials.ts по същата причина, по която
// limits.ts е отделен от courses.ts: онзи е „server-only" и води до
// Prisma, а тези етикети ги чете и клиентската форма. Внасянето на
// server-only модул в клиентски компонент събаря екрана с 500.

import type { MaterialKind } from "@/lib/cms/free-materials";

export const MATERIAL_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type MaterialLevel = (typeof MATERIAL_LEVELS)[number];

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  PDF: "PDF файл",
  VIDEO_VIMEO: "Видео (Vimeo)",
  VIDEO_GOTO: "Запис (GoTo)",
  AUDIO: "Аудио файл",
  LINK: "Външна връзка",
};

export const MATERIAL_KIND_OPTIONS = (
  Object.entries(MATERIAL_KIND_LABELS) as [MaterialKind, string][]
).map(([value, label]) => ({ value, label }));

export const MATERIAL_LEVEL_OPTIONS: { value: MaterialLevel; label: string }[] =
  [
    { value: "A1", label: "A1" },
    { value: "A2", label: "A2" },
    { value: "B1", label: "B1" },
    { value: "B2", label: "B2" },
    { value: "C1", label: "C1" },
    { value: "C2", label: "C2" },
  ];
