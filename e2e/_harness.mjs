// ОБЩА ОСНОВА за end-to-end проверките · задача 24a.
//
// До днес всеки от осемте файла си имаше собствено копие на `ok()`, на
// пускането на браузъра и на адреса, зашит като константа. Осем копия
// значи осем места, които се разминават — и наистина се бяха разминали:
// част от файловете чакаха 2500 ms след вход, други 3000 ms.
//
// Този файл е ЕДИНСТВЕНАТА обща основа. Съществуващите проверки могат да
// го приемат постепенно; нищо не ги задължава наведнъж.

import { chromium } from "playwright";

/**
 * Адресът идва от средата, с разумен резерв.
 *
 * Оркестраторът (e2e/run.mjs) вдига сървър на СВОБОДЕН порт и го подава
 * тук. Зашитият порт 3130 беше причина две проверки да не могат да вървят
 * едновременно и да падат необяснимо, ако някой е забравил друг сървър.
 */
export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3130";

/** Паролата на сийднатите профили. Един източник: prisma/seed.ts. */
export const DEV_PASSWORD = "nfi-lokalna-parola";

export const ADMIN = "admin@nfi.local";
export const STUDENT = "student@nfi.local";

// ─────────────────────────────────────────────────────────────────────────
//  Отчитане
// ─────────────────────────────────────────────────────────────────────────

/**
 * Създава отчет за една проверка.
 *
 * Връща `ok()` за твърденията и `summary()` за края. Изходният код се
 * определя от summary(), а не от изключение — така един провален ред не
 * скрива останалите двайсет.
 */
export function report(title) {
  const results = [];

  console.log(`\n── ${title} ──`);

  const ok = (name, value, detail = "") => {
    const passed = Boolean(value);
    results.push({ name, passed });
    console.log(`${passed ? "✓" : "✗"} ${name}${detail ? "  — " + detail : ""}`);
    return passed;
  };

  const summary = () => {
    const passed = results.filter((r) => r.passed).length;
    console.log(`\n${passed}/${results.length} минават`);

    if (passed !== results.length) {
      console.log("\nПаднали:");
      for (const r of results.filter((x) => !x.passed)) console.log(`  ✗ ${r.name}`);
    }

    return { passed, total: results.length, failed: results.length - passed };
  };

  return { ok, summary, results };
}

// ─────────────────────────────────────────────────────────────────────────
//  Браузър
// ─────────────────────────────────────────────────────────────────────────

/**
 * Пуска браузър и подава СВЕЖ контекст на всяка проверка.
 *
 * Свеж контекст = свои бисквитки. Без него влизането в една проверка
 * изтича в следващата и редът на пускане започва да значи — точно
 * затова profil.mjs завършва с изход, а не защото това е интересно.
 *
 * Гаси браузъра дори при изключение и връща изходния код.
 */
export async function run(title, body) {
  const { ok, summary } = report(title);
  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({
      // Записва се, за да могат проверките да четат отговори на заявки
      // (например Content-Disposition при сваляне).
      acceptDownloads: true,
    });
    const page = await context.newPage();

    await body({ page, context, browser, ok });
  } catch (error) {
    console.error(`\n✗ Проверката гръмна: ${error.message}`);
    console.error(error.stack?.split("\n").slice(1, 4).join("\n") ?? "");
    ok("проверката стигна до края", false, error.message.slice(0, 80));
  } finally {
    await browser.close();
  }

  const result = summary();
  process.exitCode = result.failed > 0 ? 1 : 0;
  return result;
}

// ─────────────────────────────────────────────────────────────────────────
//  Вход
// ─────────────────────────────────────────────────────────────────────────

/**
 * Влиза и ИЗЧАКВА резултата, вместо да спи произволно време.
 *
 * `waitForURL` вместо `waitForTimeout`: фиксираното чакане е или губене
 * на време, или причина за трепкащ тест на бавна машина. Тук се чака
 * точно събитието, което значи „готово".
 */
export async function login(page, email, password = DEV_PASSWORD) {
  await page.goto(`${BASE}/bg/anmelden`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("anmelden"), {
      timeout: 15000,
    }),
    page.click('button[type="submit"]'),
  ]);
}

/** Излиза, за да не изтича сесия между два случая в един файл. */
export async function logout(page) {
  await page.goto(`${BASE}/bg/profil`, { waitUntil: "domcontentloaded" });
  const button = page.locator('form button:has-text("Изход")').first();
  if (await button.count()) {
    await button.click();
    await page.waitForTimeout(1000);
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Изолация на данните
// ─────────────────────────────────────────────────────────────────────────

/**
 * Суфикс, уникален за това пускане.
 *
 * Проверка, която създава запис с фиксирано име, минава ВЕДНЪЖ и после
 * пада на „вече съществува" — и то по начин, който изглежда като истински
 * дефект. Всеки създаден от тестовете запис носи този суфикс, а по него
 * се и разпознава за чистене.
 */
export const RUN_ID = `e2e-${Date.now().toString(36)}`;

export function unique(prefix) {
  return `${prefix}-${RUN_ID}`;
}

/** Имейл, който гарантирано не е ничий. */
export function uniqueEmail(prefix = "test") {
  return `${prefix}-${RUN_ID}@e2e.local`;
}

// ─────────────────────────────────────────────────────────────────────────
//  Дребни помощници
// ─────────────────────────────────────────────────────────────────────────

/** Текстът на страницата, със смачкани интервали — за `includes`. */
export async function bodyText(page) {
  return (await page.textContent("body")).replace(/\s+/g, " ");
}

/** Прави заявка със сесията на страницата и връща статус и глави. */
export async function fetchWithSession(page, path) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { credentials: "same-origin" });
    const buffer = new Uint8Array(await response.arrayBuffer());

    return {
      status: response.status,
      contentType: response.headers.get("content-type"),
      disposition: response.headers.get("content-disposition"),
      bytes: buffer.length,
      head: String.fromCharCode(...buffer.slice(0, 8)),
    };
  }, path);
}
