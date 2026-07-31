"use server";

// АДМИН · промоциите — действията, които пишат.
//
// Всяко действие започва с requireAdmin(): пазачът в layout-а НЕ стои
// между заявката и server action-а.
//
// Тук залогът е по-висок от другите два екрана: промоционалният код изтича
// пари. Затова изключването е отделно действие, което работи и когато
// нещо друго в записа е невалидно.

import { revalidatePath } from "next/cache";
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
  DiscountGone,
  DiscountInUse,
  createDiscount,
  deleteDiscount,
  parseDiscountForm,
  setDiscountActive,
  updateDiscount,
} from "@/lib/admin/discounts";

const CODE_TAKEN = {
  code:
    "Този код вече съществува. Кодовете се записват с главни букви, така " +
    "че „leto2026“ и „LETO2026“ са един и същ код.",
};

function explain(error: unknown, data: FormData): AdminFormState {
  const conflict = uniqueConflict(error, CODE_TAKEN);
  if (conflict) return invalid(data, CHECK_FIELDS, conflict);

  if (error instanceof DiscountGone) {
    return invalid(
      data,
      "Промоцията е била изтрита, докато формата е стояла отворена.",
    );
  }

  if (error instanceof DiscountInUse) {
    return invalid(data, error.message);
  }

  console.error("[admin] Записът на промоция се провали:", error);

  return invalid(
    data,
    "Записът не мина заради грешка в базата. Опитай пак след малко — " +
      "написаното е запазено във формата.",
  );
}

export async function saveDiscount(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = parseDiscountForm(data);

  if (!parsed.ok) {
    return invalid(data, CHECK_FIELDS, parsed.fieldErrors);
  }

  const id = String(data.get("id") ?? "").trim();
  const meta = await auditMeta(admin);

  let createdId: string | null = null;

  try {
    if (id) {
      await updateDiscount(id, parsed.value, meta);
    } else {
      createdId = (await createDiscount(parsed.value, meta)).id;
    }
  } catch (error) {
    return explain(error, data);
  }

  if (createdId) {
    redirect(`/admin/promocii/${createdId}?sazdadena=1`);
  }

  // Виж коментара за обезсилването в app/admin/kursove/actions.ts.
  revalidatePath("/admin/promocii/[id]", "page");
  revalidatePath("/admin/promocii");

  return { status: "success", message: "Промените са записани." };
}

export async function toggleDiscountActive(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  const next = data.get("active") === "1";

  if (!id) redirect("/admin/promocii");

  try {
    await setDiscountActive(id, next, await auditMeta(admin));
  } catch (error) {
    if (error instanceof DiscountGone) {
      redirect("/admin/promocii?greshka=nyama");
    }
    console.error("[admin] Превключването на промоция се провали:", error);
    redirect("/admin/promocii?greshka=baza");
  }

  redirect(next ? "/admin/promocii?vklyuchena=1" : "/admin/promocii?izklyuchena=1");
}

export async function removeDiscount(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();

  if (!id) return invalid(data, "Липсва промоция за изтриване.");

  if (data.get("confirm") === null) {
    return invalid(data, "Отметни потвърждението, за да се изтрие промоцията.", {
      confirm: "Без тази отметка промоцията не се изтрива.",
    });
  }

  try {
    await deleteDiscount(id, await auditMeta(admin));
  } catch (error) {
    return explain(error, data);
  }

  redirect("/admin/promocii?iztrita=1");
}
