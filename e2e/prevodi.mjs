// Заявките за превод в админа.
//
// Различава се от другите три теста по това, че НИЩО НЕ СЪЗДАВА: заявките
// идват от клиента. Работи върху примерните от сийда, затова иска
// `npm run db:seed` преди себе си.
//
// Ударението е върху две неща, които другите екрани нямат:
//   • срокът за изтриване по GDPR — видим и предупреждаващ, когато е
//     просрочен (чл. 5, ал. 1, б. „д");
//   • че бързото действие от списъка НЕ трие вече въведена оферта.
//
// ВНИМАНИЕ при селекторите: `button[type="submit"]` НЕ става в админа —
// първият такъв бутон в DOM-а е „Изход". Търси се по НАДПИС.
//
// Пуска се така:
//   npm run db:seed
//   npx next dev --turbopack -p 3130
//   BASE=http://localhost:3130 npm run e2e:prevodi

import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3130";
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
}

async function hydrated(page, selector = "#f-status") {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    selector,
    { timeout: 20000 },
  );
}

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

try {
  await page.goto(`${BASE}/bg/anmelden`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "admin@nfi.local");
  await page.fill('input[name="password"]', "nfi-lokalna-parola");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 }).catch(() => {});
  check("вход в панела", page.url().includes("/admin"));

  // ── Списъкът ──────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/prevodi`, { waitUntil: "domcontentloaded" });
  const list = await page.textContent("body");

  check("трите примерни заявки се виждат", (await page.locator("tbody tr").count()) >= 3);
  check("номерът на заявката се показва", list.includes("NFI-P-2026-000001"));
  check("езиковата двойка се показва", list.includes("BG → DE"));

  // Просроченият срок ВИКА, не мълчи: чл. 5, ал. 1, б. „д" GDPR не е
  // подробност, а задължение.
  check(
    "просроченият срок за триене се вижда в списъка",
    list.includes("просрочено"),
  );

  // ── Филтърът ──────────────────────────────────────────────────────────
  // Взима се ПЪРВИЯТ наличен чип, а не назован статус: тестът мени
  // състоянията на заявките и втори пуск не намира същите чипове. Тест,
  // който минава само веднъж, не е тест.
  const chip = page.locator('nav[aria-label="Филтър по състояние"] a').nth(1);
  await chip.click();
  await page.waitForTimeout(1500);
  check(
    "филтърът по състояние работи",
    page.url().includes("status=") &&
      (await page.locator("tbody tr").count()) >= 1,
    page.url().replace(BASE, ""),
  );

  // Прототипната верига не бива да мине за валиден статус.
  const junk = await page.goto(`${BASE}/admin/prevodi?status=toString`, {
    waitUntil: "domcontentloaded",
  });
  check(
    "измислен статус в адреса не събаря страницата",
    junk.status() === 200 && (await page.locator("tbody tr").count()) >= 3,
    `HTTP ${junk.status()}`,
  );

  // ── Заявката с готова оферта ──────────────────────────────────────────
  await page.goto(`${BASE}/admin/prevodi`, { waitUntil: "domcontentloaded" });
  await page.locator("tr", { hasText: "NFI-P-2026-000002" }).locator("a").first().click();
  await page.waitForTimeout(2000);
  await hydrated(page);

  const detail = await page.textContent("body");
  check("данните на клиента се виждат", detail.includes("petar.example@example.com"));
  check(
    "описанието на документа се вижда",
    detail.includes("akt-za-razhdane.pdf") && detail.includes("1 стр."),
  );
  check(
    "сваленето честно се обявява за невъзможно",
    detail.includes("още не могат да се свалят"),
  );
  check(
    "срокът за триене стои най-отгоре",
    detail.includes("трият автоматично"),
  );
  // Сумата НЕ се сверява с точна стойност: тестът я мени и втори пуск
  // намира друга. Важното е, че офертата от сийда е стигнала до полето.
  check(
    "офертата е стигнала до полето",
    /^\d+,\d{2}$/.test(await page.inputValue("#f-quoted")),
    await page.inputValue("#f-quoted"),
  );
  check(
    "бележката на клиента се е запазила",
    (await page.inputValue("#f-notes")).includes("хартиено копие"),
  );

  // ── Статус с оферта, но без сума, се отказва ──────────────────────────
  // Статусът се задава ИЗРИЧНО, за да не зависи проверката от това какво е
  // оставил предишен пуск.
  await page.selectOption("#f-status", "QUOTED");
  await page.fill("#f-quoted", "");
  await page.click('button:has-text("Запази")');
  await page.waitForTimeout(2000);
  const quoteError = await page.textContent("#f-quoted-error").catch(() => null);
  check(
    "„изпратена оферта“ без сума се отказва",
    Boolean(quoteError && quoteError.includes("вече е видял оферта")),
    quoteError?.trim().slice(0, 55) ?? "няма съобщение",
  );

  // ── Записване ─────────────────────────────────────────────────────────
  await page.fill("#f-quoted", "95,00");
  await page.click('button:has-text("Запази")');
  await page.waitForTimeout(2500);
  check(
    "записът минава",
    (await page.textContent("body")).includes("Промените са записани"),
  );
  // Точката, заради която тук ИМА revalidatePath: без него формата се
  // връща към данните отпреди записа и „Промените са записани" стои над
  // непроменена стойност — съобщение, което изглежда като лъжа.
  check(
    "полето показва ЗАПИСАНАТА сума, не старата",
    (await page.inputValue("#f-quoted")) === "95,00",
    await page.inputValue("#f-quoted"),
  );

  // ── Бързото действие НЕ трие офертата ─────────────────────────────────
  // Първата ми версия подаваше цялата форма с празни полета и щеше да
  // изтрие сумата и бележките с едно натискане от списъка.
  // Заявка №1 се връща на „получена", за да има какво да се поеме и при
  // втори пуск.
  await page.goto(`${BASE}/admin/prevodi`, { waitUntil: "domcontentloaded" });
  await page.locator("tr", { hasText: "NFI-P-2026-000001" }).locator("a").first().click();
  await page.waitForTimeout(2000);
  await hydrated(page);
  await page.selectOption("#f-status", "SUBMITTED");
  await page.click('button:has-text("Запази")');
  await page.waitForTimeout(2500);

  await page.goto(`${BASE}/admin/prevodi`, { waitUntil: "domcontentloaded" });
  const first = page.locator("tr", { hasText: "NFI-P-2026-000001" });
  await first.locator('button:has-text("Поеми")').click();
  await page.waitForURL(/vpregled=1/, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  check(
    "„Поеми“ сменя състоянието",
    (await page.textContent("body")).includes("в преглед"),
  );

  await page.goto(`${BASE}/admin/prevodi`, { waitUntil: "domcontentloaded" });
  await page.locator("tr", { hasText: "NFI-P-2026-000002" }).locator("a").first().click();
  await page.waitForTimeout(2000);
  await hydrated(page);
  check(
    "офертата на ДРУГАТА заявка е непокътната",
    (await page.inputValue("#f-quoted")) === "95,00",
    await page.inputValue("#f-quoted"),
  );
  check(
    "бележките са непокътнати",
    (await page.inputValue("#f-notes")).includes("хартиено копие"),
  );

  // ── Просрочената заявка предупреждава ─────────────────────────────────
  await page.goto(`${BASE}/admin/prevodi`, { waitUntil: "domcontentloaded" });
  await page.locator("tr", { hasText: "NFI-P-2026-000003" }).locator("a").first().click();
  await page.waitForTimeout(2000);
  const overdue = await page.textContent("body");
  check(
    "просроченият срок дава тревога, не бележка",
    overdue.includes("Срокът за съхранение е изтекъл") &&
      (await page.locator('[role="alert"]').count()) >= 1,
  );
  check(
    "готовият превод е отделен от качените документи",
    overdue.includes("arbeitszeugnis-prevod.pdf") && overdue.includes("Готов превод"),
  );

  // ── Токенът за достъп НЕ се показва никъде ────────────────────────────
  // Той отваря заявката БЕЗ вход. Екран, който го показва, може да бъде
  // снимен или споделен.
  check(
    "токенът за достъп не изтича на екрана",
    !overdue.includes("seed-token"),
  );
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} минават`);
process.exit(failed.length === 0 ? 0 : 1);
