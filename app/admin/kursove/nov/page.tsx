// АДМИН · нов курс.
//
// Пътят е СТАТИЧЕН и затова печели пред [id] — Next мери статичните
// сегменти преди динамичните. Курс с идентификатор „nov" би бил закрит от
// тази страница, но идентификаторите са cuid („cm3x…") и не могат да са
// такава дума.

import type { Metadata } from "next";
import Link from "next/link";
import { CourseForm } from "@/components/admin/course-form";
import { requireAdmin } from "@/lib/admin/guard";
import { listCoverOptions } from "@/lib/admin/media";
import {
  COURSE_FORMAT_OPTIONS,
  COURSE_LEVEL_OPTIONS,
} from "@/lib/admin/queries";
import { saveCourse } from "../actions";

export const metadata: Metadata = {
  title: "Нов курс",
  robots: { index: false, follow: false },
};

export default async function NewCoursePage() {
  // Пазачът е и в layout-а. Двойно е нарочно — виж коментара там.
  await requireAdmin();

  const covers = await listCoverOptions();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/kursove" className="underline hover:text-primary">
          Курсове
        </Link>
        <span aria-hidden> › </span>
        <span>Нов</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Нов курс</h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Курсът се създава скрит. Включи го чак когато текстовете са готови —
          непубликуваният курс не се вижда никъде извън този панел.
        </p>
      </header>

      <div className="mt-8 max-w-3xl">
        <CourseForm
          action={saveCourse}
          levels={COURSE_LEVEL_OPTIONS}
          formats={COURSE_FORMAT_OPTIONS}
          covers={covers}
        />
      </div>
    </>
  );
}
