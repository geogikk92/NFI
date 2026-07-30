// Структурирани данни (JSON-LD) · част от задача 22.
//
// JSON-LD е единственият формат, който Google препоръчва. Страници с
// коректни структурирани данни печелят чувствително по-висок CTR, защото
// излизат като rich result, а не като обикновена синя връзка.
//
// ЖЕЛЯЗНО ПРАВИЛО: маркира се САМО това, което е вярно И видимо на
// страницата. Google наказва markup за съдържание, което посетителят не
// вижда — а „наказва" значи изпадане от rich results, понякога от индекса.
// Затова тук няма нито едно поле, което да не се чете на самата страница.
//
// Съзнателно НЕ се маркира:
//   • AggregateRating — на началната страница се вижда „4.9", но той идва
//     от Facebook общността, а видимите отзиви са четири. Rating с
//     несъответстващ reviewCount е точно случаят, за който Google маха
//     rich results. Отзивите се маркират поединично като Review.
//   • offers/price на курсовете — цената нарочно не се показва („научаваш
//     я в разговора"), значи не бива да е и в markup-а.

import type { Locale } from "@/lib/i18n/config";
import { LOCALE_TAGS } from "@/lib/i18n/config";

const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Стабилни @id стойности — така Google свързва обектите между страниците. */
export const SCHEMA_IDS = {
  organization: `${SITE_URL}/#organization`,
  website: `${SITE_URL}/#website`,
  founder: `${SITE_URL}/#vasilena`,
} as const;

function abs(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Институтът. `EducationalOrganization` е по-точен от `Organization` за
 * езикова школа и дава право на образователните rich results.
 */
export function organizationSchema(locale: Locale) {
  return {
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": SCHEMA_IDS.organization,
    name: "Nürnberger Fremdsprachen Institut",
    alternateName: "NFI",
    url: abs(`/${locale}`),
    inLanguage: LOCALE_TAGS[locale],
    // Езиците, на които РЕАЛНО се преподава и консултира — това се твърди
    // на началната страница („консултираме на немски и български").
    knowsLanguage: ["de", "bg"],
    founder: { "@id": SCHEMA_IDS.founder },
    // Адрес и телефон нарочно ЛИПСВАТ: още ги чакаме от клиентката
    // (виж AwaitingLegalText в /impressum). Празен или измислен
    // PostalAddress е по-лош от липсващ — LocalBusiness без адрес просто
    // не получава местни rich results, а с грешен адрес получава грешни.
  };
}

/** Василена. Личното преподаване е обещанието на марката, не украса. */
export function founderSchema(locale: Locale) {
  const jobTitle: Record<Locale, string> = {
    bg: "Преподавател по немски и основател",
    de: "Deutschlehrerin und Gründerin",
    en: "German teacher and founder",
  };

  return {
    "@type": "Person",
    "@id": SCHEMA_IDS.founder,
    name: "Василена Нюрнбергер",
    alternateName: "Vasilena Nürnberger",
    jobTitle: jobTitle[locale],
    worksFor: { "@id": SCHEMA_IDS.organization },
    knowsLanguage: ["de", "bg"],
  };
}

export function websiteSchema(locale: Locale) {
  return {
    "@type": "WebSite",
    "@id": SCHEMA_IDS.website,
    url: abs(`/${locale}`),
    name: "Nürnberger Fremdsprachen Institut",
    inLanguage: LOCALE_TAGS[locale],
    publisher: { "@id": SCHEMA_IDS.organization },
  };
}

export interface CourseSchemaInput {
  slug: string;
  name: string;
  description: string | null;
  /** A1–C1 */
  level: string;
  /** ONLINE | PRESENCE | HYBRID | INDIVIDUAL */
  format: string;
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  maxParticipants: number | null;
  startsAt: Date | null;
}

const MODE_BY_FORMAT: Record<string, string> = {
  ONLINE: "online",
  PRESENCE: "onsite",
  HYBRID: "blended",
  INDIVIDUAL: "onsite",
};

/**
 * Един курс. `Course` + `CourseInstance` е двойката, която Google иска за
 * образователни rich results: Course описва програмата, CourseInstance —
 * конкретното провеждане.
 */
export function courseSchema(locale: Locale, course: CourseSchemaInput) {
  const instance: Record<string, unknown> = {
    "@type": "CourseInstance",
    courseMode: MODE_BY_FORMAT[course.format] ?? "online",
    inLanguage: "de",
  };

  if (course.startsAt) {
    instance.startDate = course.startsAt.toISOString().slice(0, 10);
  }

  // ISO 8601 продължителност. P14W се чете от Google; „14 седмици" не.
  if (course.durationWeeks) {
    instance.courseWorkload = `P${course.durationWeeks}W`;
  }

  if (course.maxParticipants) {
    instance.maximumAttendeeCapacity = course.maxParticipants;
  }

  return {
    "@type": "Course",
    "@id": abs(`/${locale}/kurse/${course.slug}#course`),
    url: abs(`/${locale}/kurse/${course.slug}`),
    name: course.name,
    ...(course.description ? { description: course.description } : {}),
    inLanguage: LOCALE_TAGS[locale],
    // Езикът, който СЕ ПРЕПОДАВА — различно от езика на страницата.
    teaches: "German",
    educationalLevel: course.level,
    provider: { "@id": SCHEMA_IDS.organization },
    hasCourseInstance: instance,
  };
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbSchema(items: readonly BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

export interface ReviewInput {
  quote: string;
  author: string;
  city: string;
}

/**
 * Отзивите поединично, БЕЗ агрегирана оценка.
 *
 * Всеки Review носи `itemReviewed`, защото самостоятелен отзив без обект
 * се игнорира. Липсата на reviewRating е нарочна: в мокъпа отзивите са
 * текст без звезди по отделния отзив, а измислена оценка на всеки от тях
 * е точно това, което Google нарича „marking up content the user cannot
 * see".
 */
export function reviewsSchema(reviews: readonly ReviewInput[]) {
  return reviews.map((review) => ({
    "@type": "Review",
    itemReviewed: { "@id": SCHEMA_IDS.organization },
    reviewBody: review.quote,
    author: {
      "@type": "Person",
      name: review.author,
      ...(review.city ? { address: review.city } : {}),
    },
  }));
}

/**
 * Опакова графа. `@graph` е за предпочитане пред няколко отделни скрипта:
 * обектите се свързват през @id, вместо да се дублират.
 */
export function graph(...nodes: unknown[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.flat().filter(Boolean),
  };
}
