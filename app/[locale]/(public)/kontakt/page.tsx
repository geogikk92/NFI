// ТЕРИТОРИЯ НА БОБИ · задача 5 (заявки за обаждане) и част от 3b (Контакт).
// Писано от Жоро, докато Боби е в отпуск.

import type { Metadata } from "next";
import { CallRequestForm } from "@/components/content/call-request-form";
import { AwaitingLegalText } from "@/components/content/legal-page";
import { findCourseForRequest } from "@/lib/cms/call-requests-db";
import { pick, toLocale } from "@/lib/i18n/config";
import { contactCopy } from "@/lib/i18n/pages/contact";
import { submitCallRequest } from "./actions";
import { localeAlternates } from "@/lib/i18n/alternates";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kurs?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = contactCopy(toLocale(locale));

  return {
    alternates: localeAlternates(toLocale(locale), "kontakt"),
    title: t.metaTitle, description: t.metaDescription };
}

export default async function KontaktPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  const { kurs } = await searchParams;
  const t = contactCopy(locale);

  // Курсът от адреса се проверява срещу базата — подаден отвън slug не
  // бива да се показва като заглавие, нито да стига до вмъкването.
  const course = kurs ? await findCourseForRequest(kurs) : null;

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <div className="grid gap-14 lg:grid-cols-[1fr_360px]">
        <div>
          <span className="flagline w-20" aria-hidden />
          <p className="kicker mt-6">{t.kicker}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            {course ? t.titleForCourse : t.titleGeneral}
          </h1>
          <p className="mt-4 max-w-prose text-lg text-muted-foreground">
            {t.lead}
          </p>

          <div className="mt-10">
            <CallRequestForm
              action={submitCallRequest}
              source={course ? "COURSE_PAGE" : "CONTACT_PAGE"}
              locale={locale}
              courseId={course?.id}
              courseTitle={
                // Без `en`: findCourseForRequest (чужд файл) още не
                // селектира titleEn, а pick() пада на немското заглавие.
                course
                  ? pick(locale, { bg: course.title, de: course.titleDe })
                  : undefined
              }
            />
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t.directHeading}</h2>

            {/* Указанията в AwaitingLegalText остават на немски НАРОЧНО:
                те са бележка към екипа кой какво още дължи, не текст за
                посетителя — а самата страница не бива да излиза, докато
                се вижда. */}
            <AwaitingLegalText
              what="Telefonnummer, E-Mail und Öffnungszeiten"
              who="der Kundin"
            />

            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-sm font-semibold">{t.addressHeading}</h3>
              <AwaitingLegalText
                what="Anschrift des Instituts in Nürnberg"
                who="der Kundin"
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface-sunken p-6">
            {/* Двуезичността е обещанието на института — тук е на място и
                НЕ следва избрания език: показва се и на двата, защото
                това е самото съобщение. */}
            <div className="duo text-sm">
              <p lang="de">Wir beraten auf Deutsch und Bulgarisch.</p>
              <p lang="bg">Консултираме на немски и български.</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
