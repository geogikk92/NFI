"use server";

// АДМИН · продуктите — действията, които пишат.
//
// Устроени като app/admin/kursove/actions.ts. Всяко действие започва с
// requireAdmin(): пазачът в layout-а НЕ стои между заявката и server
// action-а, а забравена проверка тук значи отворен запис за целия интернет.
//
// И тук няма revalidatePath — причината е измерена и записана в
// app/admin/kursove/actions.ts.

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
  ProductGone,
  ProductInUse,
  createProduct,
  deleteProduct,
  parseProductForm,
  setProductPublished,
  updateProduct,
} from "@/lib/admin/products";

const SLUG_TAKEN = {
  slug:
    "Този адрес вече се ползва от друг продукт. Избери друг — адресът е " +
    "част от връзката към страницата и не може да се повтаря.",
};

function explain(error: unknown, data: FormData): AdminFormState {
  const conflict = uniqueConflict(error, SLUG_TAKEN);
  if (conflict) return invalid(data, CHECK_FIELDS, conflict);

  if (error instanceof ProductGone) {
    return invalid(
      data,
      "Продуктът е бил изтрит, докато формата е стояла отворена. " +
        "Копирай написаното и го създай наново.",
    );
  }

  if (error instanceof ProductInUse) {
    return invalid(data, error.message);
  }

  console.error("[admin] Записът на продукт се провали:", error);

  return invalid(
    data,
    "Записът не мина заради грешка в базата. Опитай пак след малко — " +
      "написаното е запазено във формата.",
  );
}

export async function saveProduct(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = parseProductForm(data);

  if (!parsed.ok) {
    return invalid(data, CHECK_FIELDS, parsed.fieldErrors);
  }

  const id = String(data.get("id") ?? "").trim();
  const meta = await auditMeta(admin);

  let createdId: string | null = null;

  try {
    if (id) {
      await updateProduct(id, parsed.value, meta);
    } else {
      createdId = (await createProduct(parsed.value, meta)).id;
    }
  } catch (error) {
    return explain(error, data);
  }

  // ИЗВЪН try блока: redirect() хвърля по устройство и вътре собственият
  // му сигнал би бил хванат и превърнат в „грешка в базата".
  if (createdId) {
    redirect(`/admin/produkti/${createdId}?sazdaden=1`);
  }

  return { status: "success", message: "Промените са записани." };
}

export async function toggleProductPublished(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  const next = data.get("published") === "1";

  if (!id) redirect("/admin/produkti");

  try {
    await setProductPublished(id, next, await auditMeta(admin));
  } catch (error) {
    if (error instanceof ProductGone) {
      redirect("/admin/produkti?greshka=nyama");
    }
    console.error("[admin] Публикуването на продукт се провали:", error);
    redirect("/admin/produkti?greshka=baza");
  }

  redirect(next ? "/admin/produkti?publikuvan=1" : "/admin/produkti?skrit=1");
}

export async function removeProduct(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();

  if (!id) return invalid(data, "Липсва продукт за изтриване.");

  if (data.get("confirm") === null) {
    return invalid(data, "Отметни потвърждението, за да се изтрие продуктът.", {
      confirm: "Без тази отметка продуктът не се изтрива.",
    });
  }

  try {
    await deleteProduct(id, await auditMeta(admin));
  } catch (error) {
    return explain(error, data);
  }

  redirect("/admin/produkti?iztrit=1");
}
