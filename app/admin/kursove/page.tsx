// АДМИН · задача 17a — курсовете.
//
// Показва И непубликуваните: черновата е половината работа. Публичният
// списък (app/[locale]/(public)/kurse) вижда само публикуваните.

import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/content/states";
import { requireAdmin } from "@/lib/admin/guard";
import {
  COURSE_FORMAT_LABELS_BG,
  listAdminCourses,
} from "@/lib/admin/queries";
import { formatDate, formatNumber, toDateTimeAttribute } from "@/lib/intl";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Курсове",
  robots: { index: false, follow: false },
};

export default async function AdminCoursesPage() {
  await requireAdmin();

  const courses = await listAdminCourses();
  const published = courses.filter((course) => course.published).length;

  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Курсове</h1>
        <p className="mt-2 text-muted-foreground">
          Всички курсове, включително непубликуваните. Публикувани:{" "}
          {formatNumber(published, "bg")} от {formatNumber(courses.length, "bg")}
          .
        </p>
      </header>

      {courses.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Още няма въведени курсове"
          description="Курсовете се въвеждат в базата. Екранът за създаване идва със следващата задача по админа."
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Курсове с ниво, формат, цена и състояние на публикуване
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Заглавие
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Ниво
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Формат
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Цена
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Начало
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  Публикуван
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className="border-t border-border align-top">
                  {/* Заглавието е заглавие на реда — четецът го обявява
                      преди всяка следваща клетка. */}
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-medium"
                  >
                    {course.title}
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {course.slug}
                    </span>
                    {/* Липсващият немски превод се вижда веднага: немският е
                        основният език на сайта и курс без него излиза пред
                        посетителя с българско заглавие. */}
                    {course.titleDe ? null : (
                      <span className="mt-0.5 block text-xs font-normal text-destructive">
                        Липсва немско заглавие
                      </span>
                    )}
                  </th>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {course.level}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {COURSE_FORMAT_LABELS_BG[course.format]}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {/* Парите МИНАВАТ през formatMoney — центове, никога
                        Float, и никога ръчно „/ 100". */}
                    {course.priceCents === null ? (
                      <span className="text-muted-foreground">
                        не е зададена
                      </span>
                    ) : (
                      formatMoney(course.priceCents, "bg-BG", course.currency)
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {course.startsAt ? (
                      <time dateTime={toDateTimeAttribute(course.startsAt)}>
                        {formatDate(course.startsAt, "bg")}
                      </time>
                    ) : (
                      <span className="text-muted-foreground">
                        не е насрочено
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {/* „Да"/„Не" СЕ ИЗПИСВА. Само цветна точка би оставила
                        състоянието невидимо за четеца и за далтонист. */}
                    <Badge
                      variant={course.published ? "default" : "outline"}
                    >
                      {course.published ? "Да" : "Не"}
                    </Badge>
                    {course.published && course.publishedAt ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        <time
                          dateTime={toDateTimeAttribute(course.publishedAt)}
                        >
                          {formatDate(course.publishedAt, "bg")}
                        </time>
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
