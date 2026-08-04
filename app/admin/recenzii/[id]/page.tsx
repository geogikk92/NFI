// АДМИН · редакция на отзив.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Flash, commonFlashErrors } from "@/components/admin/flash";
import { DeleteSection } from "@/components/admin/delete-section";
import { ReviewForm } from "@/components/admin/review-form";
import { requireAdmin } from "@/lib/admin/guard";
import { courseOptionsForReviews, getReviewForEdit } from "@/lib/admin/reviews";
import { formatDate } from "@/lib/intl";
import { removeReview, saveReview } from "../actions";

export const metadata: Metadata = {
  title: "Отзив",
  robots: { index: false, follow: false },
};

const FLASH = {
  sazdaden: "Отзивът е добавен.",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EditReviewPage({ params, searchParams }: Props) {
  await requireAdmin();

  const { id } = await params;
  const query = await searchParams;

  const [review, courses] = await Promise.all([
    getReviewForEdit(id),
    courseOptionsForReviews(),
  ]);
  if (!review) notFound();

  return (
    <>
      <header className="max-w-2xl">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/recenzii"
            className="underline underline-offset-4 hover:text-primary"
          >
            Отзиви
          </Link>{" "}
          / {review.authorName}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {review.authorName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {/* Датата на публикуване се пази и след скриване (за да не се
              губи историята), затова тук решава СЪСТОЯНИЕТО, не датата —
              иначе скрит отзив пишеше „публикуван на …". */}
          Добавен на {formatDate(review.createdAt, "bg")}
          {review.published && review.publishedAt
            ? ` · на сайта от ${formatDate(review.publishedAt, "bg")}`
            : review.publishedAt
              ? ` · скрит (бил е на сайта от ${formatDate(review.publishedAt, "bg")})`
              : " · още не е публикуван"}
        </p>
      </header>

      <Flash query={query} success={FLASH} errors={commonFlashErrors("Отзивът")} />

      <div className="mt-8">
        <ReviewForm
          action={saveReview}
          courses={courses.map((course) => ({
            value: course.id,
            label: course.title,
          }))}
          review={{
            id: review.id,
            authorName: review.authorName,
            rating: review.rating,
            body: review.body,
            locale: review.locale,
            courseId: review.courseId,
            published: review.published,
          }}
        />
      </div>

      <DeleteSection
        action={removeReview}
        id={review.id}
        blocked={null}
        what="отзива"
        consequence="Отзивът изчезва от сайта и от средната оценка на курса. Ако само не искаш да се вижда засега, по-добре го скрий."
      />
    </>
  );
}
