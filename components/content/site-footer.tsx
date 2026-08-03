// Футър.
//
// Правните връзки НЕ са оформление, а изискване: §5 DDG иска Impressum-ът
// да е достъпен от всяка страница, най-много на два клика. Cookie
// настройките са тук по Art. 7(3) GDPR — оттеглянето трябва да е толкова
// лесно, колкото даването.

import Link from "next/link";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { NewsletterForm } from "@/components/content/newsletter-form";
import { newsletterCopy } from "@/lib/i18n/pages/newsletter";
import { materialsCopy } from "@/lib/i18n/pages/materials";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const year = new Date().getFullYear();
  const p = (path: string) => `/${locale}${path}`;

  // ПРАВИЛО: само съществуващи страници — 404 от футъра е по-лошо от
  // липсващ ред. Чакат: /uebersetzungen (задача 14), /materialien (8).
  const sections = [
    {
      key: "courses",
      heading: t.footer.courses,
      links: [
        { href: p("/kurse"), label: t.footer.allCourses },
        { href: p("/kurse?level=A1"), label: t.footer.forBeginners },
        { href: p("/kurse?level=B2"), label: t.footer.examPrep },
        { href: p("/einstufungstest"), label: t.nav.levelTest },
        // Задача 8 е готова — редът от „ПРАВИЛОТО" горе влиза в сила.
        { href: p("/materialien"), label: materialsCopy(locale).metaTitle },
      ],
    },
    {
      key: "institute",
      heading: t.footer.institute,
      links: [
        { href: p("/ueber-uns"), label: t.nav.about },
        { href: p("/community"), label: t.nav.community },
        { href: p("/kontakt"), label: t.nav.contact },
      ],
    },
    {
      key: "service",
      heading: t.footer.service,
      links: [
        { href: p("/shop"), label: t.nav.shop },
        { href: p("/warenkorb"), label: t.nav.cart },
      ],
    },
    {
      key: "legal",
      heading: t.footer.legal,
      links: [
        { href: p("/impressum"), label: t.footer.imprint },
        { href: p("/datenschutz"), label: t.footer.privacy },
        { href: p("/agb"), label: t.footer.terms },
        { href: p("/widerruf"), label: t.footer.withdrawal },
        { href: p("/cookies"), label: t.footer.cookieSettings },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-border bg-surface-sunken">
      <div className="mx-auto max-w-(--container-page) px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <span className="flagline w-16" aria-hidden />
            <p className="mt-4 font-title text-lg font-semibold">
              Nürnberger
              <br />
              Fremdsprachen
              <br />
              Institut
            </p>
            {/* Двуезичността е обещанието на марката — стои и във футъра,
                независимо от избрания език. */}
            <div className="bilingual mt-5 text-sm">
              <p lang="de">Sprachen verbinden.</p>
              <p lang="bg">Езиците свързват.</p>
            </div>
          </div>

          {sections.map((section) => (
            <nav key={section.key} aria-labelledby={`f-${section.key}`}>
              <h2
                id={`f-${section.key}`}
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

        {/* Бюлетинът · задача 7. Над правния ред, на всяка страница —
            фунията не бива да зависи от това човек да стигне до
            /materialien. */}
        <div className="mt-14 grid gap-6 border-t border-border pt-10 lg:grid-cols-[1fr_28rem]">
          <div>
            <h2 className="font-title text-lg font-bold">
              {newsletterCopy(locale).form.heading}
            </h2>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {newsletterCopy(locale).form.lede}
            </p>
          </div>
          <NewsletterForm locale={locale} />
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Nürnberger Fremdsprachen Institut</p>
          <p>{t.footer.vatNote}</p>
        </div>
      </div>
    </footer>
  );
}
