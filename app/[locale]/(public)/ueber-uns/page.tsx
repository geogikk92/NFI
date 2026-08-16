// Задача 3b — За нас.
//
// ТЕКСТЪТ Е НА ВАСИЛЕНА (15.08.2026), дословно от нейния документ.
// Дотогава страницата беше скеле с три празни CMS блока и жълта бележка
// „чака съдържание". Вече не чака.
//
// Формата за телефон стои ВЕДНАГА след биографията, а не в дъното — така
// е поискано: „след текста трябва да идва сиво поле за писане на текст".
// Ползва се същата CallRequestForm като на /kontakt, значи заявката влиза
// в същия списък в панела и Василена я вижда на едно място.
//
// Разделите не са CMS блокове: текстът е готов и е нейн. Когато поиска да
// го редактира сама, той се пренася в регистъра с codeValue — тогава
// написаното тук остава като стойност по подразбиране.

import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { CallRequestForm } from "@/components/content/call-request-form";
import { localeAlternates } from "@/lib/i18n/alternates";
import { toLocale } from "@/lib/i18n/config";
import { aboutCopy } from "@/lib/i18n/pages/about";
import { submitCallRequest } from "../kontakt/actions";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = aboutCopy(toLocale(locale));

  return {
    alternates: localeAlternates(toLocale(locale), "ueber-uns"),
    title: t.metaTitle,
    description: t.metaDescription,
  };
}

export default async function UeberUnsPage({ params }: Props) {
  const locale = toLocale((await params).locale);
  const t = aboutCopy(locale);

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <header className="max-w-3xl">
        <span className="flagline w-20" aria-hidden />
        <p className="kicker mt-6">
          <span className="kicker-sq" aria-hidden />
          {t.kicker}
        </p>
        <h1 className="mt-4 font-title text-(length:--text-display-l) font-bold leading-tight">
          {t.title}
        </h1>

        {/* Подкрепата стои НАЙ-ОТГОРЕ, не в дъното: това е първото, което
            прави курса различен от всеки друг онлайн курс. */}
        <p className="mt-6 border-l-2 border-primary bg-surface-sunken py-3 pl-5 text-(length:--text-lede) leading-relaxed">
          {t.backing}
        </p>
      </header>

      {/* Биографията — от нея тръгва доверието, затова е преди всичко друго. */}
      <div className="prose mt-12">
        {t.intro.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {/* „Сивото поле" от документа. Тъмна рамка и различен фон, за да се
          вижда, че тук се действа, а не се чете. */}
      <section
        id="obazhdane"
        aria-labelledby="obazhdane-title"
        className="mt-14 border border-border bg-surface-sunken px-6 py-10 sm:px-10"
      >
        <h2
          id="obazhdane-title"
          className="font-title text-(length:--text-display-m) font-bold leading-tight"
        >
          {t.formLede}
        </h2>
        <p className="mt-4 max-w-prose text-muted-foreground">{t.formHint}</p>

        <div className="mt-8 max-w-xl">
          <CallRequestForm
            action={submitCallRequest}
            source="CONTACT_PAGE"
            locale={locale}
          />
        </div>
      </section>

      {/* Останалите раздели, в нейния ред. */}
      <div className="prose mt-16">
        {t.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {"list" in section && section.list ? (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {"after" in section && section.after
              ? section.after.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))
              : null}
          </section>
        ))}
      </div>

      {/* Затварящият въпрос е ЕДРО и с червената нишка: той е поканата. */}
      <section className="mt-20 border-l-2 border-primary py-2 pl-6 sm:pl-10">
        <h2 className="font-title text-(length:--text-display-m) font-bold leading-tight">
          {t.closingHeading}
        </h2>
        <p className="mt-5 max-w-prose text-(length:--text-lede) leading-relaxed text-muted-foreground">
          {t.closingBody}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="#obazhdane">{t.formLedeCta}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/${locale}/einstufungstest`}>{t.testCta}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
