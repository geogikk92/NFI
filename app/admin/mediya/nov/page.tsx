// АДМИН · качване на нов файл в медийната библиотека.

import type { Metadata } from "next";
import Link from "next/link";
import { MediaUpload } from "@/components/admin/media-upload";
import { requireAdmin } from "@/lib/admin/guard";
import { uploadMedia } from "../actions";

export const metadata: Metadata = {
  title: "Качване на файл",
  robots: { index: false, follow: false },
};

export default async function NewMediaPage() {
  await requireAdmin();

  return (
    <>
      <nav aria-label="Пътека" className="text-sm text-muted-foreground">
        <Link href="/admin/mediya" className="underline hover:text-primary">
          Медия
        </Link>
        <span aria-hidden> › </span>
        <span>Нов файл</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Качи файл</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Снимката влиза в библиотеката и после се закача като корица от
          формата на курса, продукта или материала. Описанието за екранен
          четец се попълва на следващата стъпка.
        </p>
      </header>

      <div className="mt-8 max-w-xl">
        <MediaUpload action={uploadMedia} />
      </div>
    </>
  );
}
