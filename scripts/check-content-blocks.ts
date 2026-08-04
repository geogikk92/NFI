// Проверка: попълнени ли са редактируемите текстове — ПО ЕЗИК.
//
//   npm run check:content
//
// ЗАЩО ОТДЕЛЕН СКРИПТ. До задача 18 седемте липсващи текста стояха като
// `<AwaitingLegalText>` в кода и scripts/check-legal-placeholders.mjs ги
// хващаше с четене на файлове. Сега те са редактируеми блокове: маркерът
// излезе от кода и се превърна в СЪСТОЯНИЕ НА БАЗАТА. Без тази проверка
// деплой с празни блокове минава тихо — точно това, което старият скрипт
// е бил построен да спре.
//
// ПО ЕЗИК, не общо: блок, попълнен само на български, оставя немската
// страница със същата жълта бележка. Проверка, която брои блока за готов,
// защото има български текст, лъже точно за публиката, заради която
// немската версия съществува.
//
// При CHECK_CONTENT_STRICT=1 излиза с код 1 — така се пуска преди деплой.

import { db } from "../lib/db";
import { LOCALES } from "../lib/i18n/config";
import { BLOCKS, PAGE_LABELS, hasCodeFallback } from "../lib/content/registry";

const strict = process.env.CHECK_CONTENT_STRICT === "1";

const LOCALE_NAMES: Record<string, string> = {
  bg: "български",
  de: "немски",
  en: "английски",
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log(
      "! Няма DATABASE_URL — проверката не е направена. Това НЕ е „чисто“.",
    );
    process.exit(strict ? 1 : 0);
  }

  const rows = await db.contentBlock.findMany({
    select: { key: true, bg: true, de: true, en: true },
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));

  const missing: { key: string; label: string; page: string; locales: string[] }[] =
    [];

  for (const spec of BLOCKS) {
    // Блок със стойност в кода никога не е празен — той просто показва
    // кода, докато не бъде презаписан. Такъв блок не спира деплой.
    if (hasCodeFallback(spec)) continue;

    const row = byKey.get(spec.key);
    const empty = LOCALES.filter((locale) => {
      const value = row?.[locale];
      return !value || value.trim().length === 0;
    });

    if (empty.length > 0) {
      missing.push({
        key: spec.key,
        label: spec.label,
        page: PAGE_LABELS[spec.page],
        locales: empty.map((locale) => LOCALE_NAMES[locale] ?? locale),
      });
    }
  }

  await db.$disconnect();

  if (missing.length === 0) {
    console.log(
      `✓ Всички ${BLOCKS.length} текста са попълнени на трите езика.`,
    );
    return;
  }

  console.log(
    `\n${strict ? "✗" : "!"} ${missing.length} текста не са попълнени докрай:\n`,
  );

  for (const item of missing) {
    console.log(`  ${item.page} · ${item.label}`);
    console.log(`    липсва на: ${item.locales.join(", ")}`);
    console.log(`    редакция:  /admin/tekstove/${item.key}`);
  }

  console.log(
    strict
      ? "\nДеплой спрян: празен блок показва жълта бележка на живия сайт.\n"
      : "\n(Предупреждение. Пусни с CHECK_CONTENT_STRICT=1, за да спре деплой.)\n",
  );

  process.exit(strict ? 1 : 0);
}

main().catch(async (error) => {
  console.error("Проверката се провали:", error);
  await db.$disconnect();
  process.exit(1);
});
