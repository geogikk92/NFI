"use server";

// АДМИН · заявките за обаждане — действията, които пишат.
//
// ДВЕ действия. Едното е решението (състояние + бележка), взето с отворена
// заявка пред очите. Другото е единственото, което има смисъл с едно
// натискане от списъка: „потърсих го".
//
// Няма създаване и няма изтриване — причините са в lib/admin/call-requests.ts.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { auditMeta } from "@/lib/admin/audit";
import { type AdminFormState, CHECK_FIELDS, invalid } from "@/lib/admin/form";
import {
  CallRequestGone,
  parseCallRequestForm,
  setCallRequestStatus,
  updateCallRequest,
} from "@/lib/admin/call-requests";

const GONE_MESSAGE =
  "Заявката вече не съществува — някой я е изтрил, докато формата е " +
  "стояла отворена. Копирай бележката си, преди да презаредиш.";

export async function saveCallRequest(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва заявка.");

  const parsed = parseCallRequestForm(data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  try {
    await updateCallRequest(id, parsed.value, await auditMeta(admin));
  } catch (error) {
    if (error instanceof CallRequestGone) return invalid(data, GONE_MESSAGE);

    console.error("[admin] Записът на заявка за обаждане се провали:", error);

    return invalid(
      data,
      "Записът не мина заради грешка в базата. Опитай пак след малко — " +
        "написаното е запазено във формата.",
    );
  }

  // Същата причина като при преводите: страницата не се сменя, сървърният
  // компонент не се рисува наново и формата се връща към `defaultValue`
  // отпреди записа — тоест „Промените са записани" над стария текст.
  revalidatePath("/admin/anketi/[id]", "page");
  revalidatePath("/admin/anketi");

  return { status: "success", message: "Промените са записани." };
}

/**
 * „Потърсен" с едно натискане от списъка.
 *
 * Само тази стъпка е позволена оттук. „Насрочено" иска да се уговори час,
 * „Затворена" и „Спам" са преценки — те се вземат с отворена заявка, където
 * се вижда съобщението на човека и следата от подаването.
 *
 * `setCallRequestStatus`, не `updateCallRequest`: вторият приема цялата
 * форма и с празна бележка би изтрил написаното от колегата.
 */
export async function markContacted(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) redirect("/admin/anketi");

  try {
    await setCallRequestStatus(id, "CONTACTED", await auditMeta(admin));
  } catch (error) {
    if (error instanceof CallRequestGone) {
      redirect("/admin/anketi?greshka=nyama");
    }

    console.error("[admin] Смяната на състояние се провали:", error);
    redirect("/admin/anketi?greshka=baza");
  }

  // Извън try: redirect() прекъсва с хвърляне и вътре би се прихванал от
  // собствения catch — успехът щеше да излиза като „грешка в базата".
  redirect("/admin/anketi?potarsen=1");
}
