// АДМИН · нов отзив.

import type { Metadata } from "next";
import Link from "next/link";
import { ReviewForm } from "@/components/admin/review-form";
import { requireAdmin } from "@/lib/admin/guard";
import { courseOptionsForReviews } from "@/lib/admin/reviews";
import { saveReview } from "../actions";

export const metadata: Metadata = {
  title: "Нов отзив",
  robots: { index: false, follow: false },
};

export default async function NewReviewPage() {
  await requireAdmin();

  const courses = await courseOptionsForReviews();

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
          / нов
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Нов отзив</h1>
        <p className="mt-2 text-muted-foreground">
          Въведи го дословно, както е казан. Питай човека дали е съгласен да се
          покаже на сайта и с какво име.
        </p>
      </header>

      <div className="mt-8">
        <ReviewForm
          action={saveReview}
          courses={courses.map((course) => ({
            value: course.id,
            label: course.title,
          }))}
        />
      </div>
    </>
  );
}
