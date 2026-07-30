// ТЕРИТОРИЯ НА ЖОРО · задача „Регистрация и вход" — вход.
//
// Бележката над формата казва, че сесията още не е включена. Пише се преди
// формата, а не след неуспешен опит: никой не бива да въвежда парола, преди
// да знае, че входът още не работи.

import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/content/login-form";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getAuthTexts } from "@/lib/i18n/pages/auth";
import { toLocale } from "@/lib/i18n/config";
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
  const texts = getAuthTexts(locale);

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <div className="mx-auto max-w-xl">
        <span className="flagline w-20" aria-hidden />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          {t.auth.loginTitle}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.auth.loginLead}</p>

        {/* role="note", не "alert": това не е събитие, а състояние на
            страницата. Пунктирната рамка е същият знак като при
            AwaitingLegalText — „това още не е готово". Смисълът е в ТЕКСТА,
            цветът само го подкрепя. */}
        <div
          role="note"
          className="mt-8 rounded-lg border-2 border-dashed border-warning bg-warning/10 px-5 py-4"
        >
          <h2 className="text-sm font-semibold">{texts.loginPendingTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {texts.loginPendingBody}
          </p>
        </div>

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
