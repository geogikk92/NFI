// Страницата за ненамерен адрес.
//
// ДВЕ правила, които я правят различна от обикновена страница:
//
// 1. НЕ чете от базата и НЕ ползва SiteShell. Обвивката вика readCart,
//    readConsent и currentUser — тоест при недостъпна база самата страница
//    за грешка би се счупила. Страница за грешка, която зависи от нещото,
//    което се е счупило, не върши работа.
//
// 2. Носи връзки към Impressum и Datenschutz. §5 DDG иска те да са
//    „leicht erkennbar und unmittelbar erreichbar" от всяка страница, а
//    вградената 404 на Next е гола английска страница без нито една
//    връзка. Тя се показваше и на всеки сбъркан адрес, и при отказан
//    достъп до /admin.
//
// Езикът е български с немски ред отдолу: адресът тук е непознат, значи
// езикът не се знае. Двата са на основните две публики.

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Страницата не е намерена · NFI",
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: "/bg", bg: "Начало", de: "Startseite" },
  { href: "/bg/kurse", bg: "Курсове", de: "Kurse" },
  { href: "/bg/kontakt", bg: "Контакт", de: "Kontakt" },
  { href: "/bg/impressum", bg: "Impressum", de: "Impressum" },
  { href: "/bg/datenschutz", bg: "Поверителност", de: "Datenschutz" },
];

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-(--container-page) flex-col justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <span className="flagline w-20" aria-hidden />

        <p className="mt-6 font-mono text-sm uppercase tracking-kicker text-subtle">
          404
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Тази страница я няма
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Може да е преместена или адресът да е сбъркан.
        </p>
        <p lang="de" className="mt-2 text-muted-foreground">
          Diese Seite gibt es nicht. Vielleicht wurde sie verschoben.
        </p>

        <nav aria-label="Основни страници" className="mt-10">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="underline underline-offset-4 hover:text-primary"
                >
                  {link.bg}
                  {link.bg === link.de ? null : (
                    <span lang="de" className="text-muted-foreground">
                      {" "}
                      · {link.de}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
