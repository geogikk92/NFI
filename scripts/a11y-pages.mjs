// ТЕРИТОРИЯ НА БОБИ · задача 23v — достъпност на РЕАЛНИТЕ страници.
//
//   npm run a11y:pages
//
// Допълва `npm run a11y:contrast`, не го замества: онзи мери токените в
// палитрата (42 двойки, преди нещо да е нарисувано), а този пуска
// axe-core върху построените страници и хваща каквото се появява чак при
// сглобяването — липсващ етикет на поле, счупена йерархия на заглавията,
// бутон без достъпно име, ARIA, която сочи в нищото.
//
// ЗАЩО Е ЗАДЪЛЖИТЕЛНО, А НЕ ПОЖЕЛАТЕЛНО
// Директива (ЕС) 2019/882 е в сила от 28.06.2025; новите магазини нямат
// преходен срок, стандартът е WCAG 2.1 AA, а КЗП налага глоби. Виж
// docs/ПРАВНИ-ИЗИСКВАНИЯ.md §6.
//
// ГРАНИЦАТА НА АВТОМАТИЧНОТО
// axe хваща около една трета от нарушенията по WCAG. Другите две трети
// искат човек: смислен ли е alt текстът, логичен ли е редът на четене,
// работи ли потокът с екранен четец. Затова минаването на този скрипт НЕ
// значи „сайтът е достъпен" — значи „машинно установимото е чисто".
// Ръчната част е описана в docs/ДОСТЪПНОСТ.md.

import { chromium } from "playwright";
import { createRequire } from "node:module";
import {
  crawl,
  report,
  startServer,
  stopServer,
} from "./a11y-audit-shared.mjs";

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve("axe-core/axe.min.js");

/**
 * Правилата, по които се мери.
 *
 * wcag2a + wcag2aa + wcag21a + wcag21aa = точно стандартът, който законът
 * изисква. „best-practice" НЕ влиза: то съдържа съвети, които не са
 * изискване, а провалът по тях би скрил истинските нарушения в шума.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Двата размера, при които се мери.
 *
 * Телефонът не е козметика тук: при 375px навигацията става бургер меню,
 * а таблиците се превръщат в превъртащи се области — и двете са нови
 * възможности за нарушение, които на настолен екран изобщо не съществуват.
 */
const VIEWPORTS = [
  { name: "настолно", width: 1280, height: 800 },
  { name: "телефон", width: 375, height: 812 },
];

const out = report("Достъпност на страниците (axe-core, WCAG 2.1 AA)");

const { base, child } = await startServer();
console.log(`· Сървър на ${base}`);

const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    viewport: VIEWPORTS[0],
    reducedMotion: "reduce",
  });
  const scout = await context.newPage();

  const { pages, truncated } = await crawl(scout, base);
  await scout.close();

  const reachable = pages.filter((p) => !p.broken);
  console.log(`· ${reachable.length} страници за проверка`);

  if (truncated) {
    // Тихото отрязване би значело „проверено е всичко", когато не е.
    out.problem(
      "обхождането опря в тавана",
      "Вдигни limit в scripts/a11y-audit-shared.mjs — част от страниците не са проверени.",
    );
  }

  for (const broken of pages.filter((p) => p.broken)) {
    out.problem(
      `връзка към ${broken.pathname} връща HTTP ${broken.status}`,
      "Мъртва връзка в навигацията или в съдържанието.",
    );
  }

  // Нарушенията се събират по ПРАВИЛО, не по страница: едно и също
  // нарушение на двайсет страници е един дефект в общ компонент, а
  // двайсет отделни реда го правят да изглежда като двайсет.
  const byRule = new Map();

  for (const viewport of VIEWPORTS) {
    // reducedMotion: "reduce" НЕ е дребна настройка, а условие за верен
    // резултат. Без нея axe мери ЦВЕТА ПО ВРЕМЕ НА входната анимация:
    // избледняващият текст минава през междинни стойности и всяка от тях
    // се отчита като нарушение на контраста. Първото пускане даде осем
    // такива призрака (#7f796b, #787263, #7b7567 — все междинни оттенъци
    // на един и същ --muted-foreground). WCAG важи за УСТОЙЧИВОТО
    // състояние, а сайтът и без това изключва анимациите при тази
    // настройка (правилото е в app/globals.css).
    const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await ctx.newPage();

    for (const { pathname } of reachable) {
      await page.goto(base + pathname, { waitUntil: "networkidle" });
      // Cookie банерът покрива долната част на екрана и axe го мери
      // като част от страницата — което е вярно, той наистина е там.
      await page.waitForTimeout(300);

      await page.addScriptTag({ path: AXE_PATH });
      const result = await page.evaluate(
        (tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }),
        TAGS,
      );

      out.ok(`${pathname} · ${viewport.name}`, result.violations.length === 0);

      for (const violation of result.violations) {
        const entry = byRule.get(violation.id) ?? {
          help: violation.help,
          impact: violation.impact,
          url: violation.helpUrl,
          where: new Set(),
          example: violation.nodes[0]?.html?.slice(0, 120) ?? "",
        };
        entry.where.add(`${pathname} (${viewport.name})`);
        byRule.set(violation.id, entry);
      }
    }

    await ctx.close();
  }

  for (const [id, v] of byRule) {
    const places = [...v.where];
    const shown = places.slice(0, 4).join(", ");
    const more = places.length > 4 ? ` … и още ${places.length - 4}` : "";
    out.problem(
      `${id} (${v.impact}) — ${v.help}`,
      `Къде: ${shown}${more}\nПример: ${v.example}\nПодробно: ${v.url}`,
    );
  }
} finally {
  await browser.close();
  stopServer(child);
}

const failures = out.summary();
console.log(
  "\nБележка: axe хваща машинно установимото (~1/3 от WCAG). Ръчната\n" +
    "проверка с клавиатура и екранен четец остава задължителна —\n" +
    "виж docs/ДОСТЪПНОСТ.md.",
);
process.exit(failures > 0 ? 1 : 0);
