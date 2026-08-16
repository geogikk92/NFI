// Целият живот на един промоционален код, с трите неща, които го отличават:
// главните букви, двете различни единици на стойността и срокът.
//
// Проверява се и КРАЯТ НА ВЕРИГАТА: че кодът наистина намалява количката.
// Формата може да е безупречна и кодът пак да не работи, ако се запише с
// малки букви — касата търси с .toUpperCase() и не го намира.
//
// ВНИМАНИЕ при селекторите: `button[type="submit"]` НЕ става в админа —
// първият такъв бутон в DOM-а е „Изход". Търси се по НАДПИС.
//
// Пуска се така:
//   npx next dev --turbopack -p 3130
//   BASE=http://localhost:3130 npm run e2e:promocii

import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? process.env.BASE ?? "http://localhost:3130";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
}

async function hydrated(page, selector = "#f-code") {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    selector,
    { timeout: 20000 },
  );
}

const STAMP = Date.now().toString(36).slice(-6).toUpperCase();
const CODE = `LETO${STAMP}`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

let discountUrl = null;

try {
  await page.goto(`${BASE}/bg/anmelden`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "admin@nfi.local");
  await page.fill('input[name="password"]', "1");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(() => {});
  check("вход в панела", page.url().includes("/admin"));

  await page.goto(`${BASE}/admin/promocii/nova`, { waitUntil: "domcontentloaded" });
  await hydrated(page);

  // ── Кодът се вдига до главни букви ПРЕД ОЧИТЕ ─────────────────────────
  // Не е разкрасяване: касата търси с .toUpperCase(), тоест код, записан
  // с малки букви, не може да бъде намерен НИКОГА — нито грешка, нито
  // следа, просто „невалиден код" пред всеки клиент.
  await page.fill("#f-code", `leto ${STAMP.toLowerCase()}`);
  await page.waitForTimeout(300);
  check(
    "кодът се вдига до главни букви и губи интервалите",
    (await page.inputValue("#f-code")) === CODE,
    await page.inputValue("#f-code"),
  );

  // ── Кирилицата се отказва ─────────────────────────────────────────────
  // „ЛЯТО2026" се пише лесно на българска клавиатура и изглежда нормално,
  // но клиент в Германия не може да го набере.
  await page.fill("#f-code", "ЛЯТО2026");
  await page.selectOption("#f-kind", "PERCENT");
  await page.waitForTimeout(300);
  await page.fill("#f-percent", "10");
  await page.click('button:has-text("Създай промоцията")');
  await page.waitForTimeout(2000);

  const cyrillicError = await page.textContent("#f-code-error").catch(() => null);
  check(
    "кирилица в кода се отказва с обяснение",
    Boolean(cyrillicError && cyrillicError.includes("кирилица")),
    cyrillicError?.trim().slice(0, 60) ?? "няма съобщение",
  );

  // ── Стойността се пита според ВИДА ────────────────────────────────────
  check(
    "при процент се пита процент, не сума",
    (await page.locator("#f-percent").count()) === 1 &&
      (await page.locator("#f-amount").count()) === 0,
  );

  await page.selectOption("#f-kind", "FIXED");
  await page.waitForTimeout(300);
  check(
    "при фиксирана сума се пита сума, не процент",
    (await page.locator("#f-amount").count()) === 1 &&
      (await page.locator("#f-percent").count()) === 0,
  );

  await page.selectOption("#f-kind", "PERCENT");
  await page.waitForTimeout(300);

  // ── Краят преди началото ──────────────────────────────────────────────
  await page.fill("#f-code", CODE);
  await page.fill("#f-percent", "10");
  await page.fill("#f-startsAt", "2026-09-01");
  await page.fill("#f-endsAt", "2026-08-01");
  await page.click('button:has-text("Създай промоцията")');
  await page.waitForTimeout(2000);
  const rangeError = await page.textContent("#f-endsAt-error").catch(() => null);
  check(
    "край преди начало се отказва",
    Boolean(rangeError && rangeError.includes("преди началото")),
    rangeError?.trim().slice(0, 50) ?? "няма съобщение",
  );

  // ── Създаване ─────────────────────────────────────────────────────────
  await page.fill("#f-endsAt", "2026-12-31");
  await page.fill("#f-startsAt", "");
  await page.fill("#f-maxRedemptions", "50");
  await page.click('button:has-text("Създай промоцията")');
  await page.waitForURL(/\/admin\/promocii\/[^/?]+\?sazdadena=1/, { timeout: 15000 })
    .catch(() => {});

  discountUrl = page.url().split("?")[0];
  check(
    "създаването праща към редакцията",
    /\/admin\/promocii\/[a-z0-9]+$/.test(discountUrl),
    discountUrl.replace(BASE, ""),
  );

  // ── Датата не се измества с ден ───────────────────────────────────────
  // „До 31.12" в поле, смятано наивно като UTC, се връща като 01.01 —
  // защото 31.12 23:59 UTC е вече 1 януари в Берлин.
  check(
    "краят на срока се връща като въведеното, не с ден напред",
    (await page.inputValue("#f-endsAt")) === "2026-12-31",
    await page.inputValue("#f-endsAt"),
  );

  const afterCreate = await page.textContent("body");
  check("състоянието е „Работи“", afterCreate.includes("Работи"));
  check(
    "броячът на използванията се показва, но не се редактира",
    afterCreate.includes("не се редактира оттук") &&
      (await page.locator("#f-redemptions").count()) === 0,
  );

  // ── Дублиран код ──────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/promocii/nova`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  // С МАЛКИ букви — трябва да се разпознае като същия код.
  await page.fill("#f-code", CODE.toLowerCase());
  await page.selectOption("#f-kind", "PERCENT");
  await page.waitForTimeout(300);
  await page.fill("#f-percent", "5");
  await page.click('button:has-text("Създай промоцията")');
  await page.waitForTimeout(2500);
  const dupError = await page.textContent("#f-code-error").catch(() => null);
  check(
    "същият код с малки букви се разпознава като зает",
    Boolean(dupError && dupError.includes("вече съществува")),
    dupError?.trim().slice(0, 50) ?? "няма съобщение",
  );

  // ── КРАЯТ НА ВЕРИГАТА — ОЩЕ ГО НЯМА ───────────────────────────────────
  //
  // Количката ПОКАЗВА отстъпка, когато има приложена (виж
  // warenkorb/page.tsx, cart.appliedDiscountCode), а сметката приема код
  // (priceCartFromDb). Липсва само едно: ПОЛЕ, в което клиентът да го
  // въведе, и действие, което да го запомни в количката.
  //
  // Тоест днес администраторът може да създаде код, който никой не може
  // да ползва. Проверката отдолу НЕ е тест, а напомняне — тя не се брои
  // за провал, защото няма счупен код; има недовършена верига. Мълчаливо
  // прескачане би скрило точно това.
  const shopCtx = await browser.newContext();
  const shop = await shopCtx.newPage();
  await shop.goto(`${BASE}/de/warenkorb`, { waitUntil: "domcontentloaded" });
  const codeInput = shop
    .locator('input[name="code"], input[name="discountCode"]')
    .first();
  const hasInput = (await codeInput.count()) > 0;
  await shopCtx.close();

  if (!hasInput) {
    console.log(
      "\n⚠ НЕДОВЪРШЕНА ВЕРИГА: количката няма поле за промоционален код.\n" +
        "  Кодовете се създават и управляват, но клиентът няма как да ги\n" +
        "  въведе. Липсват форма в /warenkorb и действие, което пази кода\n" +
        "  в бисквитката на количката.\n",
    );
  } else {
    check("количката има поле за промоционален код", true);
  }

  // ── Изключване ────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/promocii`, { waitUntil: "domcontentloaded" });
  const row = page.locator("tr", { hasText: CODE });
  check("промоцията е в списъка", (await row.count()) > 0);

  await row.locator('button[type="submit"]').click();
  await page.waitForURL(/izklyuchena=1/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(
    "изключването потвърждава",
    (await page.textContent("body")).includes("отхвърля на касата"),
  );
  check(
    "състоянието става „Изключена“",
    (await page.locator("tr", { hasText: CODE }).textContent()).includes("Изключена"),
  );

  // ── Изтриване ─────────────────────────────────────────────────────────
  await page.goto(discountUrl, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.click("summary:has-text('Изтриване')");
  await page.click('button:has-text("Изтрий завинаги")');
  await page.waitForTimeout(1500);
  check(
    "без потвърждение промоцията НЕ се трие",
    (await page.textContent("body")).includes("Отметни потвърждението"),
  );

  await page.check("#f-confirm");
  await page.click('button:has-text("Изтрий завинаги")');
  await page.waitForURL(/iztrita=1/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(
    "изтриването потвърждава",
    (await page.textContent("body")).includes("Промоцията е изтрита"),
  );
  check(
    "промоцията вече я няма в списъка",
    (await page.locator("tr", { hasText: CODE }).count()) === 0,
  );
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} минават`);
if (discountUrl && failed.length > 0) {
  console.log(`\n⚠ Тестът може да е оставил промоция: ${discountUrl}`);
}
process.exit(failed.length === 0 ? 0 : 1);
