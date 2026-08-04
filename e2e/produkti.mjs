// Целият живот на един продукт през админа, с трите неща, които курсовете
// нямат: ДДС категория, типографска корица и наличност.
//
// ВНИМАНИЕ при селекторите: `button[type="submit"]` НЕ става в админа —
// първият такъв бутон в DOM-а е „Изход" в страничната лента. Бутоните се
// търсят по НАДПИС.
//
// Пуска се така:
//   npx next dev --turbopack -p 3130
//   BASE=http://localhost:3130 npm run e2e:produkti

import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? process.env.BASE ?? "http://localhost:3130";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
}

/** Изчаква React да е поел формата — виж обяснението в e2e/kursove.mjs. */
async function hydrated(page, selector = "#f-slug") {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    selector,
    { timeout: 20000 },
  );
}

const STAMP = Date.now().toString(36).slice(-6);
const TITLE_BG = `Тестова тетрадка ${STAMP}`;
const TITLE_DE = `Arbeitsheft für Prüfung ${STAMP}`;
const EXPECTED_SLUG = `arbeitsheft-fuer-pruefung-${STAMP}`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

let productUrl = null;

try {
  // ── Вход ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/bg/anmelden`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "admin@nfi.local");
  await page.fill('input[name="password"]', "nfi-lokalna-parola");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(() => {});
  check("вход в панела", page.url().includes("/admin"));

  // ── Формата ───────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/produkti/nov`, { waitUntil: "domcontentloaded" });
  await hydrated(page);

  await page.fill("#f-title", TITLE_BG);
  await page.fill("#f-titleDe", TITLE_DE);
  check(
    "адресът се предлага от немското заглавие",
    (await page.inputValue("#f-slug")) === EXPECTED_SLUG,
    await page.inputValue("#f-slug"),
  );

  // ── Тегло и наличност се появяват само за физическите ─────────────────
  // НЕ се посивяват, а изчезват: празно поле „Тегло" върху PDF е въпрос
  // без отговор.
  check(
    "преди избор на вид полетата за доставка ги няма",
    (await page.locator("#f-weightGrams").count()) === 0,
  );

  await page.selectOption("#f-type", "DIGITAL");
  await page.waitForTimeout(300);
  check(
    "дигиталният продукт НЕ пита за тегло и наличност",
    (await page.locator("#f-weightGrams").count()) === 0 &&
      (await page.locator("#f-stock").count()) === 0,
  );

  await page.selectOption("#f-type", "PHYSICAL");
  await page.waitForTimeout(300);
  check(
    "физическият продукт пита за тегло и наличност",
    (await page.locator("#f-weightGrams").count()) === 1 &&
      (await page.locator("#f-stock").count()) === 1,
  );

  // ── Корицата се вижда, докато се пише ─────────────────────────────────
  await page.fill("#f-coverTitle", "Präpositionen");
  await page.fill("#f-coverMeta", "500 Verben · A2–B2");
  await page.selectOption("#f-coverColor", "RED");
  await page.waitForTimeout(400);

  const cover = page.locator(".cover");
  check(
    "корицата се рисува, докато се пише",
    (await cover.textContent()).includes("Präpositionen") &&
      (await cover.textContent()).includes("500 Verben"),
  );
  check(
    "цветът на корицата се сменя веднага",
    (await cover.getAttribute("class")).includes("cover-red"),
    await cover.getAttribute("class"),
  );

  // ── ДДС категорията НЕ следва вида ────────────────────────────────────
  // Физическо + електронна услуга е противоречие: електронната услуга е
  // такава, защото се доставя без пратка. Сгрешено тук, ДДС третирането
  // тръгва по OSS и се вижда чак пред счетоводителя.
  await page.selectOption("#f-vatCategory", "ELECTRONIC");
  await page.fill("#f-price", "12,90");
  await page.fill("#f-weightGrams", "250");
  await page.fill("#f-stock", "40");
  await page.click('button:has-text("Създай продукта")');
  await page.waitForTimeout(2000);

  const vatError = await page.textContent("#f-vatCategory-error").catch(() => null);
  check(
    "физическо + електронна услуга се отказва",
    Boolean(vatError && vatError.includes("не може да е електронна услуга")),
    vatError?.trim().slice(0, 60) ?? "няма съобщение",
  );
  check(
    "корицата НЕ се губи при грешка",
    (await page.inputValue("#f-coverTitle")) === "Präpositionen",
  );
  check(
    "видът НЕ се нулира при грешка",
    (await page.inputValue("#f-type")) === "PHYSICAL",
    (await page.inputValue("#f-type")) || "празно",
  );

  // ── Липсваща цена ─────────────────────────────────────────────────────
  // За разлика от курса, цената на продукта е ЗАДЪЛЖИТЕЛНА: колоната е
  // NOT NULL и продукт без цена не може да влезе в количка.
  await page.selectOption("#f-vatCategory", "GOODS");
  await page.fill("#f-price", "");
  await page.click('button:has-text("Създай продукта")');
  await page.waitForTimeout(2000);
  const priceError = await page.textContent("#f-price-error").catch(() => null);
  check(
    "продукт без цена не се създава",
    Boolean(priceError && priceError.includes("задължително")),
    priceError?.trim().slice(0, 50) ?? "няма съобщение",
  );

  // ── Създаване ─────────────────────────────────────────────────────────
  await page.fill("#f-price", "12,90");
  await page.click('button:has-text("Създай продукта")');
  await page.waitForURL(/\/admin\/produkti\/[^/?]+\?sazdaden=1/, { timeout: 15000 })
    .catch(() => {});

  productUrl = page.url().split("?")[0];
  check(
    "създаването праща към редакцията на новия продукт",
    /\/admin\/produkti\/[a-z0-9]+$/.test(productUrl),
    productUrl.replace(BASE, ""),
  );
  check(
    "цената се връща във формата като „12,90“",
    (await page.inputValue("#f-price")) === "12,90",
    await page.inputValue("#f-price"),
  );

  // ── Спреният продукт НЕ се вижда в магазина ───────────────────────────
  await page.goto(`${BASE}/de/shop`, { waitUntil: "domcontentloaded" });
  check(
    "непубликуваният продукт НЕ е в магазина",
    !(await page.textContent("body")).includes(TITLE_DE),
  );
  const direct = await page.goto(`${BASE}/de/shop/${EXPECTED_SLUG}`, {
    waitUntil: "domcontentloaded",
  });
  check(
    "непубликуваният продукт дава 404 на пряк адрес",
    direct.status() === 404,
    `HTTP ${direct.status()}`,
  );

  // ── Пускане в продажба ────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/produkti`, { waitUntil: "domcontentloaded" });
  const row = page.locator("tr", { hasText: TITLE_BG });
  check("продуктът е в списъка на панела", (await row.count()) > 0);

  const cells = await row.locator("td").allTextContents();
  check(
    "наличността се вижда в списъка",
    cells.some((cell) => cell.includes("40")),
    cells.join(" | "),
  );

  await row.locator('button[type="submit"]').click();
  await page.waitForURL(/publikuvan=1/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(
    "пускането потвърждава",
    (await page.textContent("body")).includes("вече се продава"),
  );

  // ── В магазина, ВЕДНАГА, с цена ───────────────────────────────────────
  // За разлика от курсовете, тук цената СЕ показва: продуктът се купува
  // онлайн, значи PAngV изисква цена.
  await page.goto(`${BASE}/de/shop`, { waitUntil: "domcontentloaded" });
  const shop = await page.textContent("body");
  check("продуктът се появява в магазина без изчакване", shop.includes(TITLE_DE));
  check("цената е немски форматирана", shop.includes("12,90"));

  // Корицата се рисува в СПИСЪКА на магазина. Детайлната страница нарочно
  // няма такава — там мокъпът показва заглавие и цена, не корица.
  const shopCover = page
    .locator("li", { hasText: TITLE_DE })
    .locator(".cover")
    .first();
  check(
    "корицата в магазина е същата, която показа формата",
    (await shopCover.getAttribute("class")).includes("cover-red") &&
      (await shopCover.textContent()).includes("Präpositionen"),
    await shopCover.getAttribute("class"),
  );

  const detail = await page.goto(`${BASE}/de/shop/${EXPECTED_SLUG}`, {
    waitUntil: "domcontentloaded",
  });
  check(
    "страницата на продукта се отваря",
    detail.status() === 200,
    `HTTP ${detail.status()}`,
  );

  // ── Смяна на вида нулира тегло и наличност ────────────────────────────
  // Оставени върху дигитален продукт, те влизат в сметката за доставка и
  // клиентът плаща пратка за файл.
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.selectOption("#f-type", "DIGITAL");
  await page.selectOption("#f-vatCategory", "ELECTRONIC");
  await page.waitForTimeout(300);
  await page.click('button:has-text("Запази промените")');
  await page.waitForTimeout(2000);
  check(
    "смяната към дигитален минава",
    (await page.textContent("body")).includes("Промените са записани"),
  );
  // Потвърждението трябва да стои над ЗАПИСАНОТО. Без обезсилване формата
  // се връща към данните отпреди записа и надписът изглежда като лъжа.
  check(
    "полето показва ЗАПИСАНИЯ вид, не стария",
    (await page.inputValue("#f-type")) === "DIGITAL",
    (await page.inputValue("#f-type")) || "празно",
  );

  await page.goto(`${BASE}/admin/produkti`, { waitUntil: "domcontentloaded" });
  const after = await page.locator("tr", { hasText: TITLE_BG }).locator("td").allTextContents();
  check(
    "дигиталният продукт вече няма наличност",
    !after.some((cell) => cell.trim() === "40"),
    after.join(" | "),
  );

  // ── Спиране и изтриване ───────────────────────────────────────────────
  await page.locator("tr", { hasText: TITLE_BG }).locator('button[type="submit"]').click();
  await page.waitForURL(/skrit=1/, { timeout: 15000 }).catch(() => {});
  const hidden = await page.goto(`${BASE}/de/shop/${EXPECTED_SLUG}`, {
    waitUntil: "domcontentloaded",
  });
  check("спреният продукт пак дава 404", hidden.status() === 404, `HTTP ${hidden.status()}`);

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.click("summary:has-text('Изтриване')");
  await page.click('button:has-text("Изтрий завинаги")');
  await page.waitForTimeout(1500);
  check(
    "без потвърждение продуктът НЕ се трие",
    (await page.textContent("body")).includes("Отметни потвърждението"),
  );

  await page.check("#f-confirm");
  await page.click('button:has-text("Изтрий завинаги")');
  await page.waitForURL(/iztrit=1/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(
    "изтриването потвърждава",
    (await page.textContent("body")).includes("Продуктът е изтрит"),
  );
  // ПО РЕДОВЕ, не по текста на страницата: `textContent("body")` чете и
  // <script>, а RSC пратката още носи заглавието.
  check(
    "продуктът вече го няма в списъка",
    (await page.locator("tr", { hasText: TITLE_BG }).count()) === 0,
  );
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} минават`);
if (productUrl && failed.length > 0) {
  console.log(`\n⚠ Тестът може да е оставил продукт: ${productUrl}`);
}
process.exit(failed.length === 0 ? 0 : 1);
