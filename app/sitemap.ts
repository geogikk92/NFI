// sitemap.xml · част от задача 22.
//
// Съдържа всеки маршрут на ТРИТЕ езика с кръстосани hreflang връзки. Без
// `alternates.languages` търсачката вижда трите версии като почти еднакви
// страници и избира сама коя да покаже — обикновено не тази, която искаме.
//
// Курсовете и продуктите идват от базата, не са изброени на ръка: списък,
// поддържан ръчно, остарява още при първия нов курс.

import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { db } from "@/lib/db";

const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Статичните пътища без езиковия сегмент, с приоритет и честота. */
const STATIC_PATHS: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/kurse", priority: 0.9, changeFrequency: "weekly" },
  { path: "/einstufungstest", priority: 0.8, changeFrequency: "monthly" },
  { path: "/kontakt", priority: 0.8, changeFrequency: "monthly" },
  { path: "/shop", priority: 0.7, changeFrequency: "weekly" },
  { path: "/ueber-uns", priority: 0.6, changeFrequency: "monthly" },
  { path: "/community", priority: 0.5, changeFrequency: "monthly" },
  // Правните страници се индексират (изискване по §5 DDG за намираемост),
  // но с нисък приоритет — те не са входна точка.
  { path: "/impressum", priority: 0.3, changeFrequency: "yearly" },
  { path: "/datenschutz", priority: 0.3, changeFrequency: "yearly" },
  { path: "/agb", priority: 0.3, changeFrequency: "yearly" },
  { path: "/widerruf", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
];

/** Кръстосаните езикови версии за един път. */
function alternates(pathWithoutLocale: string) {
  const languages: Record<string, string> = {};
  for (const locale of LOCALES) {
    languages[locale] = `${SITE_URL}/${locale}${pathWithoutLocale}`;
  }
  languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}${pathWithoutLocale}`;
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const item of STATIC_PATHS) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}/${locale}${item.path}`,
        lastModified: new Date(),
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        alternates: alternates(item.path),
      });
    }
  }

  // Курсове и продукти от базата. `updatedAt` дава истинска lastModified —
  // търсачката преобхожда само променилото се.
  //
  // Ако базата е недостъпна, sitemap-ът излиза САМО със статичните пътища,
  // вместо цялата страница да върне 500: половин sitemap е по-добре от
  // никакъв.
  try {
    const [courses, products] = await Promise.all([
      db.course.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.product.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    for (const course of courses) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}/kurse/${course.slug}`,
          lastModified: course.updatedAt,
          changeFrequency: "monthly",
          priority: 0.7,
          alternates: alternates(`/kurse/${course.slug}`),
        });
      }
    }

    for (const product of products) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}/shop/${product.slug}`,
          lastModified: product.updatedAt,
          changeFrequency: "monthly",
          priority: 0.6,
          alternates: alternates(`/shop/${product.slug}`),
        });
      }
    }
  } catch (error) {
    console.error("sitemap: базата е недостъпна, само статични пътища", error);
  }

  return entries;
}
