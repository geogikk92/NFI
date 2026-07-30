// Езиковият слой на публичната част.
//
// Тук се задава `lang` на документа — не в app/layout.tsx, защото той
// важи и за админа, който е винаги на български.

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { LOCALES, isLocale, LOCALE_TAGS } from "@/lib/i18n/config";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Непознат език дава 404, вместо да пада тихо на немски: иначе
  // /fr/kurse би върнал 200 с немско съдържание и търсачките биха
  // индексирали дубликат.
  if (!isLocale(locale)) notFound();

  return (
    // `lang` на този <div> надделява над html[lang] за всичко вътре, а
    // html[lang] остава немски по подразбиране от app/layout.tsx. Така
    // екранният четец сменя гласа според избрания език.
    <div lang={LOCALE_TAGS[locale]}>{children}</div>
  );
}
