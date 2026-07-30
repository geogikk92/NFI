"use server";

// АДМИН · курсовете — действията, които пишат.
//
// Всяко действие започва с requireAdmin(). Пазачът е в layout-а, но НЕ и в
// server action: действията се викат по свой път през RSC протокола и
// layout-ът не стои между заявката и тях. Забравена проверка тук значи
// отворен запис в базата за целия интернет — затова е първият ред на всяка
// функция, без изключение.

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { auditMeta } from "@/lib/admin/audit";
import {
  type AdminFormState,
  CHECK_FIELDS,
  invalid,
  uniqueConflict,
} from "@/lib/admin/form";
import {
  CourseGone,
  CourseInUse,
  createCourse,
  deleteCourse,
  parseCourseForm,
  setCoursePublished,
  updateCourse,
} from "@/lib/admin/courses";

// ─────────────────────────────────────────────────────────────────────────
//  ЗАЩО ТУК НЯМА revalidatePath — измерено, не предположено
// ─────────────────────────────────────────────────────────────────────────
// Първо го добавих по навик и написах, че поправя „изтриваш курс, а той
// още е в списъка". После проверих: беше ГРЕШНО. Заглавието наистина се
// намираше в страницата след изтриване, но само вътре в <script> — RSC
// пратката от предишния преход. Самата таблица беше вярна.
//
// Проверката, която реши въпроса, минаваше не с презареждане, а с ВРЪЗКИ,
// тоест по пътя, по който се движи човек:
//
//   Курсове → Нов → Създай → Курсове   → новият курс е там   ✓
//   курс → Изтрий → Табло → Курсове    → изтритият го няма   ✓
//
// и двете БЕЗ никакво обезсилване. Причината е, че app/admin/layout.tsx
// вече обявява `dynamic = "force-dynamic"`, а Next не преизползва
// динамични страници от кеша на маршрутизатора.
//
// Същото важи и за публичните /kurse: те са динамични, защото SiteShell
// чете бисквитки. e2e/kursove.mjs проверява точно това — публикуваният
// курс се появява веднага, без изчакване.
//
// Ако някой ден страниците станат статични (PPR, изнесен брояч на
// количката), обезсилването ЩЕ трябва. Дотогава то е код, който нищо не
// прави, с коментар, който твърди обратното — а такъв код заблуждава.

/** Съобщенията при сблъсък на уникален адрес — по колона от базата. */
const SLUG_TAKEN = {
  slug:
    "Този адрес вече се ползва от друг курс. Избери друг — адресът е " +
    "част от връзката към страницата и не може да се повтаря.",
};

/**
 * Превръща изключение от базата в съобщение, а не в бяла страница.
 *
 * Три случая са ОЧАКВАНИ и имат смислен текст. Всичко останало се записва
 * в лога и излиза като общо съобщение: суровият текст на драйвера не
 * помага на никого и понякога издава части от заявката.
 */
function explain(error: unknown, data: FormData): AdminFormState {
  const conflict = uniqueConflict(error, SLUG_TAKEN);
  if (conflict) return invalid(data, CHECK_FIELDS, conflict);

  if (error instanceof CourseGone) {
    return invalid(
      data,
      "Курсът е бил изтрит, докато формата е стояла отворена. " +
        "Копирай написаното и го създай наново.",
    );
  }

  if (error instanceof CourseInUse) {
    return invalid(data, error.message);
  }

  console.error("[admin] Записът на курс се провали:", error);

  return invalid(
    data,
    "Записът не мина заради грешка в базата. Опитай пак след малко — " +
      "написаното е запазено във формата.",
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Създаване и редакция
// ─────────────────────────────────────────────────────────────────────────

export async function saveCourse(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = parseCourseForm(data);

  if (!parsed.ok) {
    return invalid(data, CHECK_FIELDS, parsed.fieldErrors);
  }

  // Празно поле „id" значи нов курс. Идва от скрито поле във формата, а не
  // от адреса, за да е една и съща формата в двата случая.
  const id = String(data.get("id") ?? "").trim();
  const meta = await auditMeta(admin);

  let createdId: string | null = null;

  try {
    if (id) {
      await updateCourse(id, parsed.value, meta);
    } else {
      createdId = (await createCourse(parsed.value, meta)).id;
    }
  } catch (error) {
    return explain(error, data);
  }


  // redirect() ХВЪРЛЯ по устройство и затова стои ИЗВЪН try блока. Вътре
  // собственият му сигнал би бил хванат от catch-а и превърнат в
  // „грешка в базата" — а курсът вече е създаден.
  if (createdId) {
    redirect(`/admin/kursove/${createdId}?sazdaden=1`);
  }

  return {
    status: "success",
    message: "Промените са записани.",
  };
}

// ─────────────────────────────────────────────────────────────────────────
//  Публикуване от списъка
// ─────────────────────────────────────────────────────────────────────────

/**
 * Превключва публикуването без да отваря формата.
 *
 * Резултатът се съобщава през адреса, а не през състояние на формата:
 * списъкът има по един такъв бутон на ред и отделно състояние за всеки би
 * означавало клиентски компонент около всяка клетка.
 */
export async function toggleCoursePublished(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  const next = data.get("published") === "1";

  if (!id) redirect("/admin/kursove");

  try {
    await setCoursePublished(id, next, await auditMeta(admin));
  } catch (error) {
    if (error instanceof CourseGone) {
      redirect("/admin/kursove?greshka=nyama");
    }
    console.error("[admin] Публикуването на курс се провали:", error);
    redirect("/admin/kursove?greshka=baza");
  }


  redirect(next ? "/admin/kursove?publikuvan=1" : "/admin/kursove?skrit=1");
}

// ─────────────────────────────────────────────────────────────────────────
//  Изтриване
// ─────────────────────────────────────────────────────────────────────────

export async function removeCourse(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();

  if (!id) {
    return invalid(data, "Липсва курс за изтриване.");
  }

  // Втората отметка е нарочна спирачка. Изтриването е единственото
  // действие в панела, което не се отменя — снимката в дневника остава, но
  // курсът си отива заедно с адреса си.
  if (data.get("confirm") === null) {
    return invalid(data, "Отметни потвърждението, за да се изтрие курсът.", {
      confirm: "Без тази отметка курсът не се изтрива.",
    });
  }

  try {
    await deleteCourse(id, await auditMeta(admin));
  } catch (error) {
    return explain(error, data);
  }


  redirect("/admin/kursove?iztrit=1");
}
