// АДМИН · нов продукт.
//
// Статичният сегмент „nov" печели пред [id] — Next мери статичните преди
// динамичните, а идентификаторите са cuid и не могат да са тази дума.

import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/guard";
import {
  COVER_COLOR_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  VAT_CATEGORY_HINTS,
  VAT_CATEGORY_OPTIONS,
} from "@/lib/admin/queries";
import { saveProduct } from "../actions";

export const metadata: Metadata = {
  title: "Нов продукт",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/produkti" className="underline hover:text-primary">
          Продукти
        </Link>
        <span aria-hidden> › </span>
        <span>Нов</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Нов продукт</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Продуктът се създава спрян от продажба. Пусни го чак когато цената,
          описанието и корицата са готови.
        </p>
      </header>

      <div className="mt-8 max-w-3xl">
        <ProductForm
          action={saveProduct}
          types={PRODUCT_TYPE_OPTIONS}
          vatCategories={VAT_CATEGORY_OPTIONS}
          vatHints={VAT_CATEGORY_HINTS}
          coverColors={COVER_COLOR_OPTIONS}
        />
      </div>
    </>
  );
}
