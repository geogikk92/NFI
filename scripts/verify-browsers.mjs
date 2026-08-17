// ТЕРИТОРИЯ НА БОБИ · задача 23v — кросбраузър и мобилна проверка.
//
//   npm run verify:browsers
//
// Пуска ТРИТЕ двигателя, които покриват реалния свят:
//   • Chromium — Chrome, Edge, Samsung Internet, Opera
//   • Firefox  — Gecko
//   • WebKit   — Safari, и ЗАДЪЛЖИТЕЛНО всеки браузър на iPhone (Apple
//     изисква WebKit под всяко приложение в iOS)
//
// Проверява неща, които axe НЕ проверява, защото не са нарушения по
// WCAG, а счупено оформление и различия между двигателите:
//
//   1. Хоризонтално преливане — най-честият мобилен дефект. Страница,
//      която се клати настрани, е счупена, дори всичко в нея да е
//      достъпно.
//   2. Уважава ли се prefers-reduced-motion. Проектът го твърди в
//      globals.css; тук се проверява, че наистина е така — вестибуларно
//      разстройство е медицинско състояние, а WCAG 2.3.3 е изискване.
//   3. Видим фокус при движение с клавиатура (WCAG 2.4.7).
//   4. Езикът на документа (WCAG 3.1.1) — четецът избира глас по него.
//   5. Грешки в конзолата, различни между двигателите.
//
// ГРАНИЦАТА: това е емулация на РАЗМЕР и на двигател, не на устройство.
// Истински телефон има друга скорост, докосване вместо мишка, вграден
// екранен четец и екран на слънце. Ръчният кръг остава — виж
// docs/ДОСТЪПНОСТ.md.

import { chromium, firefox, webkit } from "playwright";
import { crawl, report, startServer, stopServer } from "./a11y-audit-shared.mjs";

const ENGINES = [
  { name: "Chromium", launch: chromium },
  { name: "Firefox", launch: firefox },
  { name: "WebKit (Safari, iPhone)", launch: webkit },
];

const VIEWPORTS = [
  { name: "телефон", width: 375, height: 812 },
  { name: "таблет", width: 768, height: 1024 },
  { name: "настолно", width: 1280, height: 800 },
];

/** Допуск от 1px: закръглянето на подпикселите не е дефект. */
const OVERFLOW_TOLERANCE = 1;

const out = report("Кросбраузър и мобилна годност");

const { base, child } = await startServer();
console.log(`· Сървър на ${base}`);

// Списъкът се съставя ВЕДНЪЖ и се ползва от трите двигателя — иначе
// сравняваме различни страници и разликите не значат нищо.
const scoutBrowser = await chromium.launch();
const scoutPage = await scoutBrowser.newPage();
const { pages } = await crawl(scoutPage, base);
await scoutBrowser.close();

const paths = pages.filter((p) => !p.broken).map((p) => p.pathname);
console.log(`· ${paths.length} страници × ${ENGINES.length} двигателя × ${VIEWPORTS.length} размера`);

try {
  for (const engine of ENGINES) {
    let browser;
    try {
      browser = await engine.launch.launch();
    } catch (error) {
      out.problem(
        `${engine.name} не се пуска`,
        `${error.message.split("\n")[0]}\nИнсталирай с: npx playwright install`,
      );
      continue;
    }

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 120));
      });

      for (const pathname of paths) {
        await page.goto(base + pathname, { waitUntil: "networkidle" });

        const measured = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          lang: document.documentElement.lang,
          // Кой елемент стърчи — иначе „нещо прелива" не се поправя.
          widest: (() => {
            let worst = null;
            let max = 0;
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              if (r.width === 0) continue;
              const over = r.right - window.innerWidth;
              if (over > max) {
                max = over;
                worst = `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`;
              }
            }
            return worst ? { el: worst, over: Math.round(max) } : null;
          })(),
        }));

        const overflow = measured.scrollWidth - measured.innerWidth;
        out.ok(
          `${engine.name} · ${viewport.name} · ${pathname} — без хоризонтално преливане`,
          overflow <= OVERFLOW_TOLERANCE,
          measured.widest
            ? `стърчи ${measured.widest.el} с ${measured.widest.over}px`
            : `${overflow}px`,
        );

        // Езикът се проверява веднъж на страница — не зависи от размера.
        //
        // Сравнява се само ОСНОВНАТА подчаст на етикета: сайтът слага
        // „de-DE" и „en-GB" (LOCALE_TAGS в lib/i18n/config.ts), което е
        // валиден BCP 47 и е ПО-ТОЧНО от голото „de" — четецът избира и
        // регионалното произношение. Първата версия на проверката
        // изискваше точно съвпадение и обяви 30 верни страници за
        // сгрешени.
        if (viewport === VIEWPORTS[0]) {
          const expected = pathname.split("/")[1];
          const primary = measured.lang.split("-")[0].toLowerCase();
          out.ok(
            `${engine.name} · ${pathname} — верен език на документа`,
            primary === expected,
            `lang="${measured.lang}", а адресът е /${expected}`,
          );
        }
      }

      if (consoleErrors.length > 0) {
        out.problem(
          `${engine.name} · ${viewport.name} — грешки в конзолата`,
          [...new Set(consoleErrors)].slice(0, 3).join("\n"),
        );
      }

      await context.close();
    }

    // ── Движението се изключва при поискване (WCAG 2.3.3) ──
    const motionCtx = await browser.newContext({
      viewport: VIEWPORTS[2],
      reducedMotion: "reduce",
    });
    const motionPage = await motionCtx.newPage();
    await motionPage.goto(`${base}/bg`, { waitUntil: "networkidle" });

    const moving = await motionPage.evaluate(() => {
      const offenders = [];
      for (const el of document.querySelectorAll("body *")) {
        const s = getComputedStyle(el);
        const dur = [s.transitionDuration, s.animationDuration]
          .join(",")
          .split(",")
          .map((v) => parseFloat(v) || 0);
        // 0.05s е прагът на „незабележимо" — не всяка стойност трябва да
        // е точно нула, за да е спазено правилото.
        if (Math.max(...dur) > 0.05) {
          offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`);
        }
      }
      return [...new Set(offenders)].slice(0, 5);
    });

    out.ok(
      `${engine.name} — prefers-reduced-motion спира анимациите`,
      moving.length === 0,
      moving.join(", "),
    );

    // ── Фокусът се вижда при движение с Tab (WCAG 2.4.7) ──
    const focusPage = await (await browser.newContext({ viewport: VIEWPORTS[2] })).newPage();
    await focusPage.goto(`${base}/bg`, { waitUntil: "networkidle" });

    const invisible = [];
    for (let i = 0; i < 12; i += 1) {
      await focusPage.keyboard.press("Tab");
      const state = await focusPage.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const outlined =
          (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) ||
          s.boxShadow !== "none";
        return outlined
          ? null
          : `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`;
      });
      if (state) invisible.push(state);
    }

    out.ok(
      `${engine.name} — фокусът се вижда при първите 12 спирки на Tab`,
      invisible.length === 0,
      [...new Set(invisible)].join(", "),
    );

    await browser.close();
  }
} finally {
  stopServer(child);
}

const failures = out.summary();
console.log(
  "\nБележка: емулира се РАЗМЕР и двигател, не устройство. Истински\n" +
    "телефон, докосване и вграден екранен четец остават за ръчния кръг.",
);
process.exit(failures > 0 ? 1 : 0);
