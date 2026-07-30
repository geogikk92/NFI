// Текстовете на страница „Общност".

import type { Locale } from "@/lib/i18n/config";

const de = {
  metaTitle: "Community",
  metaDescription:
    "Sprachcafé, Lerngruppen und Veranstaltungen am Nürnberger Fremdsprachen Institut.",
  kicker: "Community",
  title: "Sprache lebt vom Sprechen",
  lead:
    "Ein Kurs allein macht niemanden sicher. Deshalb gibt es bei uns Gelegenheiten, außerhalb des Unterrichts zu üben.",
  cafeHeading: "Sprachcafé",
  groupsHeading: "Lerngruppen",
  datesHeading: "Nächste Termine",
  emptyTitle: "Noch keine Termine veröffentlicht",
  emptyBody:
    "Sobald die nächsten Treffen feststehen, finden Sie sie hier. Fragen Sie uns gern direkt.",
  emptyCta: "Nachfragen",
};

type CommunityCopy = typeof de;

const bg: CommunityCopy = {
  metaTitle: "Общност",
  metaDescription:
    "Езиково кафе, учебни групи и събития в Нюрнбергския институт за чужди езици.",
  kicker: "Общност",
  title: "Езикът живее от говоренето",
  lead:
    "Само курс не прави никого уверен. Затова при нас има поводи да упражняваш и извън часовете.",
  cafeHeading: "Езиково кафе",
  groupsHeading: "Учебни групи",
  datesHeading: "Следващи дати",
  emptyTitle: "Още няма обявени дати",
  emptyBody:
    "Щом следващите срещи се насрочат, ще ги видиш тук. Питай ни и директно.",
  emptyCta: "Питай ни",
};

const en: CommunityCopy = {
  metaTitle: "Community",
  metaDescription:
    "Language café, study groups and events at the Nuremberg Institute of Foreign Languages.",
  kicker: "Community",
  title: "A language lives by being spoken",
  lead:
    "A course alone makes nobody confident. That's why we create chances to practise outside class.",
  cafeHeading: "Language café",
  groupsHeading: "Study groups",
  datesHeading: "Next dates",
  emptyTitle: "No dates published yet",
  emptyBody:
    "As soon as the next meetings are set, you'll find them here. Do ask us directly.",
  emptyCta: "Ask us",
};

const COPY: Record<Locale, CommunityCopy> = { de, bg, en };

export function communityCopy(locale: Locale): CommunityCopy {
  return COPY[locale] ?? COPY.de;
}
