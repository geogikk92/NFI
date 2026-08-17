// Истинският път през формата: вход → админ → изход.
//
// Срещу `next dev`, не `next start`, по една конкретна причина: в продукция
// бисквитката се казва __Host-nfi_session, а браузърът приема такова име
// САМО по https. По http://localhost той мълчаливо я изхвърля и тестът би
// падал по причина, която не съществува на Vercel.

// Пуска се така (Playwright не е зависимост на проекта — ползва се глобално):
//
//   npx next dev --turbopack -p 3130
//   npm run e2e:vhod
//
// Сийднатата база трябва да е налична: паролата долу идва от prisma/seed.ts.

import { chromium } from "playwright";
// Паролата НЕ се преписва: шест проверки имаха свое копие и когато
// сийдът смени стойността, всичките паднаха с „вярна парола не праща
// към /admin" — тоест изглеждаше като счупен вход. (17.08.2026.)
import { DEV_PASSWORD } from "./_harness.mjs";

const BASE = process.env.E2E_BASE_URL ?? process.env.BASE ?? "http://localhost:3130";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

try {
  // ── 1. Админът е затворен за анонимен ──
  const anon = await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  const anonBody = await page.textContent("body");
  check(
    "анонимен на /admin не вижда панела",
    !anonBody.includes("Заявки за обаждане") && anon.status() === 404,
    `HTTP ${anon.status()}`,
  );

  // ── 2. Вход с ГРЕШНА парола ──
  await page.goto(`${BASE}/bg/anmelden`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "admin@nfi.local");
  await page.fill('input[name="password"]', "greshna-parola-123");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  const afterWrong = await page.textContent("body");
  check(
    "грешна парола НЕ влиза",
    page.url().includes("anmelden"),
    page.url().replace(BASE, ""),
  );
  check(
    "съобщението не издава дали профилът съществува",
    afterWrong.includes("не съвпадат") || afterWrong.includes("Опитай пак"),
  );

  const cookiesAfterWrong = await ctx.cookies();
  check(
    "при грешна парола НЕ се дава сесийна бисквитка",
    !cookiesAfterWrong.some((c) => c.name.includes("nfi_session")),
  );

  // ── 3. Вход с ВЯРНА парола ──
  await page.fill('input[name="email"]', "admin@nfi.local");
  await page.fill('input[name="password"]', DEV_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  check("вярна парола праща към /admin", page.url().includes("/admin"), page.url().replace(BASE, ""));

  const cookies = await ctx.cookies();
  const session = cookies.find((c) => c.name.includes("nfi_session"));
  check("сесийна бисквитка е зададена", Boolean(session), session?.name ?? "липсва");
  check("бисквитката е httpOnly", session?.httpOnly === true);
  check("бисквитката е sameSite=Lax", session?.sameSite === "Lax", String(session?.sameSite));
  check("бисквитката е на path=/", session?.path === "/", String(session?.path));

  // ── 4. Панелът работи и показва лични данни ──
  const adminStatus = (
    await page.goto(`${BASE}/admin/anketi`, { waitUntil: "domcontentloaded" })
  ).status();
  const adminBody = await page.textContent("body");
  // Търси се СЪДЪРЖАНИЕ на панела, не отсъствие на низа „404" — той се
  // среща случайно в 45 KB HTML и прави проверката фалшиво отрицателна.
  check(
    "админът вижда екрана със заявките",
    adminStatus === 200 && adminBody.includes("Заявки за обаждане") && adminBody.includes("Изход"),
    `HTTP ${adminStatus}`,
  );

  // ── 5. Изход ──
  await page.click('button:has-text("Изход")');
  await page.waitForTimeout(2500);

  const afterOut = await ctx.cookies();
  const stillThere = afterOut.find((c) => c.name.includes("nfi_session"));
  check(
    "изходът маха бисквитката",
    !stillThere || stillThere.value === "",
    stillThere ? `остана: ${stillThere.value.slice(0, 12)}…` : "махната",
  );

  const back = await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  check("след изход /admin пак е затворен", back.status() === 404, `HTTP ${back.status()}`);

  // ── 6. Сесията НЕ работи повторно (редът в базата е изтрит) ──
  if (session) {
    const ctx2 = await browser.newContext();
    await ctx2.addCookies([{ ...session, value: session.value }]);
    const p2 = await ctx2.newPage();
    const replay = await p2.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    check(
      "старата бисквитка НЕ влиза пак след изход",
      replay.status() === 404,
      `HTTP ${replay.status()}`,
    );
    await ctx2.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} минават`);
process.exit(failed.length === 0 ? 0 : 1);
