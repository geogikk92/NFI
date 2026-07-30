// Език на документа и на правните страници + шрифтовете.
//
//   npx next dev --turbopack -p 3130
//   npm run e2e:ezik
//
// Шрифтовете се проверяват ТУК, защото app/layout.tsx е замразен и вече
// веднъж падна на Times, без нито една грешка в конзолата. Всяка промяна
// в него минава през този тест.

import { chromium } from "playwright";
const B = process.env.BASE ?? "http://localhost:3130";
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

  // ШРИФТОВЕТЕ — това счупи веднъж целия сайт.
  await p.goto(`${B}/bg/kurse`, { waitUntil: "networkidle" });
  const h1 = await p.evaluate(() => getComputedStyle(document.querySelector("h1")).fontFamily);
  const body = await p.evaluate(() => getComputedStyle(document.body).fontFamily);
  ok("заглавията са Oswald, не Times", /Oswald/i.test(h1), h1.slice(0,40));
  ok("текстът е Inter, не Times", /Inter/i.test(body), body.slice(0,40));
} finally { await b.close(); }
console.log(`\n${out.filter(Boolean).length}/${out.length} минават`);
