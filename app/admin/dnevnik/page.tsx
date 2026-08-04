// АДМИН · задача 17f1 — одитният дневник.
//
// Отговаря на един въпрос: КОЙ смени това и КОГА. Затова редът показва
// разликата, а не целия запис — „цената стана 129 € от 149 €" се чете,
// „ето двайсет полета преди и след" не се чете.
//
// Само за четене. Дневник, който може да се пипа от същия панел, чиито
// действия записва, не доказва нищо.

import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { requireAdmin } from "@/lib/admin/guard";
import {
  AUDIT_LIMIT,
  actionLabel,
  auditChanges,
  auditEntities,
  auditKind,
  entityLabel,
  entryTitle,
  listAuditEntries,
  resolveEntityTitles,
} from "@/lib/admin/audit-log";
import { formatDateTime, formatNumber } from "@/lib/intl";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Дневник на промените",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuditLogPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const entityRaw = one(query.vid);
  const actor = one(query.koi);

  const entities = await auditEntities();
  // Непознат вид в адреса се подминава като „без филтър", вместо да гърми.
  const entity = entities.some((row) => row.entity === entityRaw)
    ? entityRaw
    : undefined;

  const entries = await listAuditEntries({ entity, actor });
  const titles = await resolveEntityTitles(entries);
  const total = entities.reduce((sum, row) => sum + row.count, 0);

  return (
    <>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Дневник на промените
        </h1>
        <p className="mt-2 text-muted-foreground">
          Всяка промяна от този панел оставя следа тук: кой, какво и кога.
          Записите не могат да се редактират или изтриват — това е смисълът
          им.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="Филтър по вид">
          <FilterLink
            label="Всички"
            count={total}
            active={!entity}
            href="/admin/dnevnik"
          />
          {entities.map((row) => (
            <FilterLink
              key={row.entity}
              label={entityLabel(row.entity)}
              count={row.count}
              active={entity === row.entity}
              href={`/admin/dnevnik?vid=${encodeURIComponent(row.entity)}`}
            />
          ))}
        </nav>

        {/* Нативна GET форма: работи без JavaScript и оставя търсенето в
            адреса, тоест намереното се препраща. */}
        <form className="flex gap-2" role="search">
          {entity ? <input type="hidden" name="vid" value={entity} /> : null}
          <label htmlFor="koi" className="sr-only">
            Търсене по човек
          </label>
          <input
            id="koi"
            name="koi"
            type="search"
            defaultValue={actor ?? ""}
            placeholder="кой (имейл)"
            className="rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button type="submit" variant="outline" size="sm">
            Търси
          </Button>
        </form>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={
            entity || actor ? "Няма записи по този филтър" : "Дневникът е празен"
          }
          description={
            entity || actor
              ? "Промени има, но не такива."
              : "Първият запис ще се появи, щом някой промени нещо от панела."
          }
        />
      ) : (
        <>
          <ol className="mt-8 space-y-3">
            {entries.map((entry) => {
              const kind = auditKind(entry);
              const changes = auditChanges(entry);

              return (
                <li
                  key={entry.id}
                  className="rounded-xl border border-border px-4 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={kind === "delete" ? "destructive" : "secondary"}
                      >
                        {entityLabel(entry.entity)}
                      </Badge>
                      <span className="font-medium">
                        {actionLabel(entry.action)}
                      </span>
                      {/* КОЙ запис — иначе „Курс · променен" е гатанка при
                          повече от един курс. */}
                      {entryTitle(entry, titles) ? (
                        <span className="font-medium">
                          „{entryTitle(entry, titles)}“
                        </span>
                      ) : null}
                      {entry.actorEmail ? (
                        <span className="text-sm text-muted-foreground">
                          от {entry.actorEmail}
                        </span>
                      ) : null}
                    </p>

                    <time
                      dateTime={entry.createdAt.toISOString()}
                      className="text-sm whitespace-nowrap text-muted-foreground"
                    >
                      {formatDateTime(entry.createdAt, "bg")}
                    </time>
                  </div>

                  {changes.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {changes.map((change) => (
                        <li
                          key={change.field}
                          className="flex flex-wrap gap-x-2 border-l-2 border-border pl-3"
                        >
                          <span className="text-muted-foreground">
                            {change.label}:
                          </span>
                          {kind === "update" ? (
                            /* Зачертаването и стрелката са ВИЗУАЛНИ. За
                               екранен четец двете стойности звучат еднакво
                               важни и редът става безсмислен — затова
                               „било" и „стана" се изговарят, без да се
                               виждат. */
                            <span>
                              <span className="sr-only">било </span>
                              <span className="text-muted-foreground line-through">
                                {change.before ?? "празно"}
                              </span>{" "}
                              <span aria-hidden>→</span>
                              <span className="sr-only">, стана </span>{" "}
                              <span>{change.after ?? "празно"}</span>
                            </span>
                          ) : (
                            <span>
                              {(kind === "create" ? change.after : change.before) ??
                                "празно"}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Без записани подробности.
                    </p>
                  )}
                </li>
              );
            })}
          </ol>

          {entries.length === AUDIT_LIMIT ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Показани са последните {formatNumber(AUDIT_LIMIT, "bg")} записа.
              Стесни с филтъра по вид или по човек, за да стигнеш до по-стари.
            </p>
          ) : null}
        </>
      )}
    </>
  );
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
