// robots.txt · част от задача 22.
//
// ВАЖНО: сайтът е още в разработка и app/layout.tsx носи
// `robots: { index: false }`. Затова тук по подразбиране всичко е
// забранено — противното би било противоречив сигнал: meta таг казва
// „не индексирай", а robots.txt казва „обхождай свободно".
//
// Пускането става с ЕДНА променлива: SITE_INDEXABLE=1. Тогава се маха и
// noindex-ът в layout.tsx (задача 22, „махане на noindex от 11-те файла").

import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";

/** Пускането е ИЗРИЧНО решение, не страничен ефект от деплой. */
const INDEXABLE = process.env.SITE_INDEXABLE === "1";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXABLE) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Админът и вътрешните пътища нямат работа в индекса.
          "/admin",
          "/api/",
          // Количката и профилът са лични и се менят при всяко посещение.
          "/*/warenkorb",
          "/*/registrieren",
          "/*/anmelden",
          // Личните резултати от теста — линкът е споделяем, но не
          // индексируем; страницата така или иначе носи noindex.
          "/*/einstufungstest/ergebnis/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
