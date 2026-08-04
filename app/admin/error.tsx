"use client";

// АДМИН · задача 17f2 — прихващач на грешки ВЪТРЕ в панела.
//
// Без него всяка необработена грешка в админа падаше към app/error.tsx —
// публичния екран, който е на немски, говори на посетител („обади ни се")
// и предлага връзки към сайта. За Василена това е двойно объркване:
// изведнъж е на друг език и на друго място.
//
// Тук езикът е български, тонът е към КОЛЕГА, а изходът води обратно в
// панела. Плюс едно нещо, което публичният екран не бива да има: кода на
// грешката, за да може тя да го прочете по телефона.
//
// НЕ чете нищо от базата: екран за грешка, който зависи от счупеното
// нещо, се чупи заедно с него.

import { useEffect } from "react";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] Необработена грешка:", error);
  }, [error]);

  return (
    <div lang="bg" className="mx-auto max-w-xl py-16">
      <span className="flagline w-20" aria-hidden />

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Нещо се счупи.
      </h1>

      <p className="mt-4 text-muted-foreground">
        Не е от теб — панелът не успя да зареди тази страница. Данните ти са
        непокътнати; нищо не е записано наполовина.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Опитай пак
        </button>

        {/* Обикновен <a>, не <Link>: рутерът може да е част от счупеното, а
            пълното презареждане гарантирано връща на работеща страница. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/admin"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Обратно към таблото
        </a>
      </div>

      {error.digest ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Ако се повтаря, кажи на Боби този код:{" "}
          <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
