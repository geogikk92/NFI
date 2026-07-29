// ТЕРИТОРИЯ НА БОБИ · задача 2b.
// Писано от Жоро, докато Боби е в отпуск.
//
// Правните връзки НЕ са оформление, а изискване: §5 DDG иска Impressum-ът
// да е достъпен от всяка страница, най-много на два клика.

import Link from "next/link";

const sections = [
  {
    heading: "Kurse",
    links: [
      { href: "/kurse", label: "Alle Kurse" },
      { href: "/kurse?level=A1", label: "Für Anfänger" },
      { href: "/einstufungstest", label: "Einstufungstest" },
    ],
  },
  {
    heading: "Institut",
    links: [
      { href: "/ueber-uns", label: "Über uns" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/community", label: "Community" },
    ],
  },
  {
    heading: "Service",
    links: [
      { href: "/shop", label: "Shop" },
      { href: "/uebersetzungen", label: "Übersetzungen" },
      { href: "/materialien", label: "Kostenlose Materialien" },
    ],
  },
  {
    // §5 DDG: достъпно от всяка страница.
    heading: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
      { href: "/agb", label: "AGB" },
      { href: "/widerruf", label: "Widerrufsrecht" },
    ],
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-surface-sunken">
      <div className="mx-auto max-w-(--container-page) px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <span className="flagline w-16" aria-hidden />
            <p className="mt-4 font-display text-lg font-semibold">
              Nürnberger
              <br />
              Fremdsprachen
              <br />
              Institut
            </p>
            {/* Двуезичността е обещанието на марката — стои и във футъра. */}
            <div className="duo mt-5 text-sm">
              <p lang="de">Sprachen verbinden.</p>
              <p lang="bg">Езиците свързват.</p>
            </div>
          </div>

          {sections.map((section) => (
            <nav key={section.heading} aria-labelledby={`f-${section.heading}`}>
              <h2
                id={`f-${section.heading}`}
                className="text-xs font-semibold uppercase tracking-kicker text-muted-foreground"
              >
                {section.heading}
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Nürnberger Fremdsprachen Institut</p>
          <p>Alle Preise inkl. gesetzlicher MwSt.</p>
        </div>
      </div>
    </footer>
  );
}
