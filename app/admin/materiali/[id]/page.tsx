// АДМИН · редакция на безплатен материал.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MaterialForm } from "@/components/admin/material-form";
import { DeleteSection } from "@/components/admin/delete-section";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import { getMaterialForEdit } from "@/lib/admin/materials";
import {
  MATERIAL_KIND_OPTIONS,
  MATERIAL_LEVEL_OPTIONS,
} from "@/lib/admin/material-labels";
import { db } from "@/lib/db";
import { removeMaterial, saveMaterial } from "../actions";

export const metadata: Metadata = {
  title: "Редакция на материал",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditMaterialPage({ params, searchParams }: Props) {
  await requireAdmin();

  const { id } = await params;
  const query = await searchParams;

  const [material, requestCount] = await Promise.all([
    getMaterialForEdit(id),
    db.downloadGrant.count({ where: { freeMaterialId: id } }),
  ]);

  if (!material) notFound();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/materiali" className="underline hover:text-primary">
          Безплатни материали
        </Link>
        <span aria-hidden> › </span>
        <span>{material.title}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {material.title}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {requestCount === 0
              ? "Още никой не го е поискал."
              : `Поискан ${requestCount} пъти — това са контакти във фунията.`}
          </p>
        </div>
        {material.published ? (
          <Link
            href={`/bg/materialien/${material.slug}`}
            className="text-sm underline underline-offset-4 hover:text-primary"
          >
            Виж на сайта ↗
          </Link>
        ) : null}
      </header>

      <Flash
        query={query}
        success={{ sazdaden: "Материалът е създаден." }}
        errors={commonFlashErrors("Материалът")}
      />

      <div className="mt-8 max-w-3xl">
        <MaterialForm
          action={saveMaterial}
          kinds={MATERIAL_KIND_OPTIONS}
          levels={MATERIAL_LEVEL_OPTIONS}
          material={{
            id: material.id,
            slug: material.slug,
            title: material.title,
            titleDe: material.titleDe,
            titleEn: material.titleEn,
            description: material.description,
            descriptionDe: material.descriptionDe,
            descriptionEn: material.descriptionEn,
            kind: material.kind,
            storageKey: material.storageKey,
            externalId: material.externalId,
            level: material.level,
            published: material.published,
            sortOrder: material.sortOrder,
          }}
        />

        <DeleteSection
          action={removeMaterial}
          id={material.id}
          what="материала"
          blocked={null}
          consequence={
            `Материалът и адресът му изчезват${
              requestCount > 0
                ? `, ЗАЕДНО СЪС ${requestCount} заявки за достъп — това са събрани контакти`
                : ""
            }. Пълен препис остава в дневника на промените.`
          }
        />
      </div>
    </>
  );
}
