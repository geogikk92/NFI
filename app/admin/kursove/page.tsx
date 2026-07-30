// АДМИН · задача 17a — курсовете.
//
// Показва И непубликуваните: черновата е половината работа. Публичният
// списък (app/[locale]/(public)/kurse) вижда само публикуваните.

import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/content/states";
import { requireAdmin } from "@/lib/admin/guard";
import {
  COURSE_FORMAT_LABELS_BG,
  listAdminCourses,
} from "@/lib/admin/queries";
import { formatDate, formatNumber, toDateTimeAttribute } from "@/lib/intl";
import { formatMoney } from "@/lib/money";
import { toggleCoursePublished } from "./actions";

export const metadata: Metadata = {
  title: "Курсове",
  robots: { index: false, follow: false },
};

/**
 * Съобщенията след действие идват през адреса.
 *
 * Причината е в самото действие: превключването на публикуването е по един
 * бутон на ред, а отделно състояние за всеки ред би означавало клиентски
 * компонент около всяка клетка на таблицата.
 */
const FLASH: Record<string, { text: string; bad?: boolean }> = {
  publikuvan: { text: "Курсът е публикуван и вече се вижда на сайта." },
  skrit: { text: "Курсът е скрит от сайта." },
  iztrit: { text: "Курсът е изтрит." },
  sazdaden: { text: "Курсът е създаден." },
};

const FLASH_ERRORS: Record<string, string> = {
  nyama: "Курсът вече не съществува — някой го е изтрил междувременно.",
  baza: "Промяната не мина заради грешка в базата. Опитай пак.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCoursesPage({ searchParams }: Props) {
  await requireAdmin();

  const query = await searchParams;
  const courses = await listAdminCourses();
  const published = courses.filter((course) => course.published).length;

  // `Object.hasOwn`, не `query.greshka in FLASH_ERRORS`: операторът `in`
  // обхожда прототипната верига и „?greshka=toString" би минал за валиден
  // ключ. Същият капан вече е поправян два пъти в този проект.
  const errorKey = String(query.greshka ?? "");
  const errorFlash = Object.hasOwn(FLASH_ERRORS, errorKey)
    ? FLASH_ERRORS[errorKey]
    : null;

  const okKey = Object.keys(FLASH).find((key) => query[key] !== undefined);
  const okFlash = okKey ? FLASH[okKey] : null;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Курсове</h1>
          <p className="mt-2 text-muted-foreground">
            Всички курсове, включително непубликуваните. Публикувани:{" "}
            {formatNumber(published, "bg")} от{" "}
            {formatNumber(courses.length, "bg")}.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/kursove/nov">Нов курс</Link>
        </Button>
      </header>

      {errorFlash ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {errorFlash}
        </p>
      ) : null}

      {okFlash ? (
        <p
          role="status"
          className="mt-6 rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm"
        >
          {okFlash.text}
        </p>
      ) : null}

      {courses.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Още няма въведени курсове"
          description="Създай първия — той се появява скрит и се включва, когато текстовете са готови."
          action={
            <Button asChild>
              <Link href="/admin/kursove/nov">Нов курс</Link>
            </Button>
          }
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
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Действие
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
                    {/* Заглавието Е връзката към редакцията. Отделен бутон
                        „Редактирай" на всеки ред би удвоил спирките на Tab
                        без да добави нищо — а името на връзката („Немски
                        A1") казва накъде води по-добре от общата дума. */}
                    <Link
                      href={`/admin/kursove/${course.id}`}
                      className="underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {course.title}
                    </Link>
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

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {/* ФОРМА, не връзка: действието променя състояние и не
                        бива да става с GET — иначе всеки, който изпревари
                        адреса (търсачка, инструмент за проверка на връзки,
                        предварително зареждане на браузъра), публикува
                        курса. Същото решение е взето и при изхода в
                        app/admin/layout.tsx. */}
                    <form action={toggleCoursePublished}>
                      <input type="hidden" name="id" value={course.id} />
                      <input
                        type="hidden"
                        name="published"
                        value={course.published ? "0" : "1"}
                      />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-sm font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        {course.published ? "Скрий" : "Публикувай"}
                        {/* Кой курс — за екранния четец. Без това всички
                            бутони в таблицата се казват еднакво и списъкът
                            с връзки е безполезен. */}
                        <span className="sr-only"> курса {course.title}</span>
                      </button>
                    </form>
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
