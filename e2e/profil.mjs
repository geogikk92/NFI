// Страницата на влезлия човек, на трите езика.
//
//   npx next dev --turbopack -p 3130
//   npm run e2e:profil

import { chromium } from "playwright";
const B = process.env.E2E_BASE_URL ?? process.env.BASE ?? "http://localhost:3130";
const out = [];
const ok = (n,v,d="") => { out.push(v); console.log(`${v?"✓":"✗"} ${n}${d?"  — "+d:""}`); };
const b = await chromium.launch(); const c = await b.newContext(); const p = await c.newPage();
try {
  // Анонимен → пренасочване към входа, НЕ 404.
  await p.goto(`${B}/bg/profil`, { waitUntil: "domcontentloaded" });
  ok("анонимен се праща към входа", p.url().includes("anmelden"), p.url().replace(B,""));

  await p.fill('input[name="email"]', "student@nfi.local");
  await p.fill('input[name="password"]', "1");
  await p.click('button[type="submit"]');
  await p.waitForTimeout(3000);

  const r = await p.goto(`${B}/bg/profil`, { waitUntil: "domcontentloaded" });
  const body = (await p.textContent("body")).replace(/\s+/g," ");
  ok("влезлият вижда профила", r.status() === 200, `HTTP ${r.status()}`);
  ok("показва имейла му", body.includes("student@nfi.local"));
  ok("показва името му", body.includes("Max Mustermann"));
  ok("има раздел за съгласия", body.includes("Твоите съгласия"));
  ok("има раздел за правата (чл. 15)", body.includes("Твоите права"));
  ok("НЕ показва измислени раздели", !body.includes("Моите поръчки") && !body.includes("Моите курсове"));
  ok("страницата е noindex", (await p.getAttribute('meta[name="robots"]', "content") ?? "").includes("noindex"));

  // Немски и английски
  const de = await p.goto(`${B}/de/profil`, { waitUntil: "domcontentloaded" });
  ok("немската версия работи", de.status() === 200 && (await p.textContent("body")).includes("Mein Konto"));
  const en = await p.goto(`${B}/en/profil`, { waitUntil: "domcontentloaded" });
  ok("английската версия работи", en.status() === 200 && (await p.textContent("body")).includes("My account"));

  // Изход от профила
  await p.goto(`${B}/bg/profil`, { waitUntil: "domcontentloaded" });
  await p.click('form button:has-text("Изход")');
  await p.waitForTimeout(2500);
  await p.goto(`${B}/bg/profil`, { waitUntil: "domcontentloaded" });
  ok("след изход пак праща към входа", p.url().includes("anmelden"), p.url().replace(B,""));
} finally { await b.close(); }
console.log(`\n${out.filter(Boolean).length}/${out.length} минават`);
