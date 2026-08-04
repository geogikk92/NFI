// АДМИН · Заключените текстове — само за четене.
//
// Най-евтиният екран в проекта и този, който спестява първото обаждане.
// Без него въпросът „къде е Impressum-ът" и „защо не мога да сменя думата
// Курсове в менюто" идва още първия ден.
//
// Всеки ред казва КАКВО не може да се пипне и ЗАЩО — на човешки български,
// без думи като „енум" и „ключ".

import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/guard";

export const metadata: Metadata = {
  title: "Заключени текстове",
  robots: { index: false, follow: false },
};

interface LockedGroup {
  title: string;
  items: { what: string; why: string; where?: string }[];
}

const LOCKED: LockedGroup[] = [
  {
    title: "Правни страници",
    items: [
      {
        what: "Impressum, Защита на данните, Общи условия, Право на отказ",
        why: "Тези текстове са правно обвързващи и версията им се пази заедно със съгласието на всеки курсист. Смяна без нова версия обезсмисля доказателството пред надзорния орган.",
        where: "Пиши на Боби — той ги сменя заедно с юриста.",
      },
      {
        what: "Текстовете за съгласие при регистрация и при бюлетина",
        why: "Всеки записан човек има запазено КОЕ точно е приел. Ако текстът се смени скрито, записът престава да значи нещо.",
      },
    ],
  },
  {
    title: "Дизайнът на страниците",
    items: [
      {
        what: "Заглавията и подзаглавията на началната страница",
        why: "Те са част от подредбата: дължината им е премерена спрямо мястото, а първият екран е режисиран кадър по кадър. По-дълъг текст не се пренася, а излиза извън мястото си.",
        where: "Ако някое заглавие трябва да се смени, кажи на Боби — става за 20 минути.",
      },
      {
        what: "Менюто, бутоните и надписите във формите",
        why: "Един и същ надпис се появява на десетки места и на трите езика. Смяна на едно място би оставила останалите различни.",
      },
      {
        what: "Броят на картите и стъпките в решетките",
        why: "Трите причини, петте правила и петте нива са подредени в решетка с точен брой места. Махне ли се едно, на негово място остава видима празнина.",
      },
    ],
  },
  {
    title: "Неща, които имат свой екран",
    items: [
      {
        what: "Курсовете: заглавие, ниво, цена, начална дата",
        why: "Те не са текст на страница, а записи с данни.",
        where: "Админ → Курсове",
      },
      {
        what: "Продуктите в магазина и безплатните материали",
        why: "Същото — всеки има своя страница с полета.",
        where: "Админ → Продукти · Безплатни материали",
      },
      {
        what: "Отзивите на курсистите",
        why: "Те се четат и от Google като структурирани данни за оценка. Свободна редакция може да извади сайта от резултатите със звездички.",
      },
    ],
  },
];

export default async function LockedTextsPage() {
  await requireAdmin();

  return (
    <>
      <header className="max-w-2xl">
        <p className="text-sm text-muted-foreground">
          <Link
            href="/admin/tekstove"
            className="underline underline-offset-4 hover:text-primary"
          >
            Текстове
          </Link>{" "}
          / заключени
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Какво не мога да сменя сама
        </h1>
        <p className="mt-2 text-muted-foreground">
          Не защото не ти се доверяваме, а защото тези неща държат други неща:
          закон, дизайн или данни. Всяко от тях може да се смени — просто минава
          през Боби.
        </p>
      </header>

      <div className="mt-10 max-w-3xl space-y-10">
        {LOCKED.map((group) => (
          <section key={group.title} aria-labelledby={`gr-${group.title}`}>
            <h2
              id={`gr-${group.title}`}
              className="font-mono text-2xs uppercase tracking-kicker text-muted-foreground"
            >
              {group.title}
            </h2>

            <ul className="mt-3 space-y-4">
              {group.items.map((item) => (
                <li
                  key={item.what}
                  className="border-l-2 border-border pl-4"
                >
                  <p className="font-medium">{item.what}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.why}
                  </p>
                  {item.where ? (
                    <p className="mt-1.5 text-sm">{item.where}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12">
        <Button asChild variant="outline">
          <Link href="/admin/tekstove">Обратно към текстовете</Link>
        </Button>
      </div>
    </>
  );
}
