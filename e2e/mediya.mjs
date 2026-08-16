// Медийната библиотека от край до край · задача 17m-b.
//
//   npm run e2e mediya
//
// Потокът минава през ЧЕТИРИ механизма: качване (server action → магически
// байтове → EXIF → хранилище), библиотеката, закачането като корица и
// публичната страница през next/image. Никой unit тест не покрива
// веригата — само че всяко звено поотделно работи.
//
// Проверява се и ОТРИЦАТЕЛНОТО: закачен файл не се трие, ключ в media/
// за материал се отказва (иначе лийд фунията пада), а PDF-ът на материал
// отива в защитения scope product/.

import { ADMIN, BASE, bodyText, login, run, unique } from "./_harness.mjs";
import { deflateSync } from "node:zlib";

// ── Истински PNG, сглобен в паметта ──────────────────────────────────────
// С верни CRC-та: браузърът (createImageBitmap за прегледа) отказва
// файл с фалшива контролна сума, а тестът трябва да мине и през
// клиентския код, не само през сървърния.

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = [...type].map((ch) => ch.charCodeAt(0));
  const body = Buffer.from([...typeBytes, ...data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Едноцветен PNG width×height (RGB, 8 бита). */
function makePng(width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // дълбочина
  ihdr[9] = 2; // цвят: RGB
  // Редове: 1 байт филтър + width×3 байта пиксели (тъмночервено).
  const row = Buffer.from([0, ...Array(width).fill([0x8b, 0x1a, 0x1a]).flat()]);
  const raw = Buffer.concat(Array(height).fill(row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", [...ihdr]),
    pngChunk("IDAT", [...deflateSync(raw)]),
    pngChunk("IEND", []),
  ]);
}

/** Изчаква React да поеме страницата (виж kursove.mjs за обяснението). */
async function hydrated(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return Boolean(el) && Object.keys(el).some((k) => k.startsWith("__react"));
    },
    selector,
    { timeout: 20000 },
  );
}

const STAMP = unique("korica");

await run("Медия: качване → корица → публична страница → изтриване", async ({ page, ok }) => {
  await login(page, ADMIN);

  // ── Качването ──
  await page.goto(`${BASE}/admin/mediya/nov`, { waitUntil: "domcontentloaded" });
  await hydrated(page, "#media-file");

  await page.setInputFiles("#media-file", {
    name: `${STAMP}.png`,
    mimeType: "image/png",
    buffer: makePng(64, 48),
  });

  await Promise.all([
    page.waitForURL((url) => url.search.includes("kachen=1"), { timeout: 20000 }),
    page.locator('form button:has-text("Качи файла")').first().click(),
  ]);

  const detailUrl = new URL(page.url());
  const mediaId = detailUrl.pathname.split("/").pop();
  ok("качването пренасочва към детайла", Boolean(mediaId), mediaId);

  const detail = await bodyText(page);
  // Размерите идват от ЗАГЛАВКАТА на файла, не от декларация на клиента.
  ok("размерите са прочетени от файла", detail.includes("64 × 48"));
  ok("ключът е в scope media/", detail.includes("media/"));

  // ── Описанието за екранен четец ──
  await hydrated(page, 'textarea[name="alt"]');
  await page.fill('textarea[name="alt"]', `Тестова корица ${STAMP}`);
  await page.locator('form button:has-text("Запази промените")').first().click();
  await page.waitForSelector('text=Промените са записани.', { timeout: 15000 });
  ok("описанието се записва", true);

  // ── Списъкът ──
  await page.goto(`${BASE}/admin/mediya?tarsene=${STAMP}`, {
    waitUntil: "domcontentloaded",
  });
  const listBody = await bodyText(page);
  ok("търсенето намира файла", listBody.includes(`${STAMP}.png`) || listBody.includes(STAMP));
  ok("и показва, че не се ползва никъде", listBody.includes("никъде"));

  // ── Закачането като корица ──
  await page.goto(`${BASE}/admin/kursove`, { waitUntil: "domcontentloaded" });
  const courseHref = await page
    .locator("tbody th a")
    .first()
    .getAttribute("href");
  ok("има курс за корица", Boolean(courseHref), courseHref ?? "няма");
  if (!courseHref) return;

  await page.goto(`${BASE}${courseHref}`, { waitUntil: "domcontentloaded" });
  await hydrated(page, 'select[name="coverMediaId"]');

  // Публичният адрес се чете от страницата — не се гадае по сийда.
  const publicHref = await page
    .locator('a[href^="/de/kurse/"]')
    .first()
    .getAttribute("href");
  const slug = publicHref?.split("/").pop();

  await page.selectOption('select[name="coverMediaId"]', mediaId);
  await page.locator('form button:has-text("Запази промените")').first().click();
  await page.waitForSelector('text=Промените са записани.', { timeout: 15000 });
  ok("корицата се записва към курса", true);

  // ── Публичната страница ──
  ok("има публичен адрес на курса", Boolean(slug), slug ?? "няма");
  if (slug) {
    await page.goto(`${BASE}/bg/kurse/${slug}`, { waitUntil: "domcontentloaded" });
    // next/image пренаписва src към /_next/image?url=%2Fmedia%2F… — значи
    // и оптимизаторът, и публичният /media път участват в проверката.
    const image = page.locator('article img[src*="media"]').first();
    ok("публичната страница показва корицата", (await image.count()) > 0);
    if (await image.count()) {
      ok(
        "с описанието за екранен четец",
        (await image.getAttribute("alt"))?.includes(STAMP) ?? false,
      );
      // Самата картинка се дърпа и е валидна — не е счупен адрес.
      const src = await image.getAttribute("src");
      const status = await page.evaluate(
        async (url) => (await fetch(url)).status,
        src,
      );
      ok("и картинката наистина се зарежда", status === 200, `HTTP ${status}`);
    }
  }

  // ── Дневникът вижда промяната ──
  await page.goto(`${BASE}/admin/dnevnik`, { waitUntil: "domcontentloaded" });
  const dnevnik = await bodyText(page);
  ok("дневникът показва промяната на корицата", dnevnik.includes("корица"));

  // ── Закачен файл НЕ се трие ──
  await page.goto(`${BASE}/admin/mediya/${mediaId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('summary:has-text("Изтриване")').first().click();
  const blockedText = await bodyText(page);
  ok("изтриването е блокирано с обяснение", blockedText.includes("закачен"));
  ok(
    "и няма бутон „Изтрий завинаги“",
    (await page.locator('button:has-text("Изтрий завинаги")').count()) === 0,
  );

  // ── Откачане и изтриване ──
  await page.goto(`${BASE}${courseHref}`, { waitUntil: "domcontentloaded" });
  await hydrated(page, 'select[name="coverMediaId"]');
  await page.selectOption('select[name="coverMediaId"]', "");
  await page.locator('form button:has-text("Запази промените")').first().click();
  await page.waitForSelector('text=Промените са записани.', { timeout: 15000 });

  await page.goto(`${BASE}/admin/mediya/${mediaId}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator('summary:has-text("Изтриване")').first().click();
  await hydrated(page, 'input[name="confirm"]');
  await page.locator('input[name="confirm"]').check();

  await Promise.all([
    page.waitForURL((url) => url.search.includes("iztrit=1"), { timeout: 15000 }),
    page.locator('button:has-text("Изтрий завинаги")').first().click(),
  ]);
  ok("откаченият файл се изтрива", true);

  if (slug) {
    await page.goto(`${BASE}/bg/kurse/${slug}`, { waitUntil: "domcontentloaded" });
    ok(
      "и публичната страница остава без корица, без грешка",
      (await page.locator('article img[src*="media"]').count()) === 0,
    );
  }

  // ── PDF за материал отива в scope product/ ──
  //
  // Двата случая (отказан ръчен ключ и качен файл) минават през ОТДЕЛНО
  // зареждане на формата. Не е педантизъм: React 19 прави form.reset()
  // след server action, тоест полетата се връщат към стойностите от
  // ПРОВАЛЕНИЯ опит. Тестът, който продължава в същата форма, тихо
  // изпраща стария ключ и после обвинява кода.
  const materialSlug = unique("material");

  async function fillMaterialBasics() {
    await page.goto(`${BASE}/admin/materiali/nov`, {
      waitUntil: "domcontentloaded",
    });
    await hydrated(page, 'input[name="title"]');
    await page.fill('input[name="title"]', `Тестов материал ${STAMP}`);
    await page.fill('input[name="slug"]', materialSlug);
    await page.selectOption('select[name="kind"]', "PDF");
  }

  // Ръчен ключ в media/ се ОТКАЗВА — това пази лийд фунията.
  await fillMaterialBasics();
  await page.fill('input[name="storageKey"]', "media/2026/izteklo.pdf");
  await page.locator('form button:has-text("Създай")').first().click();
  await page.waitForSelector("text=ПУБЛИЧЕН", { timeout: 15000 });
  ok("ключ в media/ за материал се отказва", true);
  ok(
    "и материалът НЕ е създаден",
    page.url().includes("/admin/materiali/nov"),
    page.url(),
  );

  // С качен файл: ключът се образува сам, в product/.
  await fillMaterialBasics();
  await page.setInputFiles('input[name="storageFile"]', {
    name: `${materialSlug}.pdf`,
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% тестов материал\n%%EOF"),
  });

  await Promise.all([
    page.waitForURL((url) => url.search.includes("sazdaden=1"), {
      timeout: 20000,
    }),
    page.locator('form button:has-text("Създай")').first().click(),
  ]);
  ok("качването създава материала", true);

  // Ключът се чете от САМОТО ПОЛЕ, не от текста на страницата: подсказката
  // под полето също съдържа думата „product/" и всяко твърдение върху
  // целия текст минава по грешната причина.
  const savedKey = await page.inputValue('input[name="storageKey"]');
  ok("ключът е в защитения scope product/", savedKey.startsWith("product/"), savedKey);
  ok("и НЕ в публичния media/", !savedKey.startsWith("media/"), savedKey);

  // Чисти след себе си: материалът се трие през собствения си екран.
  await page.locator('summary:has-text("Изтриване")').first().click();
  await hydrated(page, 'input[name="confirm"]');
  await page.locator('input[name="confirm"]').check();
  await Promise.all([
    page.waitForURL((url) => url.search.includes("iztrit=1"), { timeout: 15000 }),
    page.locator('button:has-text("Изтрий завинаги")').first().click(),
  ]);
  ok("тестовият материал е изтрит", true);
});
