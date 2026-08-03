"use server";

// АДМИН · сертификатите — действията, които пишат.
// Устроени като app/admin/materiali/actions.ts: requireAdmin() на всяко,
// redirect() ИЗВЪН try, грешките се обясняват до полето, което ги е родило.

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
  parseCertificateIssueForm,
  parseCertificateRevokeForm,
} from "@/lib/admin/certificates";
import {
  CertificateGone,
  CertificateTargetGone,
  DuplicateCertificate,
  ensureCertificatePdf,
  issueCertificate,
  resolveStudentByEmail,
  restoreCertificate,
  revokeCertificate,
} from "@/lib/certificates/certificates-db";

export async function issueCertificateAction(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const parsed = parseCertificateIssueForm(data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  const student = await resolveStudentByEmail(parsed.value.email);
  if (!student) {
    return invalid(data, CHECK_FIELDS, {
      email:
        "Няма профил с този имейл. Сертификат се издава само на регистриран " +
        "курсист — човекът първо трябва да си направи профил на сайта.",
    });
  }

  const meta = await auditMeta(admin);
  let issuedId: string;

  try {
    const issued = await issueCertificate(
      {
        userId: student.id,
        courseId: parsed.value.courseId,
        holderName: parsed.value.holderName,
        level: parsed.value.level,
        issuedAt: parsed.value.issuedAt ?? undefined,
      },
      meta,
    );
    issuedId = issued.id;
  } catch (error) {
    if (error instanceof DuplicateCertificate) {
      return invalid(data, CHECK_FIELDS, {
        email:
          "Този човек вече има сертификат за избрания курс. Отвори го от " +
          "списъка — втори не се издава.",
      });
    }
    if (error instanceof CertificateTargetGone) {
      return invalid(data, CHECK_FIELDS, {
        courseId: "Курсът вече не съществува. Презареди страницата.",
      });
    }
    console.error("[admin] Издаването на сертификат се провали:", error);
    return invalid(
      data,
      "Издаването не мина заради грешка в базата. Опитай пак след малко — " +
        "написаното е запазено във формата.",
    );
  }

  // PDF-ът е извън транзакцията и извън try-а по-горе НАРОЧНО: провали ли
  // се рисуването, сертификатът пак е издаден (номерът е даден, следата
  // записана) — файлът се прави от бутона „Генерирай PDF" на детайла.
  try {
    await ensureCertificatePdf(issuedId);
  } catch (error) {
    console.error("[admin] PDF-ът на сертификата не се генерира:", error);
    redirect(`/admin/sertifikati/${issuedId}?izdaden=1&pdf=greshka`);
  }

  redirect(`/admin/sertifikati/${issuedId}?izdaden=1`);
}

export async function regenerateCertificatePdf(data: FormData): Promise<void> {
  await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) redirect("/admin/sertifikati");

  try {
    await ensureCertificatePdf(id);
  } catch (error) {
    if (error instanceof CertificateGone) {
      redirect("/admin/sertifikati?greshka=nyama");
    }
    console.error("[admin] PDF-ът на сертификата не се генерира:", error);
    redirect(`/admin/sertifikati/${id}?greshka=pdf`);
  }

  revalidatePath(`/admin/sertifikati/${id}`);
  redirect(`/admin/sertifikati/${id}?pdf=1`);
}

export async function revokeCertificateAction(
  _prev: AdminFormState,
  data: FormData,
): Promise<AdminFormState> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) return invalid(data, "Липсва сертификат за отмяна.");

  if (data.get("confirm") === null) {
    return invalid(data, "Отметни потвърждението, за да се отмени.", {
      confirm: "Без тази отметка сертификатът не се отменя.",
    });
  }

  const parsed = parseCertificateRevokeForm(data);
  if (!parsed.ok) return invalid(data, CHECK_FIELDS, parsed.fieldErrors);

  try {
    await revokeCertificate(id, parsed.value.reason, await auditMeta(admin));
  } catch (error) {
    if (error instanceof CertificateGone) {
      return invalid(data, "Сертификатът вече не съществува.");
    }
    console.error("[admin] Отмяната на сертификат се провали:", error);
    return invalid(data, "Отмяната не мина заради грешка в базата. Опитай пак.");
  }

  revalidatePath(`/admin/sertifikati/${id}`);
  redirect(`/admin/sertifikati/${id}?otmenen=1`);
}

export async function restoreCertificateAction(data: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(data.get("id") ?? "").trim();
  if (!id) redirect("/admin/sertifikati");

  try {
    await restoreCertificate(id, await auditMeta(admin));
  } catch (error) {
    if (error instanceof CertificateGone) {
      redirect("/admin/sertifikati?greshka=nyama");
    }
    console.error("[admin] Възстановяването на сертификат се провали:", error);
    redirect(`/admin/sertifikati/${id}?greshka=baza`);
  }

  revalidatePath(`/admin/sertifikati/${id}`);
  redirect(`/admin/sertifikati/${id}?vazstanoven=1`);
}
