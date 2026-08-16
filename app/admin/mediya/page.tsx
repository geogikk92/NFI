// АДМИН · медийната библиотека.
//
// ТАБЛИЦА с миниатюра, не галерия от картончета: таблицата казва неща,
// които галерията не може — къде се ползва файлът, липсва ли описание за
// екранен четец, колко тежи. Колоната „Ползва се в" превръща библиотеката
// от склад в инструмент: тя отговаря на въпроса „мога ли да изтрия това".

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import {
  MEDIA_LIMIT,
  listMediaForAdmin,
  type AdminMediaRow,
} from "@/lib/admin/media";
import { mediaUrl } from "@/lib/media/url";
import { formatDate, formatNumber, toDateTimeAttribute } from "@/lib/intl";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Медия",
  robots: { index: false, follow: false },
};

const FLASH = {
  kachen: "Файлът е качен.",
  iztrit: "Файлът е изтрит.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Адресът на записа, който ползва файла — за колоната „Ползва се в". */
const USED_BY_HREF: Record<AdminMediaRow["usedBy"][number]["kind"], string> = {
  course: "/admin/kursove",
  product: "/admin/produkti",
  material: "/admin/materiali",
};

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMediaPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const search = typeof query.tarsene === "string" ? query.tarsene : "";
  const filter = typeof query.filtar === "string" ? query.filtar : "";

  const all = await listMediaForAdmin({ search });

  const unused = all.filter((row) => row.usedBy.length === 0);
  const used = all.filter((row) => row.usedBy.length > 0);
  const rows =
    filter === "polzvani" ? used : filter === "nepolzvani" ? unused : all;

  const withoutAlt = all.filter((row) => !row.alt).length;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Медия</h1>
          <p className="mt-2 text-muted-foreground">
            Качените изображения — корици на курсове, продукти и материали.
            Общо: {formatNumber(all.length, "bg")}
            {withoutAlt > 0
              ? `, без описание за екранен четец: ${formatNumber(withoutAlt, "bg")}`
              : ""}
            .
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/mediya/nov">Качи файл</Link>
        </Button>
      </header>

      <Flash query={query} success={FLASH} errors={commonFlashErrors("Файлът")} />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="Филтър по ползване">
          <FilterLink
            label="Всички"
            count={all.length}
            active={filter !== "polzvani" && filter !== "nepolzvani"}
            href={searchHref("", search)}
          />
          <FilterLink
            label="Ползвани"
            count={used.length}
            active={filter === "polzvani"}
            href={searchHref("polzvani", search)}
          />
          <FilterLink
            label="Неползвани"
            count={unused.length}
            active={filter === "nepolzvani"}
            href={searchHref("nepolzvani", search)}
          />
        </nav>

        {/* Нативна GET форма: работи без JavaScript и оставя търсенето в
            адреса, тоест намереното се препраща. */}
        <form className="flex gap-2" role="search">
          {filter ? <input type="hidden" name="filtar" value={filter} /> : null}
          <label htmlFor="tarsene" className="sr-only">
            Търсене по име, ключ или описание
          </label>
          <input
            id="tarsene"
            name="tarsene"
            type="search"
            defaultValue={search}
            placeholder="търси по име или ключ"
            className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" variant="outline" size="sm">
            Търси
          </Button>
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={search || filter ? "Нищо не отговаря" : "Още няма качени файлове"}
          description={
            search || filter
              ? "Пробвай без филтър или с друга дума."
              : "Качи първата снимка — после се закача като корица от формата на курса, продукта или материала."
          }
          action={
            search || filter ? undefined : (
              <Button asChild>
                <Link href="/admin/mediya/nov">Качи файл</Link>
              </Button>
            )
          }
        />
      ) : (
        <div
          className="mt-8 overflow-x-auto rounded-xl border border-border"
          tabIndex={0}
          role="region"
          aria-label="Качени изображения"
        >
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Изображения с преглед, описание, размери, употреба и дата на
              качване
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Преглед
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Файл
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Описание
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Размери
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Ползва се в
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Качен на
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/mediya/${row.id}`}
                      className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-hidden
                      tabIndex={-1}
                    >
                      {/* Миниатюрата НЕ е връзката за клавиатурата — тя
                          дублира връзката в „Файл" и втора спирка на Tab
                          за същото място само пречи. */}
                      <Image
                        src={mediaUrl(row.key)}
                        alt=""
                        width={row.width ?? 56}
                        height={row.height ?? 56}
                        className="h-14 w-14 rounded-md border border-border object-cover"
                        sizes="56px"
                      />
                    </Link>
                  </td>
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    <Link
                      href={`/admin/mediya/${row.id}`}
                      className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {row.title ?? row.key.split("/").pop()}
                    </Link>
                    <span className="mt-0.5 block max-w-[26ch] truncate text-xs font-normal text-muted-foreground">
                      {row.key}
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    {row.alt ? (
                      <span className="block max-w-[32ch] truncate">{row.alt}</span>
                    ) : (
                      // Липсващият alt е в червено, защото достъпността е
                      // правно задължение (Директива (ЕС) 2019/882), не
                      // качествена цел.
                      <Badge
                        variant="outline"
                        className="border-destructive/40 text-destructive"
                      >
                        липсва
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {row.width && row.height
                      ? `${row.width} × ${row.height}`
                      : "—"}
                    <span className="text-muted-foreground">
                      {" "}
                      · {fileSize(row.sizeBytes)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.usedBy.length === 0 ? (
                      <span className="text-muted-foreground">никъде</span>
                    ) : (
                      <ul className="grid gap-0.5">
                        {row.usedBy.map((item) => (
                          <li key={`${item.kind}-${item.id}`}>
                            <Link
                              href={`${USED_BY_HREF[item.kind]}/${item.id}`}
                              className="underline underline-offset-4 hover:text-primary"
                            >
                              {item.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <time dateTime={toDateTimeAttribute(row.createdAt)}>
                      {formatDate(row.createdAt, "bg")}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {all.length === MEDIA_LIMIT ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Показани са последните {formatNumber(MEDIA_LIMIT, "bg")} файла —
          стесни с търсенето, ако търсеното е по-старо.
        </p>
      ) : null}
    </>
  );
}

function searchHref(filter: string, search: string): string {
  const params = new URLSearchParams();
  if (filter) params.set("filtar", filter);
  if (search) params.set("tarsene", search);
  const suffix = params.toString();
  return suffix ? `/admin/mediya?${suffix}` : "/admin/mediya";
}

function FilterLink({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border hover:bg-muted",
      )}
    >
      {label} ({formatNumber(count, "bg")})
    </a>
  );
}
