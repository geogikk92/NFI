"use server";

// АДМИН · рецензиите — действията, които пишат.
// По шаблона на app/admin/materiali/actions.ts.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { auditMeta } from "@/lib/admin/audit";
import { type AdminFormState, CHECK_FIELDS, invalid } from "@/lib/admin/form";
import {
  ReviewGone,
  courseExists,
  createReview,
  deleteReview,
  parseReviewForm,
  setReviewPublished,
  updateReview,
} from "@/lib/admin/reviews";

function explain(error: unknown, data: FormData): AdminFormState {
  if (error instanceof ReviewGone) {
    return invalid(
      data,
      "Отзивът е бил изтрит, докато формата е стояла отворена. " +
        "Копирай написаното и го добави наново.",
    );
  }

  console.error("[admin] Записът на отзив се провали:", error);

  return invalid(
    data,
    "Записът не мина заради грешка в базата. Опитай пак след малко — " +
      "написаното е запазено във формата.",
  );
}

export async function saveReview(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = parseReviewForm(data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  // Курсът се сверява ТУК, преди записа: изтрит междувременно курс би
  // вдигнал нарушение на чуждия ключ и грешката щеше да излезе като
  // „грешка в базата", вместо до полето, което може да се поправи.
  if (parsed.value.courseId && !(await courseExists(parsed.value.courseId))) {
    return invalid(data, CHECK_FIELDS, {
      courseId: "Този курс вече не съществува. Презареди страницата и избери друг.",
    });
  }

  const id = String(data.get("id") ?? "").trim();
  const meta = await auditMeta(admin);

  let createdId: string | null = null;

  try {
    if (id) {
      await updateReview(id, parsed.value, meta);
    } else {
      createdId = (await createReview(parsed.value, meta)).id;
    }
  } catch (error) {
    return explain(error, data);
  }

  // Публикуваният отзив мени средната оценка на курсовата страница.
  revalidatePath("/[locale]/kurse/[slug]", "page");

  if (createdId) {
    redirect(`/admin/recenzii/${createdId}?sazdaden=1`);
  }

  revalidatePath("/admin/recenzii");

  return { status: "success", message: "Промените са записани." };
}

export async function toggleReviewPublished(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  const next = data.get("published") === "1";
  // Активният филтър се носи през действието: иначе човек публикува
  // отзив от изгледа „Скрити" и се озовава в списъка с всички.
  const filter = String(data.get("vidimi") ?? "").trim();
  const suffix = filter ? `&vidimi=${filter}` : "";

  if (!id) redirect("/admin/recenzii");

  try {
    await setReviewPublished(id, next, await auditMeta(admin));
  } catch (error) {
    if (error instanceof ReviewGone) {
      redirect(`/admin/recenzii?greshka=nyama${suffix}`);
    }
    console.error("[admin] Публикуването на отзив се провали:", error);
    redirect(`/admin/recenzii?greshka=baza${suffix}`);
  }

  revalidatePath("/[locale]/kurse/[slug]", "page");

  redirect(
    next
      ? `/admin/recenzii?publikuvan=1${suffix}`
      : `/admin/recenzii?skrit=1${suffix}`,
  );
}

export async function removeReview(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва отзив за изтриване.");

  if (data.get("confirm") === null) {
    return invalid(data, "Отметни потвърждението, за да се изтрие отзивът.", {
      confirm: "Без тази отметка отзивът не се изтрива.",
    });
  }

  try {
    await deleteReview(id, await auditMeta(admin));
  } catch (error) {
    return explain(error, data);
  }

  revalidatePath("/[locale]/kurse/[slug]", "page");

  redirect("/admin/recenzii?iztrit=1");
}
