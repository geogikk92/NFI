// АДМИН · нова промоция.
//
// Статичният сегмент „nova" печели пред [id] — идентификаторите са cuid.

import type { Metadata } from "next";
import Link from "next/link";
import { DiscountForm } from "@/components/admin/discount-form";
import { requireAdmin } from "@/lib/admin/guard";
import { DISCOUNT_KIND_OPTIONS } from "@/lib/admin/queries";
import { saveDiscount } from "../actions";

export const metadata: Metadata = {
  title: "Нова промоция",
  robots: { index: false, follow: false },
};

export default async function NewDiscountPage() {
  await requireAdmin();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/promocii" className="underline hover:text-primary">
          Промоции
        </Link>
        <span aria-hidden> › </span>
        <span>Нова</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Нова промоция</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Кодът работи веднага след създаването, освен ако не зададеш начална
          дата или не махнеш отметката долу.
        </p>
      </header>

      <div className="mt-8 max-w-2xl">
        <DiscountForm action={saveDiscount} kinds={DISCOUNT_KIND_OPTIONS} />
      </div>
    </>
  );
}
