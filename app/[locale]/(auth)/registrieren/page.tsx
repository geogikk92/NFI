// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — създаване на профил.

import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/content/register-form";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { toLocale } from "@/lib/i18n/config";
import { registerAccount } from "./actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(toLocale(locale));

  return {
    title: t.auth.registerTitle,
    description: t.auth.registerLead,
    // Страницата няма какво да предложи на търсачката, а индексирана форма
    // за регистрация на три езика е чист дубликат.
    robots: { index: false, follow: true },
  };
}

export default async function RegisterPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDictionary(locale);

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <span className="flagline w-20" aria-hidden />
        {/* Истинско h1 — не CardTitle, който рендира <div>. Без „kicker"
            над него: той би повторил същата дума и четецът я чува два пъти. */}
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          {t.auth.registerTitle}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t.auth.registerLead}
        </p>

        {/* Че профилът се активира само след потвърждение по имейл, се казва
            ПРЕДИ формата. След изпращането е късно за очакване. */}
        <p className="mt-4 text-sm text-muted-foreground">
          {t.auth.verifySent}
        </p>

        <div className="mt-10">
          <RegisterForm locale={locale} action={registerAccount} />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {t.auth.hasAccount}{" "}
          <Link
            href={`/${locale}/anmelden`}
            className="font-medium underline hover:text-primary"
          >
            {t.auth.toLogin}
          </Link>
        </p>
      </div>
    </main>
  );
}
