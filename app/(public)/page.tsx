// ТЕРИТОРИЯ НА БОБИ. Временна страница от K1.
//
// Съдържанието идва в задача 3a (пренос от мокъпа, 7 секции, режисиран
// hero). Дотогава тази страница служи за едно: да се вижда на един
// поглед, че токените, шрифтовете и shadcn компонентите са свързани.

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const territories = [
  {
    owner: "Боби",
    title: "Сайтът и ученикът",
    hours: 471,
    items: [
      "Дизайн-система и публични страници",
      "Курсове, лийд-потоци, тест за ниво",
      "Профил, сертификати, CMS",
      "Административна обвивка",
    ],
  },
  {
    owner: "Жоро",
    title: "Парите, услугата и правото",
    hours: 468,
    items: [
      "Магазин и checkout през Mollie",
      "Фактури, рефанди, кредитни известия",
      "Превод на документи от край до край",
      "НАП, GDPR, пускане",
    ],
  },
];

const ready = [
  { label: "Next.js 15 · App Router", done: true },
  { label: "Prisma схема в три файла", done: true },
  { label: "Замразени токени + shadcn/ui", done: true },
  { label: "Договорки: storage, email, payments", done: true },
  { label: "Деплой на Vercel EU", done: false },
];

export default function Home() {
  return (
    <main className="grain relative min-h-screen">
      <div className="mx-auto max-w-(--container-page) px-6 py-16 md:py-24">
        <span className="flagline w-28" aria-hidden />

        <header className="mt-8 max-w-3xl">
          <p className="kicker">K1 · Съвместен старт</p>
          <h1 className="mt-3 text-(length:--text-hero) font-semibold tracking-tighter">
            Nürnberger Fremdsprachen&nbsp;Institut
          </h1>
          <div className="duo mt-6 max-w-xl text-lg">
            <p>Sprachkurse, Prüfungsvorbereitung und beglaubigte Übersetzungen.</p>
            <p>Езикови курсове, подготовка за изпити и заверени преводи.</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg">Запиши се</Button>
            <Button size="lg" variant="outline">
              Виж курсовете
            </Button>
          </div>
        </header>

        <section className="mt-20 grid gap-6 md:grid-cols-2">
          {territories.map((t) => (
            <Card key={t.owner}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="font-display text-2xl">
                    {t.title}
                  </CardTitle>
                  <Badge variant="secondary">{t.hours} ч</Badge>
                </div>
                <CardDescription>Собственик: {t.owner}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {t.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary" aria-hidden>
                        —
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-16">
          <h2 className="text-xl font-semibold">Състояние на старта</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <span
                  className={
                    item.done
                      ? "size-2 shrink-0 rounded-full bg-success"
                      : "size-2 shrink-0 rounded-full bg-warning"
                  }
                  aria-hidden
                />
                <span className={item.done ? "" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-20 border-t border-border pt-8 text-sm text-muted-foreground">
          <p>
            Тази страница е временна. Съдържанието идва в задача 3a — пренос от
            мокъпа.
          </p>
        </footer>
      </div>
    </main>
  );
}
