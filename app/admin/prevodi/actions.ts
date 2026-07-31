"use server";

// АДМИН · заявките за превод — действието, което пише.
//
// ЕДНО действие, не четири: заявките не се създават, не се изтриват от
// панела и не се публикуват. Създава ги клиентът, а изтриването е работа
// на cron-а за срокове по GDPR — ръчно триене оттук би заобиколило
// одитната следа и би оставило файловете в хранилището.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { auditMeta } from "@/lib/admin/audit";
import {
  type AdminFormState,
  CHECK_FIELDS,
  invalid,
} from "@/lib/admin/form";
import {
  TranslationGone,
  parseTranslationForm,
  setTranslationStatus,
  updateTranslation,
} from "@/lib/admin/translations";

export async function saveTranslation(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва заявка.");

  const parsed = parseTranslationForm(data);

  if (!parsed.ok) {
    return invalid(data, CHECK_FIELDS, parsed.fieldErrors);
  }

  try {
    await updateTranslation(id, parsed.value, await auditMeta(admin));
  } catch (error) {
    if (error instanceof TranslationGone) {
      return invalid(
        data,
        "Заявката вече не съществува. Възможно е срокът ѝ за съхранение да " +
          "е изтекъл и cron-ът да я е изтрил заедно с документите.",
      );
    }

    console.error("[admin] Записът на заявка за превод се провали:", error);

    return invalid(
      data,
      "Записът не мина заради грешка в базата. Опитай пак след малко — " +
        "написаното е запазено във формата.",
    );
  }

  // ИЗМЕРЕНО: без това формата показва СТАРАТА сума след успешен запис.
  //
  // Причината е различна от онази, заради която revalidatePath НЕ е нужен
  // при навигация (виж app/admin/kursove/actions.ts). Тук не се сменя
  // страница: server action-ът приключва, сървърният компонент НЕ се
  // рисува наново, а React нулира формата — и я връща към `defaultValue`,
  // който още носи данните отпреди записа. Резултатът е „Промените са
  // записани" над поле с непроменена стойност, тоест съобщение, което
  // изглежда като лъжа.
  revalidatePath("/admin/prevodi/[id]", "page");
  revalidatePath("/admin/prevodi");

  return { status: "success", message: "Промените са записани." };
}

/**
 * Бърза смяна на състоянието от списъка.
 *
 * Позволена е САМО към „в преглед" — първата стъпка след получаване.
 * Всичко останало иска отваряне на заявката: оферта, отказ и предаване са
 * решения, които не се вземат с едно натискане от списък.
 */
export async function startReview(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) redirect("/admin/prevodi");

  try {
    // `setTranslationStatus`, не `updateTranslation`: вторият приема цялата
    // форма и с празни полета БИ ИЗТРИЛ вече изпратена оферта и записани
    // бележки при едно натискане от списъка.
    await setTranslationStatus(id, "UNDER_REVIEW", await auditMeta(admin));
  } catch (error) {
    if (error instanceof TranslationGone) {
      redirect("/admin/prevodi?greshka=nyama");
    }
    console.error("[admin] Смяната на състояние се провали:", error);
    redirect("/admin/prevodi?greshka=baza");
  }

  redirect("/admin/prevodi?vpregled=1");
}
