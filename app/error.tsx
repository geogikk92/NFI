"use client";

// Прихващач на грешки за целия сайт.
//
// Досега го нямаше изобщо. Резултатът: недостъпна база или всяка друга
// необработена грешка водеше до вградения екран на Next — бяла страница с
// „Application error: a server-side exception has occurred", на английски,
// без връзка, без телефон и без Impressum. Точно това е екранът, който
// посетителят вижда в най-лошия момент.
//
// НЕ чете нищо от базата и не ползва SiteShell: страница за грешка, която
// зависи от счупеното нещо, се чупи заедно с него.
//
// По същата причина връзките са обикновени <a>, а не <Link>. Правилото на
// Next иска <Link> заради навигацията от страна на клиента — тоест заради
// СКОРОСТ. Тук скоростта не е целта: рутерът може да е част от счупеното,
// а пълното презареждане е единственото, което гарантирано връща човека
// на работеща страница. Затова правилото е изключено само в този файл.
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // В продукция Next дава само `digest` — самото съобщение остава на
    // сървъра, за да не изтекат подробности за настройката. Тук се записва
    // в конзолата на браузъра, за да може човек по телефона да го прочете.
    console.error("NFI: необработена грешка", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-(--container-page) flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <span className="flagline w-20" aria-hidden />

        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          Нещо се обърка
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Проблемът е у нас, не у теб. Опитай пак след малко.
        </p>
        <p lang="de" className="mt-2 text-muted-foreground">
          Der Fehler liegt bei uns. Bitte versuchen Sie es gleich noch einmal.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          {/* `reset` пробва да пре-рендира само счупеното поддърво — при
              временна грешка (изпуснат конекшън) това стига. */}
          <button
            type="button"
            onClick={reset}
            className="border-2 border-foreground px-5 py-2 font-medium hover:bg-foreground hover:text-background"
          >
            Опитай пак
          </button>
          <a
            href="/bg/kontakt"
            className="px-5 py-2 underline underline-offset-4 hover:text-primary"
          >
            Пиши ни
          </a>
        </div>

        {/* Кодът е единственото, което свързва видяното от посетителя с
            реда в лога на сървъра. Без него „не работи" е неотстранимо. */}
        {error.digest ? (
          <p className="mt-8 font-mono text-2xs uppercase tracking-kicker text-subtle">
            Код за поддръжка: {error.digest}
          </p>
        ) : null}

        <nav aria-label="Правни страници" className="mt-10">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {/* Обикновени <a>, не <Link>: рутерът може да е част от
                счупеното. Пълно презареждане е по-надеждно тук. */}
            <li>
              <a href="/bg" className="underline underline-offset-4">
                Начало
              </a>
            </li>
            <li>
              <a href="/bg/impressum" className="underline underline-offset-4">
                Impressum
              </a>
            </li>
            <li>
              <a href="/bg/datenschutz" className="underline underline-offset-4">
                Datenschutz
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
