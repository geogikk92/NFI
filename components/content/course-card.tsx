// ТЕРИТОРИЯ НА БОБИ · задача 4.
// Писано от Жоро, докато Боби е в отпуск.
//
// Езикът се подава отвън, не се разчита тук: картата стои в списъци,
// които вече знаят локала, а второ разчитане би се разминало с адреса.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { toDateTimeAttribute } from "@/lib/intl";
// Само тип — стойност оттук би довлякла Prisma до всеки, който внесе картата.
import type { CourseSummary } from "@/lib/cms/courses";
import { pick, type Locale } from "@/lib/i18n/config";
import {
  courseDuration,
  coursesCopy,
  formatLabel,
  levelLabel,
} from "@/lib/i18n/pages/courses";
import { dateShort } from "@/lib/i18n/pages/formats";

interface CourseCardProps {
  course: CourseSummary;
  locale: Locale;
}

export function CourseCard({ course, locale }: CourseCardProps) {
  const t = coursesCopy(locale).card;
  const title = pick(locale, {
    bg: course.title,
    de: course.titleDe,
    en: course.titleEn,
  });
  const summary = pick(locale, {
    bg: course.summary,
    de: course.summaryDe,
    en: course.summaryEn,
  });
  const duration = courseDuration(
    locale,
    course.durationWeeks,
    course.hoursPerWeek,
  );

  return (
    <Card className="group relative flex h-full flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{levelLabel(locale, course.level)}</Badge>
          <Badge variant="outline">{formatLabel(locale, course.format)}</Badge>
        </div>

        <h3 className="mt-4 font-title text-xl leading-snug">
          {/* Цялата карта е кликаема, но връзката е една — иначе екранният
              четец обявява един и същ адрес по три пъти. */}
          <Link
            href={`/${locale}/kurse/${course.slug}`}
            className="after:absolute after:inset-0 group-hover:text-primary"
          >
            {title}
          </Link>
        </h3>

        {summary ? (
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
            {summary}
          </p>
        ) : null}

        <dl className="mt-5 space-y-1.5 text-sm">
          {duration ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t.scope}</dt>
              <dd>{duration}</dd>
            </div>
          ) : null}

          {course.startsAt ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t.start}</dt>
              <dd>
                <time dateTime={toDateTimeAttribute(course.startsAt)}>
                  {dateShort(locale, course.startsAt)}
                </time>
              </dd>
            </div>
          ) : null}

          {course.maxParticipants ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{t.group}</dt>
              <dd>{t.groupValue(course.maxParticipants)}</dd>
            </div>
          ) : null}
        </dl>
      </CardContent>

      <CardFooter>
        {/* БЕЗ цена — така е в мокъпа: „Цената научаваш в безплатния
            разговор, където заедно преценяваме и нивото ти."
            Курсът не се купува онлайн, а през заявка за обаждане, затова
            PAngV не изисква цена преди поръчката (няма поръчка тук).
            Ако някога курс стане купуем от количката, цената ТРЯБВА да е
            видима преди бутона — виж docs/ПРАВНИ-ИЗИСКВАНИЯ.md §4.4. */}
        <p className="text-sm text-muted-foreground">{t.priceInTalk}</p>
      </CardFooter>
    </Card>
  );
}
