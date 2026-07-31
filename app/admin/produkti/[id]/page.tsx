// АДМИН · редакция на продукт.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { DeleteSection } from "@/components/admin/delete-section";
import { requireAdmin } from "@/lib/admin/guard";
import {
  getProductForEdit,
  getProductUsage,
  productDeleteBlocker,
} from "@/lib/admin/products";
import {
  COVER_COLOR_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  VAT_CATEGORY_HINTS,
  VAT_CATEGORY_OPTIONS,
} from "@/lib/admin/queries";
import { removeProduct, saveProduct } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sazdaden?: string }>;
};

export const metadata: Metadata = {
  title: "Редакция на продукт",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({ params, searchParams }: Props) {
  await requireAdmin();

  const { id } = await params;
  const { sazdaden } = await searchParams;

  const [product, usage] = await Promise.all([
    getProductForEdit(id),
    getProductUsage(id),
  ]);

  // 404 тук е ВЯРНО, за разлика от публичните страници: адресът идва от
  // списъка в същия панел, значи продукт с този идентификатор няма.
  if (!product || !usage) notFound();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/produkti" className="underline hover:text-primary">
          Продукти
        </Link>
        <span aria-hidden> › </span>
        <span>{product.title}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {product.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {product.published ? (
            <>
              В продажба на адрес{" "}
              <Link
                href={`/de/shop/${product.slug}`}
                className="underline hover:text-primary"
              >
                /de/shop/{product.slug}
              </Link>
            </>
          ) : (
            <>Спрян от продажба · адрес {product.slug}</>
          )}
        </p>
      </header>

      {sazdaden ? (
        <p
          role="status"
          className="mt-6 max-w-3xl rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm"
        >
          <span className="font-medium text-success">Продуктът е създаден.</span>{" "}
          Провери корицата и го пусни, когато е готов.
        </p>
      ) : null}

      <div className="mt-8 max-w-3xl">
        <ProductForm
          action={saveProduct}
          types={PRODUCT_TYPE_OPTIONS}
          vatCategories={VAT_CATEGORY_OPTIONS}
          vatHints={VAT_CATEGORY_HINTS}
          coverColors={COVER_COLOR_OPTIONS}
          product={{
            id: product.id,
            slug: product.slug,
            title: product.title,
            titleDe: product.titleDe,
            titleEn: product.titleEn,
            description: product.description,
            descriptionDe: product.descriptionDe,
            descriptionEn: product.descriptionEn,
            type: product.type,
            priceCents: product.priceCents,
            vatCategory: product.vatCategory,
            weightGrams: product.weightGrams,
            stock: product.stock,
            coverColor: product.coverColor,
            coverBrand: product.coverBrand,
            coverEyebrow: product.coverEyebrow,
            coverTitle: product.coverTitle,
            coverMeta: product.coverMeta,
            published: product.published,
            sortOrder: product.sortOrder,
          }}
        />

        <DeleteSection
          action={removeProduct}
          id={product.id}
          what="продукта"
          blocked={productDeleteBlocker(usage)}
          consequence={
            `Продуктът и адресът му изчезват${
              usage.files > 0
                ? `, заедно с ${usage.files} прикачени файла`
                : ""
            }. Пълен препис остава в дневника на промените, но страницата ` +
            `/shop/${product.slug} започва да дава 404.`
          }
        />
      </div>
    </>
  );
}
