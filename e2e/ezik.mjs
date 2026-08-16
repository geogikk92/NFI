// Език на документа и на правните страници + шрифтовете.
//
//   npx next dev --turbopack -p 3130
//   npm run e2e:ezik
//
// Шрифтовете се проверяват ТУК, защото app/layout.tsx е замразен и вече
// веднъж падна на Times, без нито една грешка в конзолата. Всяка промяна
// в него минава през този тест.

import { chromium } from "playwright";
const B = process.env.E2E_BASE_URL ?? process.env.BASE ?? "http://localhost:3130";
const out=[]; const ok=(n,v,d="")=>{out.push(v);console.log(`${v?"✓":"✗"} ${n}${d?"  — "+d:""}`)};
const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
try {
  for (const [path, want] of [["/bg/kurse","bg-BG"],["/de/kurse","de-DE"],["/en/kurse","en-GB"]]) {
    await p.goto(`${B}${path}`, { waitUntil: "domcontentloaded" });
    const lang = await p.getAttribute("html", "lang");
    ok(`${path} → html lang`, lang === want, `${lang}`);
  }
  // Правните страници: немски текст в български сайт.
  await p.goto(`${B}/bg/impressum`, { waitUntil: "domcontentloaded" });
  ok("/bg/impressum: html е bg", (await p.getAttribute("html","lang")) === "bg-BG");
  ok("/bg/impressum: main е de (WCAG 3.1.2)", (await p.getAttribute("main","lang")) === "de");

  // Филтрите и предварително избраният курс преживяват смяната на езика.
  //
  // Проверява се БЕЗ JavaScript нарочно: превключвателят е връзки, значи
  // query-то трябва да е в HTML-а още от сървъра. С включен скрипт тестът
  // би минал и при поправка, която работи само след хидратация.
  const noJs = await b.newContext({ javaScriptEnabled: false });
  const q = await noJs.newPage();
  for (const [path, want] of [
    ["/bg/kurse?level=B1&format=ONLINE", "/de/kurse?level=B1&format=ONLINE"],
    ["/bg/kontakt?kurs=deutsch-b1-online", "/de/kontakt?kurs=deutsch-b1-online"],
    // Без query адресът остава чист — без увиснал въпросителен знак.
    ["/bg/kurse", "/de/kurse"],
  ]) {
    await q.goto(`${B}${path}`, { waitUntil: "domcontentloaded" });
    const href = await q.locator('a[hreflang="de"]').first().getAttribute("href");
    ok(`${path} → DE пази query`, href === want, String(href));
  }

  // Падащото меню е нативен `<details>` — трите връзки са в документа и
  // при изключен скрипт. Смени ли го някой с Radix DropdownMenu, другите
  // два езика изчезват от HTML-а и този ред пада пръв.
  await q.goto(`${B}/bg/kurse`, { waitUntil: "domcontentloaded" });
  const inside = await q.locator('details:has(> summary) a[hreflang]').count();
  ok("без JS: трите езика са в HTML вътре в <details>", inside === 3, `${inside}`);
  ok(
    "спусъкът показва текущия език с името му",
    (await q.locator("summary").first().textContent())?.includes("Български"),
  );
  await noJs.close();

  // Таблицата в Datenschutz се превърта настрани на тесен екран.
  await p.goto(`${B}/de/datenschutz`, { waitUntil: "domcontentloaded" });
  const reg = p.locator('[role="region"][aria-label="Übersicht der gespeicherten Daten"]');
  ok(
    "превъртащата се таблица в Datenschutz приема фокус",
    (await reg.count()) === 1 &&
      (await reg.evaluate((el) => { el.focus(); return document.activeElement === el && el.tabIndex === 0; })),
  );

  // ШРИФТОВЕТЕ — това счупи веднъж целия сайт.
  await p.goto(`${B}/bg/kurse`, { waitUntil: "networkidle" });
  const h1 = await p.evaluate(() => getComputedStyle(document.querySelector("h1")).fontFamily);
  const body = await p.evaluate(() => getComputedStyle(document.body).fontFamily);
  ok("заглавията са Oswald, не Times", /Oswald/i.test(h1), h1.slice(0,40));
  ok("текстът е Inter, не Times", /Inter/i.test(body), body.slice(0,40));
} finally { await b.close(); }
console.log(`\n${out.filter(Boolean).length}/${out.length} минават`);
