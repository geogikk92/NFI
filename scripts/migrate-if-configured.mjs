#!/usr/bin/env node
// Прилага миграциите, но НЕ събаря деплоя, ако база още няма.
//
// Защо съществува: `prisma migrate deploy` в buildCommand гърми при
// липсващ DATABASE_URL и целият деплой пада. За първия деплой това е
// излишно строго — по-полезно е сайтът да се вдигне и да КАЖЕ какво
// липсва, отколкото да няма нищо.
//
// Но тишината е по-опасна от провала, затова:
//   • при липсваща база излиза ГРОМКО предупреждение в build лога;
//   • страниците показват ясно съобщение, не празен каталог
//     (виж app/[locale]/(public)/kurse/page.tsx);
//   • при НАЛИЧНА база и провалила се миграция — деплоят пада, както
//     трябва: половин схема е по-лоша от липсваща.

import { spawnSync } from "node:child_process";

const url = process.env.DATABASE_URL;

if (!url) {
  console.warn(
    [
      "",
      "═".repeat(70),
      "  ВНИМАНИЕ: DATABASE_URL липсва — миграциите се ПРОПУСКАТ.",
      "",
      "  Сайтът ще се вдигне, но курсовете и продуктите ще липсват,",
      "  защото идват от базата.",
      "",
      "  Как се оправя (Vercel):",
      "    1. Storage → Create Database → Neon → регион eu-central-1",
      "       (Frankfurt). Това задава DATABASE_URL автоматично.",
      "    2. Или Settings → Environment Variables → DATABASE_URL",
      "       (pooled connection низът, не директният).",
      "    3. Redeploy.",
      "",
      "  Подробно: docs/ДЕПЛОЙ.md",
      "═".repeat(70),
      "",
    ].join("\n"),
  );
  process.exit(0);
}

console.log("DATABASE_URL е наличен — прилагам миграциите.");

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: false,
});

// ИМА база, но миграцията се провали → деплоят ТРЯБВА да падне.
// Половин приложена схема дава грешки при заявка, които са много
// по-трудни за диагностика от провален build.
if (result.status !== 0) {
  console.error(
    "\nМиграциите се провалиха при НАЛИЧНА база. Деплоят се спира —\n" +
      "половин схема е по-лоша от липсваща.\n",
  );
  process.exit(result.status ?? 1);
}
