// Регистрация → вход → разделение на ролите.
//
//   npx next dev --turbopack -p 3130
//   npm run e2e:registraciya
//
// Създава ИСТИНСКИ профил в базата при всяко пускане (имейлът носи
// времеви печат). Срещу база за разработка, не срещу продукционна.
// Чистене: изтрий редовете с имейл, започващ с „e2e-".

import { chromium } from "playwright";
const B = "http://localhost:3130";
const EMAIL = `e2e-${Date.now()}@primer.bg`;
const PASS = "MnogoSilnaParola2026!";
const out = [];
const ok = (n, v, d="") => { out.push(v); console.log(`${v?"✓":"✗"} ${n}${d?"  — "+d:""}`); };

const b = await chromium.launch(); const c = await b.newContext(); const p = await c.newPage();
try {
  await p.goto(`${B}/bg/registrieren`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="name"]', "Е2Е Тестов");
  await p.fill('input[name="email"]', EMAIL);
  await p.fill('input[name="password"]', PASS);
  await p.fill('input[name="passwordConfirm"]', PASS);
  await p.check('input[name="acceptTerms"]');
  await p.check('input[name="acceptPrivacy"]');
  await p.click('button[type="submit"]');
  await p.waitForTimeout(3500);

  const body = (await p.textContent("body")).replace(/\s+/g," ");
  ok("регистрацията успява", body.includes("Профилът е готов") || body.includes("Профилът е създаден"),
     body.slice(0,90));
  ok("НЕ обещава писмо, което не се праща",
     !body.includes("Провери пощата") && !body.includes("Изпратихме ти линк"));

  // Сега влизаме с новия профил.
  await p.goto(`${B}/bg/anmelden`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="email"]', EMAIL);
  await p.fill('input[name="password"]', PASS);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(3000);

  ok("новорегистрираният ВЛИЗА", !p.url().includes("anmelden"), p.url().replace(B,""));
  const cookies = await c.cookies();
  ok("получава сесия", cookies.some(x => x.name.includes("nfi_session")));

  const nav = (await p.textContent("body")).replace(/\s+/g," ");
  ok("хедърът показва името му", nav.includes("Е2Е Тестов"));
  ok("НЯМА връзка към админа", !nav.includes("Администрация"));

  // Студент не влиза в админа.
  const r = await p.goto(`${B}/admin`, { waitUntil: "domcontentloaded" });
  ok("студент на /admin получава 404", r.status() === 404, `HTTP ${r.status()}`);
} finally { await b.close(); }
console.log(`\n${out.filter(Boolean).length}/${out.length} минават`);
console.log("СЪЗДАДЕН ПРОФИЛ:", EMAIL);
