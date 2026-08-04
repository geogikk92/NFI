// АДМИН · задача 17e — отзивите.
//
// Показва И скритите: публичната страница вижда само публикуваните.
// Филтърът живее в адреса — филтриран изглед се препраща и се отваря
// същият (както при заявките за обаждане).

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { requireAdmin } from "@/lib/admin/guard";
import { countReviews, listReviewsForAdmin } from "@/lib/admin/reviews";
import { formatDate, formatNumber } from "@/lib/intl";
import { cn } from "@/lib/utils";
import { toggleReviewPublished } from "./actions";

export const metadata: Metadata = {
  title: "Отзиви",
  robots: { index: false, follow: false },
};

const FLASH = {
  publikuvan: "Отзивът вече се вижда на сайта.",
  skrit: "Отзивът е скрит от сайта.",
  iztrit: "Отзивът е изтрит.",
  sazdaden: "Отзивът е добавен.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Звездите са ДОПЪЛНЕНИЕ към числото — не единственият носител. */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="whitespace-nowrap">
      <span aria-hidden className="text-primary">
        {"★".repeat(rating)}
        <span className="text-muted-foreground">{"☆".repeat(5 - rating)}</span>
      </span>
      <span className="sr-only">{rating} от 5</span>
    </span>
  );
}

export default async function AdminReviewsPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const raw = Array.isArray(query.vidimi) ? query.vidimi[0] : query.vidimi;
  // Непозната стойност се подминава като „без филтър", вместо да гърми.
  const filter = raw === "da" ? true : raw === "ne" ? false : undefined;

  const [reviews, counts] = await Promise.all([
    listReviewsForAdmin({ published: filter }),
    countReviews(),
  ]);

  const tabs = [
    { key: undefined, label: "Всички", count: counts.total },
    { key: "da", label: "На сайта", count: counts.published },
    { key: "ne", label: "Скрити", count: counts.total - counts.published },
  ];

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight">Отзиви</h1>
          <p className="mt-2 text-muted-foreground">
            Отзивите, които получаваш по имейл, във Facebook или на живо.
            Публикуваният отзив за курс влиза и в средната му оценка.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/recenzii/nov">Нов отзив</Link>
        </Button>
      </header>

      <Flash query={query} success={FLASH} errors={commonFlashErrors("Отзивът")} />

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Филтър">
        {tabs.map((tab) => {
          const active =
            (tab.key === undefined && filter === undefined) ||
            (tab.key === "da" && filter === true) ||
            (tab.key === "ne" && filter === false);

          return (
            <Link
              key={tab.label}
              href={tab.key ? `/admin/recenzii?vidimi=${tab.key}` : "/admin/recenzii"}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border hover:bg-muted",
              )}
            >
              {tab.label} ({formatNumber(tab.count, "bg")})
            </Link>
          );
        })}
      </nav>

      {reviews.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={
            filter === undefined
              ? "Още няма отзиви"
              : "Няма отзиви в тази група"
          }
          description={
            filter === undefined
              ? "Добави първия — въвежда се на ръка, със съгласието на човека и с името, както той е пожелал да се изпише."
              : "Отзиви има, но нито един не е в тази група. Виж всички."
          }
          action={
            <Button asChild>
              <Link href={filter === undefined ? "/admin/recenzii/nov" : "/admin/recenzii"}>
                {filter === undefined ? "Нов отзив" : "Виж всички"}
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-xl border border-border">
          {reviews.map((review) => (
            <li key={review.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/recenzii/${review.id}`}
                      className="font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {review.authorName}
                    </Link>
                    <Stars rating={review.rating} />
                    <span className="text-xs uppercase text-muted-foreground">
                      {review.locale}
                    </span>
                  </p>

                  <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                    {review.body.length > 160
                      ? `${review.body.slice(0, 160)}…`
                      : review.body}
                  </p>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {review.courseTitle ?? "общ отзив"} ·{" "}
                    {formatDate(review.createdAt, "bg")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {review.published ? (
                    <Badge variant="secondary">на сайта</Badge>
                  ) : (
                    <Badge variant="outline">скрит</Badge>
                  )}

                  <form action={toggleReviewPublished}>
                    <input type="hidden" name="id" value={review.id} />
                    {raw ? (
                      <input type="hidden" name="vidimi" value={raw} />
                    ) : null}
                    <input
                      type="hidden"
                      name="published"
                      value={review.published ? "0" : "1"}
                    />
                    <Button type="submit" variant="outline" size="sm">
                      {review.published ? "Скрий" : "Публикувай"}
                    </Button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
