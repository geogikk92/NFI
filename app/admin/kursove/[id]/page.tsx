// АДМИН · редакция на курс.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseForm } from "@/components/admin/course-form";
import { DeleteSection } from "@/components/admin/delete-section";
import { requireAdmin } from "@/lib/admin/guard";
import {
  courseDeleteBlocker,
  getCourseForEdit,
  getCourseUsage,
} from "@/lib/admin/courses";
import {
  COURSE_FORMAT_OPTIONS,
  COURSE_LEVEL_OPTIONS,
} from "@/lib/admin/queries";
import { removeCourse, saveCourse } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sazdaden?: string }>;
};

export const metadata: Metadata = {
  title: "Редакция на курс",
  robots: { index: false, follow: false },
};

export default async function EditCoursePage({ params, searchParams }: Props) {
  await requireAdmin();

  const { id } = await params;
  const { sazdaden } = await searchParams;

  const [course, usage] = await Promise.all([
    getCourseForEdit(id),
    getCourseUsage(id),
  ]);

  // Тук 404 е ВЯРНО, за разлика от публичните страници: адресът идва от
  // списъка в същия панел, тоест курс с този идентификатор наистина няма.
  if (!course || !usage) notFound();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/kursove" className="underline hover:text-primary">
          Курсове
        </Link>
        <span aria-hidden> › </span>
        <span>{course.title}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          {course.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {course.published ? (
            <>
              Публикуван на адрес{" "}
              <Link
                href={`/de/kurse/${course.slug}`}
                className="underline hover:text-primary"
              >
                /de/kurse/{course.slug}
              </Link>
            </>
          ) : (
            <>Скрит от сайта · адрес {course.slug}</>
          )}
        </p>
      </header>

      {sazdaden ? (
        // Съобщението идва от адреса, защото създаването пренасочва към
        // тази страница — състоянието на формата не преживява пренасочване.
        <p
          role="status"
          className="mt-6 max-w-3xl rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm"
        >
          <span className="font-medium text-success">Курсът е създаден.</span>{" "}
          Провери текстовете и го включи, когато е готов.
        </p>
      ) : null}

      <div className="mt-8 max-w-3xl">
        <CourseForm
          action={saveCourse}
          levels={COURSE_LEVEL_OPTIONS}
          formats={COURSE_FORMAT_OPTIONS}
          course={{
            id: course.id,
            slug: course.slug,
            title: course.title,
            titleDe: course.titleDe,
            titleEn: course.titleEn,
            level: course.level,
            format: course.format,
            summary: course.summary,
            summaryDe: course.summaryDe,
            summaryEn: course.summaryEn,
            description: course.description,
            descriptionDe: course.descriptionDe,
            descriptionEn: course.descriptionEn,
            priceCents: course.priceCents,
            durationWeeks: course.durationWeeks,
            hoursPerWeek: course.hoursPerWeek,
            maxParticipants: course.maxParticipants,
            startsAt: course.startsAt,
            published: course.published,
            sortOrder: course.sortOrder,
          }}
        />

        <DeleteSection
          action={removeCourse}
          id={course.id}
          what="курса"
          blocked={courseDeleteBlocker(usage)}
          consequence={
            "Курсът и адресът му изчезват. Пълен препис остава в дневника на " +
            "промените, но страницата /kurse/" +
            course.slug +
            " започва да дава 404 и всяка външна връзка към нея се чупи."
          }
        />
      </div>
    </>
  );
}
