// ТЕРИТОРИЯ НА БОБИ · задача 4.
// Писано от Жоро, докато Боби е в отпуск.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatCourseDuration, formatDate, toDateTimeAttribute } from "@/lib/intl";
import { formatMoney } from "@/lib/money";
import {
  FORMAT_LABELS,
  LEVEL_LABELS,
  type CourseSummary,
} from "@/lib/cms/courses";

export function CourseCard({ course }: { course: CourseSummary }) {
  const title = course.titleDe ?? course.title;
  const summary = course.summaryDe ?? course.summary;
  const duration = formatCourseDuration(
    course.durationWeeks,
    course.hoursPerWeek,
  );

  return (
    <Card className="group relative flex h-full flex-col transition-shadow hover:shadow-md">
      <CardContent className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{LEVEL_LABELS[course.level]}</Badge>
          <Badge variant="outline">{FORMAT_LABELS[course.format]}</Badge>
        </div>

        <h3 className="mt-4 font-display text-xl leading-snug">
          {/* Цялата карта е кликаема, но връзката е една — иначе екранният
              четец обявява един и същ адрес по три пъти. */}
          <Link
            href={`/kurse/${course.slug}`}
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
              <dt className="text-muted-foreground">Umfang:</dt>
              <dd>{duration}</dd>
            </div>
          ) : null}

          {course.startsAt ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Start:</dt>
              <dd>
                <time dateTime={toDateTimeAttribute(course.startsAt)}>
                  {formatDate(course.startsAt)}
                </time>
              </dd>
            </div>
          ) : null}

          {course.maxParticipants ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Gruppe:</dt>
              <dd>max. {course.maxParticipants} Teilnehmende</dd>
            </div>
          ) : null}
        </dl>
      </CardContent>

      <CardFooter>
        {course.priceCents !== null ? (
          <div>
            <p className="text-lg font-semibold">
              {formatMoney(course.priceCents)}
            </p>
            <p className="text-xs text-muted-foreground">
              inkl. MwSt. · gesamter Kurs
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Preis auf Anfrage</p>
        )}
      </CardFooter>
    </Card>
  );
}
