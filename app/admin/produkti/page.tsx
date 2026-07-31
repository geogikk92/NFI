// АДМИН · продуктите.
//
// Показва И непубликуваните — публичният магазин (app/[locale]/(shop)/shop)
// вижда само публикуваните.

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import {
  PRODUCT_TYPE_LABELS,
  VAT_CATEGORY_LABELS,
  listAdminProducts,
} from "@/lib/admin/queries";
import { formatDate, formatNumber, toDateTimeAttribute } from "@/lib/intl";
import { formatMoney } from "@/lib/money";
import { toggleProductPublished } from "./actions";

export const metadata: Metadata = {
  title: "Продукти",
  robots: { index: false, follow: false },
};

const FLASH = {
  publikuvan: "Продуктът вече се продава в магазина.",
  skrit: "Продуктът е спрян от продажба.",
  iztrit: "Продуктът е изтрит.",
  sazdaden: "Продуктът е създаден.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const products = await listAdminProducts();
  const published = products.filter((product) => product.published).length;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Продукти</h1>
          <p className="mt-2 text-muted-foreground">
            Учебници и материали. В продажба:{" "}
            {formatNumber(published, "bg")} от{" "}
            {formatNumber(products.length, "bg")}.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/produkti/nov">Нов продукт</Link>
        </Button>
      </header>

      <Flash
        query={query}
        success={FLASH}
        errors={commonFlashErrors("Продуктът")}
      />

      {products.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Още няма въведени продукти"
          description="Създай първия — той се появява спрян от продажба и се пуска, когато цената и корицата са готови."
          action={
            <Button asChild>
              <Link href="/admin/produkti/nov">Нов продукт</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Продукти с вид, ДДС категория, цена, наличност и състояние на
              публикуване
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
                  ДДС
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Цена
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Наличност
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  В продажба
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-border align-top">
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    <Link
                      href={`/admin/produkti/${product.id}`}
                      className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {product.title}
                    </Link>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {product.slug}
                    </span>
                    {product.titleDe ? null : (
                      <span className="mt-0.5 block text-xs font-normal text-destructive">
                        Липсва немско заглавие
                      </span>
                    )}
                  </th>

                  <td className="px-4 py-3">
                    {PRODUCT_TYPE_LABELS[product.type]}
                  </td>

                  <td className="px-4 py-3">
                    {VAT_CATEGORY_LABELS[product.vatCategory]}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {formatMoney(product.priceCents, "bg-BG", product.currency)}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {product.type === "DIGITAL" ? (
                      // Дигиталният продукт не свършва. Тире вместо число,
                      // защото „0" тук би значело „изчерпан".
                      <span className="text-muted-foreground" title="Дигитален">
                        —
                      </span>
                    ) : product.stock === null ? (
                      <span className="text-muted-foreground">не се следи</span>
                    ) : product.stock === 0 ? (
                      <span className="font-medium text-destructive">
                        изчерпан
                      </span>
                    ) : (
                      formatNumber(product.stock, "bg")
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* Изписва се „Да"/„Не" — само цветна точка би оставила
                        състоянието невидимо за четеца и за далтонист. */}
                    <Badge variant={product.published ? "default" : "outline"}>
                      {product.published ? "Да" : "Не"}
                    </Badge>
                    {product.published && product.publishedAt ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        <time dateTime={toDateTimeAttribute(product.publishedAt)}>
                          {formatDate(product.publishedAt, "bg")}
                        </time>
                      </span>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {/* ФОРМА, не връзка: действието променя състояние и не
                        бива да става с GET. */}
                    <form action={toggleProductPublished}>
                      <input type="hidden" name="id" value={product.id} />
                      <input
                        type="hidden"
                        name="published"
                        value={product.published ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-sm font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {product.published ? "Спри" : "Пусни"}
                        <span className="sr-only">
                          {" "}
                          продукта {product.title}
                        </span>
                      </button>
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
