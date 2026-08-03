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
import { hasDatabaseConfigured } from "@/lib/db-health";

/**
 * Преоценява се на всеки час.
 *
 * БЕЗ това sitemap-ът се изпича ВЕДНЪЖ при билда и повече не се пипа —
 * проверено в .next/prerender-manifest.json, където записът за
 * /sitemap.xml има `initialRevalidateSeconds: false`. Тоест курс, въведен
 * от админ панела следобед, физически не може да се появи преди следващия
 * деплой. Точно това стана възможно, откакто панелът пише в базата.
 *
 * Час е компромис: по-често е излишно (търсачките не обхождат по-бързо),
 * по-рядко значи ден закъснение за нов курс.
 */
export const revalidate = 3600;

const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Статичните пътища без езиковия сегмент, с приоритет и честота. */
const STATIC_PATHS: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  /**
   * Страници, чийто текст е и остава немски на всички адреси.
   *
   * Влизат в sitemap-а ВЕДНЪЖ, само с немския адрес и без hreflang: те не
   * са три езикови версии, а три копия на един и същ немски документ.
   * hreflang между тях казва на търсачката „това е преводът", което е
   * невярно. Виж и твърдия canonical в самите страници.
   */
  germanOnly?: true;
}> = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/kurse", priority: 0.9, changeFrequency: "weekly" },
  { path: "/einstufungstest", priority: 0.8, changeFrequency: "monthly" },
  { path: "/kontakt", priority: 0.8, changeFrequency: "monthly" },
  { path: "/shop", priority: 0.7, changeFrequency: "weekly" },
  { path: "/materialien", priority: 0.7, changeFrequency: "weekly" },
  { path: "/ueber-uns", priority: 0.6, changeFrequency: "monthly" },
  { path: "/community", priority: 0.5, changeFrequency: "monthly" },
  // Правните страници се индексират (изискване по §5 DDG за намираемост),
  // но с нисък приоритет — те не са входна точка.
  { path: "/impressum", priority: 0.3, changeFrequency: "yearly", germanOnly: true },
  { path: "/datenschutz", priority: 0.3, changeFrequency: "yearly", germanOnly: true },
  { path: "/agb", priority: 0.3, changeFrequency: "yearly", germanOnly: true },
  { path: "/widerruf", priority: 0.3, changeFrequency: "yearly", germanOnly: true },
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
    if (item.germanOnly) {
      entries.push({
        // Буквално „de", а НЕ DEFAULT_LOCALE — той е „bg". Подаден тук,
        // sitemap-ът би сочил /bg/impressum, докато самата страница
        // обявява canonical към /de/impressum. Адрес в sitemap, чийто
        // canonical сочи другаде, е противоречив сигнал и Google
        // подминава и двата. Изрично разминаване, хванато при проверка.
        url: `${SITE_URL}/de${item.path}`,
        lastModified: new Date(),
        changeFrequency: item.changeFrequency,
        priority: item.priority,
        // БЕЗ alternates — виж бележката при germanOnly.
      });
      continue;
    }

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
  // Липсваща база и НЕДОСТЪПНА база са различни неща и се третират
  // различно — същото разграничение като в lib/db-health.ts.
  //
  // Липсва DATABASE_URL: билд без база (така минава `next build` на чиста
  // машина). Излизат само статичните пътища и това е вярно.
  if (!hasDatabaseConfigured()) {
    console.warn("sitemap: няма DATABASE_URL, само статични пътища");
    return entries;
  }

  try {
    const [courses, products, materials] = await Promise.all([
      db.course.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.product.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      db.freeMaterial.findMany({
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

    for (const material of materials) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}/materialien/${material.slug}`,
          lastModified: material.updatedAt,
          changeFrequency: "monthly",
          priority: 0.6,
          alternates: alternates(`/materialien/${material.slug}`),
        });
      }
    }
  } catch (error) {
    // ХВЪРЛЯ СЕ НАНОВО, а не се връща половин sitemap.
    //
    // Причината е в кеша отгоре: върнатият резултат се запазва за ЦЯЛ ЧАС.
    // Осакатен sitemap, изпечен в момент на срив на базата, би стоял час
    // и би казал на търсачката, че всички курсове са изчезнали. При
    // хвърляне Next задържа последното УСПЕШНО копие и опитва пак —
    // по-старият пълен sitemap е по-добър от пресния празен.
    console.error("sitemap: базата не отговори, задържа се старото копие", error);
    throw error;
  }

  return entries;
}
