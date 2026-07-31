// АДМИН · редакция на промоция.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscountForm } from "@/components/admin/discount-form";
import { DeleteSection } from "@/components/admin/delete-section";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin/guard";
import {
  discountDeleteBlocker,
  getDiscountForEdit,
  getDiscountUsage,
} from "@/lib/admin/discounts";
import {
  DISCOUNT_STATUS_LABELS,
  discountStatus,
} from "@/lib/admin/discount-code";
import { DISCOUNT_KIND_OPTIONS } from "@/lib/admin/queries";
import { removeDiscount, saveDiscount } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sazdadena?: string }>;
};

export const metadata: Metadata = {
  title: "Редакция на промоция",
  robots: { index: false, follow: false },
};

export default async function EditDiscountPage({ params, searchParams }: Props) {
  await requireAdmin();

  const { id } = await params;
  const { sazdadena } = await searchParams;

  const [discount, usage] = await Promise.all([
    getDiscountForEdit(id),
    getDiscountUsage(id),
  ]);

  if (!discount || !usage) notFound();

  const status = discountStatus(discount);

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/promocii" className="underline hover:text-primary">
          Промоции
        </Link>
        <span aria-hidden> › </span>
        <span>{discount.code}</span>
      </nav>

      <header className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">
          {discount.code}
        </h1>
        {/* Истинското състояние, не отметката: изтекъл код стои „активен"
            и изглежда изправен, а клиентът получава отказ. */}
        <Badge variant={status === "active" ? "default" : "outline"}>
          {DISCOUNT_STATUS_LABELS[status]}
        </Badge>
      </header>

      {sazdadena ? (
        <p
          role="status"
          className="mt-6 max-w-2xl rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm"
        >
          <span className="font-medium text-success">
            Промоцията е създадена.
          </span>{" "}
          Клиентът я въвежда в количката.
        </p>
      ) : null}

      <div className="mt-8 max-w-2xl">
        <DiscountForm
          action={saveDiscount}
          kinds={DISCOUNT_KIND_OPTIONS}
          discount={{
            id: discount.id,
            code: discount.code,
            kind: discount.kind,
            value: discount.value,
            minOrderCents: discount.minOrderCents,
            maxRedemptions: discount.maxRedemptions,
            redemptions: discount.redemptions,
            startsAt: discount.startsAt,
            endsAt: discount.endsAt,
            active: discount.active,
          }}
        />

        <DeleteSection
          action={removeDiscount}
          id={discount.id}
          what="промоцията"
          blocked={discountDeleteBlocker(usage)}
          consequence={
            "Кодът изчезва завинаги и ако някой го е получил в реклама, " +
            "въвеждането му ще дава „невалиден код“. Пълен препис остава в " +
            "дневника на промените. Ако искаш само да спре да работи — " +
            "изключи го вместо това."
          }
        />
      </div>
    </>
  );
}
