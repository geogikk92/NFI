// Безплатните материали от край до край · задачи 8 и 24a.
//
//   npm run e2e svalyane
//
// Това е ФУНИЯТА на института: посетител оставя контакт и получава файл.
// Тя минава през четири отделни механизма — форма с honeypot, запис на
// лийд, подписан токен и стрийм на файла — и нито един unit тест не може
// да докаже, че четирите работят СВЪРЗАНО.
//
// Проверява се и обратното: че токенът наистина се изхабява и че видео
// материалът НЕ предлага сваляне.

import {
  BASE,
  bodyText,
  run,
  uniqueEmail,
} from "./_harness.mjs";

/**
 * Натиска бутона ВЪТРЕ във формата с имейла.
 *
 * Общото `button[type="submit"]` хваща първия на страницата — а при видео
 * материал ConsentGate рисува свой бутон ПРЕДИ формата и заявката тихо не
 * тръгва. Цял час търсене за един селектор.
 */
async function submitForm(page) {
  await page
    .locator('form:has(input[name="email"]) button[type="submit"]')
    .first()
    .click();
}

await run("Безплатни материали: форма → токен → файл", async ({ page, ok }) => {
  // ── Списъкът ──
  const list = await page.goto(`${BASE}/bg/materialien`, {
    waitUntil: "domcontentloaded",
  });
  ok("списъкът с материали се отваря", list.status() === 200, `HTTP ${list.status()}`);

  const links = await page
    .locator('a[href*="/materialien/"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));

  const slugs = [...new Set(links.map((href) => href.split("/materialien/")[1]))]
    .filter(Boolean);
  ok("има поне един материал", slugs.length > 0, `${slugs.length} броя`);
  if (slugs.length === 0) return;

  // ── ПОТОКЪТ за материал за сваляне (PDF) ──
  //
  // Търси се материалът, чиято страница показва форма с бутон за сваляне.
  // Не се разчита на конкретен slug: сийдът може да се смени, а тестът
  // проверява ПОВЕДЕНИЕ, не съдържание.
  let downloadSlug = null;
  let videoSlug = null;

  for (const slug of slugs) {
    await page.goto(`${BASE}/bg/materialien/${slug}`, {
      waitUntil: "domcontentloaded",
    });
    const body = await bodyText(page);

    // Видът се обявява с етикет на самата страница (t.kinds). По него, а
    // не по slug: сийдът може да се смени, поведението — не.
    if (body.includes("PDF за сваляне") || body.includes("Аудио")) {
      downloadSlug ??= slug;
    } else if (body.includes("Видео запис") || body.includes("Запис от занятие")) {
      videoSlug ??= slug;
    }

    if (downloadSlug && videoSlug) break;
  }

  ok("намерен е материал за сваляне", Boolean(downloadSlug), downloadSlug ?? "няма");
  if (!downloadSlug) return;

  await page.goto(`${BASE}/bg/materialien/${downloadSlug}`, {
    waitUntil: "domcontentloaded",
  });

  // ── Капанът за ботове ──
  //
  // НЕ се проверява с isVisible(): полето е изнесено на -9999px в
  // контейнер с нулев размер — стандартният honeypot. Playwright го брои
  // за „видимо", защото самият input си има кутия. Значението е друго:
  // човек не може да стигне до него нито с очи, нито с Tab.
  const honeypot = page.locator('input[name="website"]');
  const hasHoneypot = (await honeypot.count()) > 0;
  ok("формата има капан за ботове", hasHoneypot);

  if (hasHoneypot) {
    const box = await honeypot.first().boundingBox();
    ok(
      "капанът е извън екрана",
      box === null || box.x < 0 || box.y < 0,
      box ? `x=${Math.round(box.x)}` : "без кутия",
    );
    ok(
      "капанът е извън реда на табулация",
      (await honeypot.first().getAttribute("tabindex")) === "-1",
    );
  }

  // ── Твърде бързото изпращане се брои за бот ──
  //
  // Формата иска поне MIN_FILL_SECONDS (2 с) между зареждане и изпращане.
  // Ботът попълва мигновено; човек — не. Отговорът е НЕУТРАЛЕН (изглежда
  // като успех), за да не подскаже на бота какво го е издало.
  await page.fill('input[name="name"]', "Бот Ботов");
  await page.fill('input[name="email"]', uniqueEmail("bot"));
  await submitForm(page);
  await page.waitForTimeout(2000);

  const botBody = await bodyText(page);
  ok(
    "мигновеното изпращане не дава файл",
    (await page.locator('a[href^="/download/"]').count()) === 0,
  );
  // Свойството, което пази: отговорът изглежда като УСПЕХ. Бот, който
  // получава „отказано", просто опитва пак по друг начин.
  ok(
    "отговорът изглежда като успех, не като отказ",
    botBody.includes("Готово") && !botBody.includes("Провери отбелязаните"),
  );

  // ── Истинска заявка, с човешко темпо ──
  await page.goto(`${BASE}/bg/materialien/${downloadSlug}`, {
    waitUntil: "domcontentloaded",
  });

  const email = uniqueEmail("material");
  await page.fill('input[name="name"]', "Тест Тестов");
  await page.fill('input[name="email"]', email);

  // Изчакването е ЧАСТ ОТ ПРОВЕРКАТА, не забавяне: без него сървърът
  // основателно смята заявката за машинна.
  await page.waitForTimeout((2 + 0.5) * 1000);

  await submitForm(page);
  await page.waitForTimeout(2500);

  const afterSubmit = await bodyText(page);
  ok("формата отговаря с успех", !afterSubmit.includes("Провери отбелязаните"));

  const downloadLink = page.locator('a[href^="/download/"]').first();
  const hasLink = (await downloadLink.count()) > 0;
  ok("показва се линк за сваляне", hasLink);
  if (!hasLink) return;

  const href = await downloadLink.getAttribute("href");

  // ── Файлът ──
  const file = await page.evaluate(async (url) => {
    const response = await fetch(url);
    const buffer = new Uint8Array(await response.arrayBuffer());
    return {
      status: response.status,
      type: response.headers.get("content-type"),
      disposition: response.headers.get("content-disposition"),
      bytes: buffer.length,
      head: String.fromCharCode(...buffer.slice(0, 5)),
    };
  }, href);

  ok("файлът се сваля", file.status === 200, `HTTP ${file.status}`);
  ok("файлът е истински PDF", file.head === "%PDF-", file.head);
  ok("файлът не е празен", file.bytes > 100, `${file.bytes} байта`);
  ok(
    "предлага се със смислено име",
    (file.disposition ?? "").includes("filename"),
    file.disposition?.slice(0, 60),
  );

  // ── Границата: токенът е с брой опити, не безкраен ──
  //
  // Пет опита е таванът (GRANT_MAX_DOWNLOADS). Тук се проверява, че
  // броенето изобщо работи: след шест тегления шестото трябва да откаже.
  let lastStatus = 200;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    lastStatus = await page.evaluate(
      async (url) => (await fetch(url)).status,
      href,
    );
  }
  ok(
    "изчерпаният токен спира да дава файла",
    lastStatus === 410,
    `HTTP ${lastStatus} на шестото теглене`,
  );

  // ── Непознат токен ──
  const bogus = await page.evaluate(
    async (url) => (await fetch(url)).status,
    "/download/nyama-takuv-token-12345",
  );
  ok("непознат токен дава 404", bogus === 404, `HTTP ${bogus}`);

  // ── Видео материалът НЕ предлага сваляне ──
  //
  // Той се гледа на страницата. Линк за сваляне тук би значел, че
  // вграденото видео се раздава като файл.
  if (videoSlug) {
    await page.goto(`${BASE}/bg/materialien/${videoSlug}`, {
      waitUntil: "domcontentloaded",
    });
    await page.fill('input[name="name"]', "Тест Видео");
    await page.fill('input[name="email"]', uniqueEmail("video"));
    await page.waitForTimeout(2500);
    await submitForm(page);
    await page.waitForTimeout(2500);

    ok(
      "видео материалът не дава файл за сваляне",
      (await page.locator('a[href^="/download/"]').count()) === 0,
    );
    ok(
      "а казва къде се гледа",
      (await bodyText(page)).includes("от тази страница"),
    );
  }

  // ── Езиците ──
  const de = await page.goto(`${BASE}/de/materialien`, {
    waitUntil: "domcontentloaded",
  });
  ok("немската версия на списъка работи", de.status() === 200);
  const en = await page.goto(`${BASE}/en/materialien`, {
    waitUntil: "domcontentloaded",
  });
  ok("английската версия на списъка работи", en.status() === 200);
});
