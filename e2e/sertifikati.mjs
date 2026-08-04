// Сертификатът от издаване до проверка · задачи 16 и 24a.
//
//   npm run e2e sertifikati
//
// Този поток минава през ТРИ различни роли и четири механизма: админът
// издава, броячът дава номер, PDF-ът се генерира от шрифтове на диска,
// курсистът го тегли от профила си, а институция го проверява публично
// по код. Никой unit тест не покрива веригата — само че всяко звено
// поотделно работи.
//
// Проверява се и отмяната, защото тя е единственото място, където един
// и същ документ трябва да смени смисъла си на три екрана наведнъж.

import {
  ADMIN,
  BASE,
  STUDENT,
  bodyText,
  login,
  logout,
  run,
  unique,
} from "./_harness.mjs";

await run("Сертификати: издаване → профил → проверка → отмяна", async ({ page, ok }) => {
  // ── Админът издава ──
  await login(page, ADMIN);

  const form = await page.goto(`${BASE}/admin/sertifikati/nov`, {
    waitUntil: "domcontentloaded",
  });
  ok("формата за издаване се отваря", form.status() === 200, `HTTP ${form.status()}`);

  const holder = unique("Курсист");

  await page.fill('input[name="email"]', STUDENT);
  await page.fill('input[name="holderName"]', holder);

  // Курсът се избира по СТОЙНОСТ, не по индекс: подредбата на сийда може
  // да се смени, а тестът не бива да зависи от нея.
  const courseValues = await page
    .locator('select[name="courseId"] option')
    .evaluateAll((nodes) =>
      nodes.map((n) => n.value).filter((v) => v && v.length > 10),
    );
  ok("има курсове за избор", courseValues.length > 0, `${courseValues.length} броя`);
  if (courseValues.length === 0) return;

  await page.selectOption('select[name="courseId"]', courseValues[0]);

  // Чака се ИЗДАДЕН, не просто „друг адрес": шаблонът
  // /admin/sertifikati/<нещо> съвпада и със самата страница „нов".
  // А бутонът е този ВЪВ формата — в страничната лента има втори
  // submit (изходът) и `.last()` хващаше него.
  await Promise.all([
    page.waitForURL((url) => url.search.includes("izdaden=1"), { timeout: 20000 }),
    page
      .locator('form:has(input[name="holderName"]) button[type="submit"]')
      .first()
      .click(),
  ]);

  const detail = await bodyText(page);
  ok("сертификатът е издаден", detail.includes(holder), holder);

  // Номерът и кодът се четат от екрана — те са договорът с външния свят.
  const number = detail.match(/NFI-Z-\d{4}-\d{5}/)?.[0];
  const code = detail.match(/[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}/)?.[0];

  ok("има номер по формата", Boolean(number), number ?? "няма");
  ok("има код за проверка", Boolean(code), code ?? "няма");
  if (!number || !code) return;

  ok("PDF файлът е готов веднага", detail.includes("генериран"));

  // ── Публичната проверка ──
  const verify = await page.goto(`${BASE}/bg/zertifikat/${code}`, {
    waitUntil: "domcontentloaded",
  });
  const verifyBody = await bodyText(page);
  ok("страницата за проверка се отваря", verify.status() === 200);
  ok("казва, че сертификатът е валиден", verifyBody.includes("валиден"));
  ok("показва номера", verifyBody.includes(number));
  ok("показва името", verifyBody.includes(holder));

  // Небрежно преписан код също трябва да работи: човек го чете от хартия.
  const sloppy = code.toLowerCase().replaceAll("-", "");
  await page.goto(`${BASE}/bg/zertifikat/${sloppy}`, {
    waitUntil: "domcontentloaded",
  });
  ok(
    "прощава малки букви и липсващи тирета",
    (await bodyText(page)).includes(number),
  );

  // Непознат код НЕ бива да гърми.
  const unknown = await page.goto(`${BASE}/bg/zertifikat/AAAA-BBBB-CCCC`, {
    waitUntil: "domcontentloaded",
  });
  ok("непознат код дава спокойна страница", unknown.status() === 200);
  ok(
    "и казва, че не е разпознат",
    (await bodyText(page)).includes("не е разпознат"),
  );

  // ── Немската версия не показва български текст ──
  await page.goto(`${BASE}/de/zertifikat/${code}`, {
    waitUntil: "domcontentloaded",
  });
  const german = await bodyText(page);
  ok("немската проверка работи", german.includes("gültig"));
  ok("и е на немски, не на български", !german.includes("валиден"));

  // ── Курсистът в профила си ──
  await logout(page);
  await login(page, STUDENT);

  await page.goto(`${BASE}/bg/profil`, { waitUntil: "domcontentloaded" });
  const profile = await bodyText(page);
  ok("курсистът вижда сертификата си", profile.includes(number), number);

  const download = page.locator('a[href^="/api/certificate/"]').first();
  ok("има връзка за сваляне", (await download.count()) > 0);

  if (await download.count()) {
    const href = await download.getAttribute("href");
    const file = await page.evaluate(async (url) => {
      const response = await fetch(url, { credentials: "same-origin" });
      const buffer = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        type: response.headers.get("content-type"),
        bytes: buffer.length,
        head: String.fromCharCode(...buffer.slice(0, 5)),
      };
    }, href);

    ok("PDF-ът се тегли", file.status === 200, `HTTP ${file.status}`);
    ok("и е истински PDF", file.head === "%PDF-", file.head);
    ok("с вградени шрифтове", file.bytes > 100_000, `${file.bytes} байта`);
  }

  // ── Отмяната сменя смисъла на три места ──
  await logout(page);
  await login(page, ADMIN);

  await page.goto(`${BASE}/admin/sertifikati`, { waitUntil: "domcontentloaded" });
  await page.locator(`a:has-text("${number}")`).first().click();
  await page.waitForLoadState("domcontentloaded");

  // Разделът за отмяна е сгънат `<details>` — отваря се като човек.
  await page.locator("summary:has-text('Отмяна')").first().click();
  await page.fill('textarea[name="reason"]', "Проверка на потока (e2e).");
  await page.locator('input[name="confirm"]').check();

  await page.locator('details form button[type="submit"]').first().click();
  await page.waitForTimeout(2500);

  const afterRevoke = await bodyText(page);
  ok("админът вижда, че е отменен", afterRevoke.includes("отменен"));

  await page.goto(`${BASE}/bg/zertifikat/${code}`, {
    waitUntil: "domcontentloaded",
  });
  ok(
    "публичната проверка вече казва „отменен“",
    (await bodyText(page)).includes("отменен"),
  );

  // Курсистът вече НЕ бива да тегли отменен сертификат: на хартия той
  // изглежда валиден, а не е.
  await logout(page);
  await login(page, STUDENT);
  await page.goto(`${BASE}/bg/profil`, { waitUntil: "domcontentloaded" });

  const revokedProfile = await bodyText(page);
  ok("в профила пише, че е отменен", revokedProfile.includes("Отменен"));

  // ТОЧНО този запис няма връзка. Курсистът има и втори сертификат от
  // сийда, който си остава валиден — неговата връзка трябва да оцелее,
  // затова броене на всички връзки би било грешното твърдение.
  const revokedRow = page.locator("li").filter({ hasText: number });
  ok("редът на отменения се намира", (await revokedRow.count()) > 0);
  ok(
    "отмененият няма връзка за сваляне",
    (await revokedRow.first().locator('a[href^="/api/certificate/"]').count()) === 0,
  );
  ok(
    "но валидният сертификат си запазва връзката",
    (await page.locator('a[href^="/api/certificate/"]').count()) > 0,
  );
});
