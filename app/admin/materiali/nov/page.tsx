// АДМИН · нов безплатен материал.
//
// Статичният сегмент „nov" печели пред [id] — Next мери статичните преди
// динамичните, а идентификаторите са cuid и не могат да са тази дума.

import type { Metadata } from "next";
import Link from "next/link";
import { MaterialForm } from "@/components/admin/material-form";
import { requireAdmin } from "@/lib/admin/guard";
import {
  MATERIAL_KIND_OPTIONS,
  MATERIAL_LEVEL_OPTIONS,
} from "@/lib/admin/material-labels";
import { saveMaterial } from "../actions";

export const metadata: Metadata = {
  title: "Нов материал",
  robots: { index: false, follow: false },
};

export default async function NewMaterialPage() {
  await requireAdmin();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/materiali" className="underline hover:text-primary">
          Безплатни материали
        </Link>
        <span aria-hidden> › </span>
        <span>Нов</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Нов материал</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Материалът се създава скрит. Публикувай го чак когато файлът или
          видеото са на мястото си — посетителят не бива да удря празна
          страница.
        </p>
      </header>

      <div className="mt-8 max-w-3xl">
        <MaterialForm
          action={saveMaterial}
          kinds={MATERIAL_KIND_OPTIONS}
          levels={MATERIAL_LEVEL_OPTIONS}
        />
      </div>
    </>
  );
}
