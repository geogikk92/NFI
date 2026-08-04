"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { auditMeta } from "@/lib/admin/audit";
import { type AdminFormState, invalid } from "@/lib/admin/form";
import {
  SubscriberGone,
  deleteSubscriber,
  unsubscribeManually,
} from "@/lib/admin/subscribers";

export async function unsubscribeAction(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) redirect("/admin/abonati");

  try {
    await unsubscribeManually(id, await auditMeta(admin));
  } catch (error) {
    if (error instanceof SubscriberGone) {
      redirect("/admin/abonati?greshka=nyama");
    }
    console.error("[admin] Отписването се провали:", error);
    redirect("/admin/abonati?greshka=baza");
  }

  revalidatePath("/admin/abonati");
  redirect("/admin/abonati?otpisan=1");
}

export async function deleteSubscriberAction(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва абонат за изтриване.");

  if (data.get("confirm") === null) {
    return invalid(data, "Отметни потвърждението, за да се изтрие записът.", {
      confirm: "Без тази отметка записът не се изтрива.",
    });
  }

  try {
    await deleteSubscriber(id, await auditMeta(admin));
  } catch (error) {
    if (error instanceof SubscriberGone) {
      return invalid(data, "Записът вече не съществува.");
    }
    console.error("[admin] Изтриването на абонат се провали:", error);
    return invalid(data, "Изтриването не мина заради грешка в базата.");
  }

  redirect("/admin/abonati?iztrit=1");
}
