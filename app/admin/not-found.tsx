// АДМИН · задача 17f2 — „не е намерено" ВЪТРЕ в панела.
//
// Този екран се вижда в два много различни случая и текстът трябва да
// покрива и двата, без да плаши:
//
//   1. изтрит запис, чийто адрес е останал в отметките или в отворен
//      раздел („сертификат, който вече го няма");
//   2. отказан достъп — requireAdmin() вика notFound() нарочно, за да не
//      потвърждава, че на този адрес ИМА админ (виж lib/admin/guard.ts).
//
// Затова текстът не твърди „нямаш право" — при случай 1 това би било
// лъжа, а при случай 2 не бива да се потвърждава.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Страницата не е намерена",
  robots: { index: false, follow: false },
};

export default function AdminNotFound() {
  return (
    <div lang="bg" className="mx-auto max-w-xl py-16">
      <span className="flagline w-20" aria-hidden />

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Тази страница я няма.
      </h1>

      <p className="mt-4 text-muted-foreground">
        Или записът е изтрит, докато адресът е стоял отворен, или линкът е
        стар. Върни се в панела и го намери през менюто или през търсенето.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/admin">Към таблото</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/tarsene">Търсене</Link>
        </Button>
      </div>
    </div>
  );
}
