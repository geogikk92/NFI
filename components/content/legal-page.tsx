// ТЕРИТОРИЯ НА БОБИ · задача 3c.
// Писано от Жоро, докато Боби е в отпуск.

import type { ReactNode } from "react";
import { formatDate, toDateTimeAttribute } from "@/lib/intl";

interface LegalPageProps {
  title: string;
  /** Версията от lib/legal.LEGAL_TEXT_VERSIONS — трябва да е видима. */
  version: string;
  children: ReactNode;
}

/**
 * Обвивка за правните страници.
 *
 * Версията се показва нарочно: клиентът има право да знае коя редакция е
 * приел, а ConsentLog пази същата стойност. Ако тук пише едно, а в
 * ConsentLog друго, доказването пада.
 */
export function LegalPage({ title, version, children }: LegalPageProps) {
  const versionDate = new Date(version);

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <span className="flagline w-16" aria-hidden />

      <header className="mt-6">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Fassung vom{" "}
          <time dateTime={toDateTimeAttribute(versionDate)}>
            {formatDate(versionDate)}
          </time>{" "}
          · Version {version}
        </p>
      </header>

      <div className="prose mt-12">{children}</div>
    </main>
  );
}

/**
 * Място за текст, който още го няма.
 *
 * Нарочно е крещящо: празен правен раздел, който изглежда завършен, е
 * по-опасен от липсваща страница. Компонентът не бива да остане в
 * продукция — CI проверката е в scripts/check-legal-placeholders.mjs.
 */
export function AwaitingLegalText({
  what,
  who = "Rechtsanwalt/Rechtsanwältin",
}: {
  what: string;
  who?: string;
}) {
  return (
    <div
      role="note"
      className="not-prose my-6 rounded-lg border-2 border-dashed border-warning bg-warning/10 px-5 py-4"
    >
      <p className="text-sm font-semibold">⚠️ Text fehlt noch: {what}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Wird von {who} geliefert. Diese Seite darf nicht veröffentlicht werden,
        solange dieser Hinweis erscheint.
      </p>
    </div>
  );
}
