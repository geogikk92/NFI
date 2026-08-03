// АДМИН · безплатните материали.
//
// Показва И непубликуваните — публичната /materialien вижда само
// публикуваните. Колоната „Заявки" е броят лийдове, които материалът е
// донесъл — тя отговаря на въпроса „работи ли фунията".

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import { listMaterialsForAdmin } from "@/lib/admin/materials";
import { MATERIAL_KIND_LABELS } from "@/lib/admin/material-labels";
import { formatNumber } from "@/lib/intl";
import { toggleMaterialPublished } from "./actions";

export const metadata: Metadata = {
  title: "Безплатни материали",
  robots: { index: false, follow: false },
};

const FLASH = {
  publikuvan: "Материалът вече се вижда на сайта.",
  skrit: "Материалът е скрит от сайта.",
  iztrit: "Материалът е изтрит.",
  sazdaden: "Материалът е създаден.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminMaterialsPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const materials = await listMaterialsForAdmin();
  const published = materials.filter((material) => material.published).length;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Безплатни материали
          </h1>
          <p className="mt-2 text-muted-foreground">
            Записи и PDF-и, които събират контакти. Публикувани:{" "}
            {formatNumber(published, "bg")} от{" "}
            {formatNumber(materials.length, "bg")}.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/materiali/nov">Нов материал</Link>
        </Button>
      </header>

      <Flash
        query={query}
        success={FLASH}
        errors={commonFlashErrors("Материалът")}
      />

      {materials.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Още няма материали"
          description="Създай първия — той тръгва скрит и се публикува, когато файлът или видеото са готови."
          action={
            <Button asChild>
              <Link href="/admin/materiali/nov">Нов материал</Link>
            </Button>
          }
        />
      ) : (
        <div
          className="mt-8 overflow-x-auto rounded-xl border border-border"
          tabIndex={0}
          role="region"
          aria-label="Безплатни материали"
        >
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Материали с вид, ниво, брой заявки и състояние на публикуване
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Заглавие
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Вид
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Ниво
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Заявки
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Публикуван
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr
                  key={material.id}
                  className="border-t border-border align-top"
                >
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    <Link
                      href={`/admin/materiali/${material.id}`}
                      className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {material.title}
                    </Link>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {material.slug}
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    {MATERIAL_KIND_LABELS[material.kind]}
                  </td>
                  <td className="px-4 py-3">
                    {material.level ?? (
                      <span className="text-muted-foreground">всички</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(material.requestCount, "bg")}
                  </td>
                  <td className="px-4 py-3">
                    {material.published ? (
                      <Badge>да</Badge>
                    ) : (
                      <Badge variant="outline">скрит</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleMaterialPublished} className="inline">
                      <input type="hidden" name="id" value={material.id} />
                      <input
                        type="hidden"
                        name="published"
                        value={material.published ? "0" : "1"}
                      />
                      <Button type="submit" variant="outline" size="sm">
                        {material.published ? "Скрий" : "Публикувай"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
