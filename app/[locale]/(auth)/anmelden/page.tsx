// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — вход.
//
// Бележката „входът още не е пуснат" стоеше тук, докато сесията липсваше.
// Махната е на 30.07.2026 заедно с включването ѝ — бележка, останала след
// като нещото проработи, е по-лоша от липсваща: тя учи хората да не четат
// предупрежденията.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoginForm } from "@/components/content/login-form";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { toLocale } from "@/lib/i18n/config";
import { currentUser } from "@/lib/auth/session-db";
import { signInWithPassword } from "./actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(toLocale(locale));

  return {
    title: t.auth.loginTitle,
    description: t.auth.loginLead,
    robots: { index: false, follow: true },
  };
}

export default async function LoginPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getDictionary(locale);

  // Влезлият човек няма работа тук: форма за вход, показана на вече влязъл,
  // изглежда като че ли сесията му се е загубила, и той въвежда паролата си
  // втори път без нужда.
  if (await currentUser()) {
    redirect(`/${locale}/profil`);
  }

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <div className="mx-auto max-w-xl">
        <span className="flagline w-20" aria-hidden />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          {t.auth.loginTitle}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.auth.loginLead}</p>

        <div className="mt-10">
          <LoginForm locale={locale} action={signInWithPassword} />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link
            href={`/${locale}/registrieren`}
            className="font-medium underline hover:text-primary"
          >
            {t.auth.toRegister}
          </Link>
        </p>
      </div>
    </main>
  );
}
