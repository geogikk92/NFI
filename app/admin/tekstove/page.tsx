// АДМИН · Текстове — списъкът.
//
// Това е екранът, който Василена ще отваря най-често. Затова той е и
// СПИСЪК СЪС ЗАДАЧИ: празните блокове стоят най-отгоре в червено, защото
// точно те спират пускането на сайта.
//
// Обхватът е нарочно тесен: тук са само текстовете, които НЕ са част от
// дизайна. Заглавията, бутоните и подредбата са заковани — за тях има
// отделен екран, който обяснява защо.

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flash } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import { blocksOverview } from "@/lib/content/blocks-db";
import { PAGE_LABELS, type PageId } from "@/lib/content/registry";
import { formatDate } from "@/lib/intl";

export const metadata: Metadata = {
  title: "Текстове",
  robots: { index: false, follow: false },
};

const FLASH = {
  publikuvano: "Текстът е публикуван.",
  zapazeno: "Черновата е запазена.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_ORDER: PageId[] = ["home", "about", "community", "contact"];

export default async function AdminTextsPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const blocks = await blocksOverview();
  const missing = blocks.filter((block) => block.state === "missing").length;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">Текстове</h1>
          <p className="mt-2 text-muted-foreground">
            Тук се пишат текстовете, които не са част от дизайна. Заглавията,
            бутоните и подредбата са заковани — тях ги мени Боби.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/admin/tekstove/zakliucheni">Какво не мога да сменя</Link>
        </Button>
      </header>

      <Flash query={query} success={FLASH} errors={{}} />

      {missing > 0 ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <strong>{missing}</strong>{" "}
          {missing === 1 ? "текст още липсва" : "текста още липсват"}. Докато са
          празни, на сайта се вижда жълта бележка и страницата не бива да се
          пуска.
        </p>
      ) : null}

      {PAGE_ORDER.map((page) => {
        const rows = blocks.filter((block) => block.spec.page === page);
        if (rows.length === 0) return null;

        return (
          <section key={page} className="mt-10" aria-labelledby={`str-${page}`}>
            <h2
              id={`str-${page}`}
              className="font-mono text-2xs uppercase tracking-kicker text-muted-foreground"
            >
              {PAGE_LABELS[page]}
            </h2>

            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {rows.map((block) => (
                <li key={block.spec.key}>
                  <Link
                    href={`/admin/tekstove/${block.spec.key}`}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {block.spec.label}
                      </span>
                      <span className="mt-0.5 block max-w-xl truncate text-sm text-muted-foreground">
                        {block.preview ?? "— още няма текст —"}
                      </span>
                    </span>

                    <span className="flex flex-wrap items-center gap-2">
                      {block.untranslated ? (
                        <Badge variant="outline">само на български</Badge>
                      ) : null}
                      {block.drifted ? (
                        <Badge variant="outline">оригиналът се промени</Badge>
                      ) : null}

                      {/* Плътното червено е за ПРАЗНОТО — то е нещото,
                          което иска действие. Публикуваният текст е
                          нормалното състояние и не бива да крещи. */}
                      {block.state === "missing" ? (
                        <Badge>празно</Badge>
                      ) : block.state === "draft" ? (
                        <Badge variant="destructive">чернова</Badge>
                      ) : block.state === "default" ? (
                        <Badge variant="outline">по подразбиране</Badge>
                      ) : (
                        <Badge variant="secondary">публикувано</Badge>
                      )}

                      {block.publishedAt ? (
                        <span className="text-xs whitespace-nowrap text-muted-foreground">
                          {formatDate(block.publishedAt, "bg")}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
