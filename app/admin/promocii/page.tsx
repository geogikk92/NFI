// АДМИН · промоционалните кодове.
//
// Списъкът показва ИСТИНСКОТО състояние, не отметката „активна": код с
// изтекъл срок или изчерпан лимит стои отметнат и изглежда изправен, а
// клиентът получава отказ. Виж discountStatus в lib/admin/discount-code.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import {
  DISCOUNT_KIND_LABELS,
  listAdminDiscounts,
} from "@/lib/admin/queries";
import {
  DISCOUNT_STATUS_LABELS,
  discountStatus,
} from "@/lib/admin/discount-code";
import { formatDate, formatNumber, toDateTimeAttribute } from "@/lib/intl";
import { formatMoney } from "@/lib/money";
import { toggleDiscountActive } from "./actions";

export const metadata: Metadata = {
  title: "Промоции",
  robots: { index: false, follow: false },
};

const FLASH = {
  vklyuchena: "Промоцията е включена.",
  izklyuchena: "Промоцията е изключена — кодът вече се отхвърля на касата.",
  iztrita: "Промоцията е изтрита.",
  sazdadena: "Промоцията е създадена.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDiscountsPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const discounts = await listAdminDiscounts();

  // Едно „сега" за целия списък, не по едно на ред: иначе два реда могат
  // да се преценят спрямо различни моменти точно на границата на срока.
  const now = new Date();
  const working = discounts.filter(
    (discount) => discountStatus(discount, now) === "active",
  ).length;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Промоции</h1>
          <p className="mt-2 text-muted-foreground">
            Кодове за отстъпка. Работят в момента:{" "}
            {formatNumber(working, "bg")} от{" "}
            {formatNumber(discounts.length, "bg")}.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/promocii/nova">Нова промоция</Link>
        </Button>
      </header>

      <Flash
        query={query}
        success={FLASH}
        errors={commonFlashErrors("Промоцията")}
      />

      {discounts.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Още няма промоционални кодове"
          description="Кодът се въвежда от клиента в количката и намалява сумата на поръчката."
          action={
            <Button asChild>
              <Link href="/admin/promocii/nova">Нова промоция</Link>
            </Button>
          }
        />
      ) : (
        <div
          className="mt-8 overflow-x-auto rounded-xl border border-border"
          tabIndex={0}
          role="region"
          aria-label="Промоционални кодове"
        >
          {/* tabIndex={0} + role="region": контейнерът СЕ ПРЕВЪРТА
            настрани (overflow-x), а превъртаща се област, до която не се
            стига с Tab, е недостъпна за човек без мишка — WCAG 2.1.1
            „Клавиатура". Ролята и името са задължителни заедно с
            tabIndex: спирка на Tab, която четецът обявява само като
            „група", не казва нищо. */}
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Промоционални кодове с отстъпка, срок, използвания и състояние
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Код
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Отстъпка
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  От поръчка
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Срок
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Използвана
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Състояние
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => {
                const status = discountStatus(discount, now);
                // „Работи" е единственото добро състояние. Всичко останало
                // значи, че клиентът получава отказ — и трябва да се вижда
                // като различно, не като нюанс.
                const good = status === "active";

                return (
                  <tr
                    key={discount.id}
                    className="border-t border-border align-top"
                  >
                    <th scope="row" className="px-4 py-3 text-left font-medium">
                      <Link
                        href={`/admin/promocii/${discount.id}`}
                        className="font-mono underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {discount.code}
                      </Link>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {DISCOUNT_KIND_LABELS[discount.kind]}
                      </span>
                    </th>

                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {discount.kind === "PERCENT"
                        ? `${formatNumber(discount.value, "bg")} %`
                        : formatMoney(discount.value, "bg-BG")}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {discount.minOrderCents === null ? (
                        <span className="text-muted-foreground">без минимум</span>
                      ) : (
                        formatMoney(discount.minOrderCents, "bg-BG")
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {discount.startsAt === null && discount.endsAt === null ? (
                        <span className="text-muted-foreground">безсрочна</span>
                      ) : (
                        <>
                          {discount.startsAt ? (
                            <time dateTime={toDateTimeAttribute(discount.startsAt)}>
                              {formatDate(discount.startsAt, "bg")}
                            </time>
                          ) : (
                            "…"
                          )}
                          {" – "}
                          {discount.endsAt ? (
                            <time dateTime={toDateTimeAttribute(discount.endsAt)}>
                              {formatDate(discount.endsAt, "bg")}
                            </time>
                          ) : (
                            "…"
                          )}
                        </>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatNumber(discount.redemptions, "bg")}
                      {discount.maxRedemptions === null ? null : (
                        <span className="text-muted-foreground">
                          {" / "}
                          {formatNumber(discount.maxRedemptions, "bg")}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {/* Състоянието СЕ ИЗПИСВА с дума. Само цвят би оставил
                          разликата невидима за четеца и за далтонист. */}
                      <Badge variant={good ? "default" : "outline"}>
                        {DISCOUNT_STATUS_LABELS[status]}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <form action={toggleDiscountActive}>
                        <input type="hidden" name="id" value={discount.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={discount.active ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-sm font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          {discount.active ? "Изключи" : "Включи"}
                          <span className="sr-only">
                            {" "}
                            промоцията {discount.code}
                          </span>
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
