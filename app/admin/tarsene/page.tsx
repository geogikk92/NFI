// АДМИН · задача 17f1 — глобалното търсене.
//
// Формата е нативна GET: работи без JavaScript, търсенето остава в адреса
// и намереното може да се препрати.

import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { requireAdmin } from "@/lib/admin/guard";
import { MIN_QUERY_LENGTH, searchEverywhere } from "@/lib/admin/search";
import { formatNumber } from "@/lib/intl";

export const metadata: Metadata = {
  title: "Търсене",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSearchPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const raw = Array.isArray(query.q) ? query.q[0] : query.q;
  const term = (raw ?? "").trim();

  const groups = term.length >= MIN_QUERY_LENGTH
    ? await searchEverywhere(term)
    : [];
  const found = groups.reduce((sum, group) => sum + group.hits.length, 0);

  return (
    <>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Търсене</h1>
        <p className="mt-2 text-muted-foreground">
          Търси наведнъж в курсове, продукти, материали, отзиви, сертификати,
          абонати и заявки за обаждане.
        </p>
      </header>

      <form className="mt-6 flex max-w-xl gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Какво търсиш
        </label>
        <input
          id="q"
          name="q"
          type="search"
          autoFocus
          defaultValue={term}
          placeholder="име, имейл, заглавие, номер…"
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <Button type="submit">Търси</Button>
      </form>

      {term.length === 0 ? null : term.length < MIN_QUERY_LENGTH ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Напиши поне {MIN_QUERY_LENGTH} знака.
        </p>
      ) : groups.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Нищо не се намери"
          description={`Няма съвпадение за „${term}“. Опитай с част от думата — търси се навсякъде в текста, не само в началото.`}
        />
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            {formatNumber(found, "bg")}{" "}
            {found === 1 ? "резултат" : "резултата"} за „{term}“
          </p>

          <div className="mt-6 space-y-8">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`gr-${group.key}`}>
                <h2
                  id={`gr-${group.key}`}
                  className="font-mono text-2xs uppercase tracking-kicker text-muted-foreground"
                >
                  {group.label}
                </h2>

                <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {group.hits.map((hit) => (
                    <li key={`${group.key}-${hit.id}`}>
                      <Link
                        href={hit.href}
                        className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <span className="font-medium break-all">
                          {hit.title}
                        </span>
                        {hit.detail ? (
                          <span className="text-sm text-muted-foreground">
                            {hit.detail}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Показани са до пет на вид. За пълен списък отвори съответния
            раздел и ползвай неговите филтри.
          </p>
        </>
      )}
    </>
  );
}
