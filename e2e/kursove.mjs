// Целият живот на един курс през админа: създаване → публикуване →
// редакция → изтриване, с проверка какво вижда ПОСЕТИТЕЛЯТ на всяка стъпка.
//
// Тестът е тук, а не като unit тест, защото проверява точно нещата, които
// unit тест не може:
//
//   • че промяна в панела стига до публичната страница БЕЗ да се изчаква
//     кеш — публичните страници са динамични (SiteShell чете бисквитки) и
//     това е измерено, а не предположено. Падне ли този тест, значи някой
//     е направил /kurse статична и цените са замръзнали;
//   • че непубликуваният курс наистина не се вижда отвън;
//   • че формата връща грешка по ПОЛЕТО, а не бяла страница.
//
// Пуска се така:
//   npx next dev --turbopack -p 3130
//   BASE=http://localhost:3130 npm run e2e:kursove

// ВНИМАНИЕ при селекторите: `button[type="submit"]` НЕ става в админа —
// първият такъв бутон в DOM-а е „Изход" в страничната лента (виж
// app/admin/layout.tsx). Тестът се разлогваше вместо да изпрати формата, а
// после обвиняваше проверката на цената. Затова бутоните се търсят по НАДПИС.

import { chromium } from "playwright";

const BASE = process.env.E2E_BASE_URL ?? process.env.BASE ?? "http://localhost:3130";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
}

/**
 * Изчаква React да е поел формата.
 *
 * Без това тестът пише в полетата, докато страницата е още само HTML — и
 * после проверява поведение, което зависи от JavaScript. Предложението за
 * адрес не се появява, тестът пада и обвинява кода вместо себе си. Точно
 * това стана при първото пускане.
 *
 * Признакът е вътрешният ключ, който React закача на всеки DOM възел при
 * хидратация. По-надежден е от изчакване на време: на бавна машина
 * фиксираното изчакване е ту излишно дълго, ту недостатъчно.
 */
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

// Уникално на всяко пускане: тестът трие след себе си, но падне ли по
// средата, следващото пускане не бива да се блъска в остатъка.
const STAMP = Date.now().toString(36).slice(-6);
const TITLE_BG = `Тестов курс ${STAMP}`;
const TITLE_DE = `Testkurs für Prüfung ${STAMP}`;
const EXPECTED_SLUG = `testkurs-fuer-pruefung-${STAMP}`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

let courseUrl = null;

try {
  // ── Вход ──────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/bg/anmelden`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "admin@nfi.local");
  await page.fill('input[name="password"]', "1");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(() => {});
  check("вход в панела", page.url().includes("/admin"), page.url().replace(BASE, ""));

  // ── Създаване ─────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/kursove/nov`, { waitUntil: "domcontentloaded" });
  await hydrated(page);

  await page.fill("#f-title", TITLE_BG);
  await page.fill("#f-titleDe", TITLE_DE);

  // Адресът се предлага сам от НЕМСКОТО заглавие, с „ü" → „ue".
  const suggested = await page.inputValue("#f-slug");
  check(
    "адресът се предлага от немското заглавие",
    suggested === EXPECTED_SLUG,
    suggested,
  );

  await page.selectOption("#f-level", "B2");
  await page.selectOption("#f-format", "ONLINE");

  // Обикновено текстово поле, БЕЗ вътрешно състояние — то проверява друг
  // път на оцеляване от заглавието и адреса.
  await page.fill("#f-summary", "Кратко описание за проверка");

  // ── Грешна цена НЕ минава ─────────────────────────────────────────────
  await page.fill("#f-price", "1.299,50");
  await page.click('button:has-text("Създай курса")');
  await page.waitForTimeout(1500);

  const priceError = await page.textContent("#f-price-error").catch(() => null);
  check(
    "разделител за хиляди дава грешка ПО ПОЛЕТО",
    Boolean(priceError && priceError.includes("хиляди")),
    priceError?.trim().slice(0, 60) ?? "няма съобщение",
  );

  // ЦЯЛАТА форма трябва да преживее грешката. Четирите вида поле оцеляват
  // по РАЗЛИЧНИ пътища и затова се проверяват поотделно:
  //   • заглавието и адресът — през състояние в компонента на формата;
  //   • краткото описание — през `values`, върнати от сървъра;
  //   • менюто — през собственото си състояние (виж fields.tsx).
  // Менютата паднаха точно тук при първото пускане и това беше истински
  // дефект: човек поправя цената и получава две нови грешки.
  check(
    "заглавието НЕ се губи при грешка",
    (await page.inputValue("#f-title")) === TITLE_BG,
  );
  check(
    "адресът НЕ се губи при грешка",
    (await page.inputValue("#f-slug")) === EXPECTED_SLUG,
    await page.inputValue("#f-slug"),
  );
  check(
    "обикновеното текстово поле НЕ се губи при грешка",
    (await page.inputValue("#f-summary")) === "Кратко описание за проверка",
    await page.inputValue("#f-summary"),
  );
  check(
    "падащото меню „Ниво“ НЕ се нулира при грешка",
    (await page.inputValue("#f-level")) === "B2",
    (await page.inputValue("#f-level")) || "празно",
  );
  check(
    "падащото меню „Формат“ НЕ се нулира при грешка",
    (await page.inputValue("#f-format")) === "ONLINE",
    (await page.inputValue("#f-format")) || "празно",
  );

  // ── Правилна цена ─────────────────────────────────────────────────────
  await page.fill("#f-price", "1299,50");
  await page.fill("#f-durationWeeks", "12");
  await page.click('button:has-text("Създай курса")');
  await page.waitForURL(/\/admin\/kursove\/[^/?]+\?sazdaden=1/, { timeout: 15000 })
    .catch(() => {});

  courseUrl = page.url().split("?")[0];
  check(
    "създаването праща към редакцията на новия курс",
    /\/admin\/kursove\/[a-z0-9]+$/.test(courseUrl),
    courseUrl.replace(BASE, ""),
  );

  const afterCreate = await page.textContent("body");
  check("потвърждението се вижда", afterCreate.includes("Курсът е създаден"));
  check(
    "цената се връща във формата като „1299,50“",
    (await page.inputValue("#f-price")) === "1299,50",
    await page.inputValue("#f-price"),
  );

  // ── Скритият курс НЕ се вижда отвън ───────────────────────────────────
  await page.goto(`${BASE}/de/kurse`, { waitUntil: "domcontentloaded" });
  check(
    "непубликуваният курс НЕ е на публичния списък",
    !(await page.textContent("body")).includes(TITLE_DE),
  );

  const direct = await page.goto(`${BASE}/de/kurse/${EXPECTED_SLUG}`, {
    waitUntil: "domcontentloaded",
  });
  check(
    "непубликуваният курс дава 404 и на пряк адрес",
    direct.status() === 404,
    `HTTP ${direct.status()}`,
  );

  // ── Дублиран адрес ────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/kursove/nov`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.fill("#f-title", "Друг курс");
  await page.fill("#f-slug", EXPECTED_SLUG);
  await page.selectOption("#f-level", "A1");
  await page.selectOption("#f-format", "ONLINE");
  await page.click('button:has-text("Създай курса")');
  await page.waitForTimeout(2000);

  const slugError = await page.textContent("#f-slug-error").catch(() => null);
  check(
    "зает адрес дава грешка ПО ПОЛЕТО, не бяла страница",
    Boolean(slugError && slugError.includes("вече се ползва")),
    slugError?.trim().slice(0, 60) ?? "няма съобщение",
  );

  // ── Публикуване от списъка ────────────────────────────────────────────
  await page.goto(`${BASE}/admin/kursove`, { waitUntil: "domcontentloaded" });
  const row = page.locator("tr", { hasText: TITLE_BG });
  check("курсът е в списъка на панела", (await row.count()) > 0);

  // Таблицата се превърта настрани. Област, която се превърта, но до която
  // не се стига с Tab, е недостъпна за човек без мишка — WCAG 2.1.1.
  const region = page.locator('[role="region"][aria-label="Курсове"]');
  check(
    "превъртащата се таблица е спирка на Tab и има име",
    (await region.count()) === 1 &&
      (await region.evaluate((el) => el.tabIndex)) === 0,
  );
  check(
    "и наистина приема фокус",
    await region.evaluate((el) => {
      el.focus();
      return document.activeElement === el;
    }),
  );

  await row.locator('button[type="submit"]').click();
  await page.waitForURL(/publikuvan=1/, { timeout: 15000 }).catch(() => {});
  // Изчакването е СЛЕД смяната на адреса: пренасочването сменя адреса
  // преди новата страница да е нарисувана, а проверката чете съдържание.
  await page.waitForTimeout(1200);
  check(
    "публикуването потвърждава",
    (await page.textContent("body")).includes("вече се вижда на сайта"),
  );
  // Цената в АДМИНА се форматира на български — „1299,50 €", не немското
  // „1.299,50 €". Проверява се в клетките на реда, не в целия текст.
  const cells = await row.locator("td").allTextContents();
  check(
    "цената се вижда в списъка на панела",
    cells.some((cell) => cell.includes("1299,50")),
    cells.join(" | "),
  );

  // ── Публикуваният курс се вижда ВЕДНАГА ───────────────────────────────
  // Това е проверката, заради която тестът съществува. Никакво изчакване,
  // никакво презареждане с празен кеш — просто отваряне.
  await page.goto(`${BASE}/de/kurse`, { waitUntil: "domcontentloaded" });
  check(
    "публикуваният курс се появява на /de/kurse без изчакване",
    (await page.textContent("body")).includes(TITLE_DE),
  );

  const detail = await page.goto(`${BASE}/de/kurse/${EXPECTED_SLUG}`, {
    waitUntil: "domcontentloaded",
  });
  const detailBody = await page.textContent("body");
  check(
    "страницата на курса се отваря",
    detail.status() === 200 && detailBody.includes(TITLE_DE),
    `HTTP ${detail.status()}`,
  );
  // Цената на КУРС нарочно НЕ се показва публично: курсът не се купува
  // онлайн, единственото действие е заявка за обаждане, а мокъпът оставя
  // цената за разговора (виж коментара в kurse/[slug]/page.tsx). Затова
  // тук се проверява ОБРАТНОТО — че не е изтекла.
  check(
    "цената на курса НЕ изтича на публичната страница",
    !detailBody.includes("1.299,50") &&
      detailBody.includes("Den Preis erfährst du"),
  );

  // ── Редакция: промяната се вижда веднага ──────────────────────────────
  const TITLE_DE_2 = `${TITLE_DE} · Abendgruppe`;
  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.fill("#f-titleDe", TITLE_DE_2);
  await page.fill("#f-price", "999");
  await page.click('button:has-text("Запази промените")');
  await page.waitForTimeout(2000);
  check(
    "редакцията потвърждава",
    (await page.textContent("body")).includes("Промените са записани"),
  );
  // Съобщението „записано" трябва да стои над ЗАПИСАНОТО. Без обезсилване
  // сървърният компонент не се рисува наново, React нулира формата и я
  // връща към старите стойности — потвърждение, което изглежда като лъжа.
  check(
    "полето показва ЗАПИСАНАТА цена, не старата",
    (await page.inputValue("#f-price")) === "999,00",
    await page.inputValue("#f-price"),
  );
  check(
    "смяната на немското заглавие НЕ пипа адреса",
    (await page.inputValue("#f-slug")) === EXPECTED_SLUG,
    await page.inputValue("#f-slug"),
  );

  await page.goto(`${BASE}/de/kurse/${EXPECTED_SLUG}`, { waitUntil: "domcontentloaded" });
  const edited = await page.textContent("body");
  check(
    "новото заглавие е на сайта веднага",
    edited.includes("Abendgruppe"),
  );

  // ── Скриване ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/kursove`, { waitUntil: "domcontentloaded" });
  await page.locator("tr", { hasText: TITLE_BG }).locator('button[type="submit"]').click();
  await page.waitForURL(/skrit=1/, { timeout: 15000 }).catch(() => {});

  const hidden = await page.goto(`${BASE}/de/kurse/${EXPECTED_SLUG}`, {
    waitUntil: "domcontentloaded",
  });
  check(
    "скритият курс пак дава 404",
    hidden.status() === 404,
    `HTTP ${hidden.status()}`,
  );

  // ── Изтриване ─────────────────────────────────────────────────────────
  await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  await page.click("summary:has-text('Изтриване')");

  // Без отметката не се трие.
  await page.click('button:has-text("Изтрий завинаги")');
  await page.waitForTimeout(1500);
  check(
    "без потвърждение курсът НЕ се трие",
    (await page.textContent("body")).includes("Отметни потвърждението"),
  );

  await page.check("#f-confirm");
  await page.click('button:has-text("Изтрий завинаги")');
  await page.waitForURL(/iztrit=1/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(
    "изтриването потвърждава",
    (await page.textContent("body")).includes("Курсът е изтрит"),
  );
  // ПО РЕДОВЕ, не по текста на цялата страница: `textContent("body")` чете
  // и съдържанието на <script>, а RSC пратката от предишния преход още
  // носи заглавието. Проверката по нея показваше застоял списък, какъвто
  // няма — и ме прати да „поправям" кеш, който работи.
  check(
    "курсът вече го няма в списъка",
    (await page.locator("tr", { hasText: TITLE_BG }).count()) === 0,
  );

  const gone = await page.goto(courseUrl, { waitUntil: "domcontentloaded" });
  check("редакцията на изтрит курс дава 404", gone.status() === 404, `HTTP ${gone.status()}`);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} минават`);
if (courseUrl && failed.length > 0) {
  console.log(`\n⚠ Тестът може да е оставил курс: ${courseUrl}`);
}
process.exit(failed.length === 0 ? 0 : 1);
