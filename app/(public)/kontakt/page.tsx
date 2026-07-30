// ТЕРИТОРИЯ НА БОБИ · задача 5 (заявки за обаждане) и част от 3b (Контакт).
// Писано от Жоро, докато Боби е в отпуск.

import type { Metadata } from "next";
import { CallRequestForm } from "@/components/content/call-request-form";
import { AwaitingLegalText } from "@/components/content/legal-page";
import { findCourseForRequest } from "@/lib/cms/call-requests-db";
import { submitCallRequest } from "./actions";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Rufen Sie uns an oder fordern Sie einen Rückruf an — wir klären Ihr Niveau und finden den passenden Kurs.",
};

type Props = {
  searchParams: Promise<{ kurs?: string }>;
};

export default async function KontaktPage({ searchParams }: Props) {
  const { kurs } = await searchParams;

  // Курсът от адреса се проверява срещу базата — подаден отвън slug не
  // бива да се показва като заглавие, нито да стига до вмъкването.
  const course = kurs ? await findCourseForRequest(kurs) : null;

  return (
    <main className="mx-auto max-w-(--container-page) px-6 py-16">
      <div className="grid gap-14 lg:grid-cols-[1fr_360px]">
        <div>
          <span className="flagline w-20" aria-hidden />
          <p className="kicker mt-6">Kontakt</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            {course
              ? "Beratung anfragen"
              : "Sprechen wir über Ihren Kurs"}
          </h1>
          <p className="mt-4 max-w-prose text-lg text-muted-foreground">
            Sagen Sie uns, was Sie erreichen wollen. Wir rufen zurück, klären
            Ihr Niveau und schlagen den passenden Kurs vor — unverbindlich und
            ohne Zahlung.
          </p>

          <div className="mt-10">
            <CallRequestForm
              action={submitCallRequest}
              source={course ? "COURSE_PAGE" : "CONTACT_PAGE"}
              courseId={course?.id}
              courseTitle={
                course ? (course.titleDe ?? course.title) : undefined
              }
            />
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">Direkt erreichen</h2>

            <AwaitingLegalText
              what="Telefonnummer, E-Mail und Öffnungszeiten"
              who="der Kundin"
            />

            <div className="mt-6 border-t border-border pt-6">
              <h3 className="text-sm font-semibold">Adresse</h3>
              <AwaitingLegalText
                what="Anschrift des Instituts in Nürnberg"
                who="der Kundin"
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-surface-sunken p-6">
            {/* Двуезичността е обещанието на института — тук е на място. */}
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
