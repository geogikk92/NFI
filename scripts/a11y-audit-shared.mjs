// ТЕРИТОРИЯ НА БОБИ · задача 23v — обща основа на двете проверки.
//
// Тук живее това, което и axe одитът, и кросбраузър проверката ползват:
// вдигане на сървър, обхождане на публичните страници и отчитане.
//
// ЗАЩО ОБХОЖДАНЕ, А НЕ СПИСЪК С АДРЕСИ
// Списък, писан на ръка, остарява при първата нова страница и никой не
// забелязва — проверката минава зелена, защото не е гледала. Обхождането
// тръгва от началната и следва връзките, значи новата страница влиза сама.
// Динамичните адреси (курс, материал, продукт) идват от истински връзки,
// не от познат slug.

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, "..");

/** Езиците, които се проверяват. Немският е за публиката в Германия. */
export const LOCALES = ["bg", "de"];

/**
 * Страници, които се ПРОПУСКАТ при обхождането.
 *
 * Админът е зад вход и е само на български — той има свои проверки.
 * Изходът е действие, не страница. Файловите пътища не са HTML.
 */
const SKIP = [
  /^\/admin/,
  /^\/api\//,
  /^\/media\//,
  /^\/download\//,
  /^\/_next\//,
  /\.(pdf|png|jpe?g|webp|svg|ico|xml|txt)$/i,
];

// ─────────────────────────────────────────────────────────────────────────
//  Сървър
// ─────────────────────────────────────────────────────────────────────────

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/**
 * Вдига продукционен билд, не dev сървър.
 *
 * Разликата има значение точно за тази проверка: dev режимът вкарва
 * собствен overlay за грешки и допълнителни атрибути в DOM-а, а те се
 * появяват в резултата на axe като нарушения, които в продукция ги няма.
 */
export async function startServer({ dev = false } = {}) {
  const port = await freePort();
  const base = `http://localhost:${port}`;

  const child = spawn("npm", ["run", dev ? "dev" : "start", "--", "-p", String(port)], {
    cwd: root,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port) },
  });

  let log = "";
  child.stdout.on("data", (d) => (log += d));
  child.stderr.on("data", (d) => (log += d));

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/bg`, { redirect: "manual" });
      if (res.status < 500) return { base, child };
    } catch {
      // още не е готов
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  stopServer(child);
  throw new Error(`Сървърът не отговори за 90 секунди:\n${log.slice(-1500)}`);
}

export function stopServer(child) {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Обхождане
// ─────────────────────────────────────────────────────────────────────────

function skipped(pathname) {
  return SKIP.some((rule) => rule.test(pathname));
}

/**
 * Събира адресите на публичните страници, като следва връзките.
 *
 * `limit` пази от разрастване, ако някога се появи страница с много
 * динамични подстраници. Достигне ли се, се отчита изрично — тихото
 * отрязване би значело „проверено е всичко", когато не е.
 */
export async function crawl(page, base, { limit = 80 } = {}) {
  const seen = new Set();
  const queue = LOCALES.map((locale) => `/${locale}`);
  const found = [];
  let truncated = false;

  while (queue.length > 0) {
    const pathname = queue.shift();
    if (seen.has(pathname) || skipped(pathname)) continue;
    seen.add(pathname);

    if (found.length >= limit) {
      truncated = true;
      break;
    }

    const response = await page.goto(base + pathname, {
      waitUntil: "domcontentloaded",
    });

    // 404 и пренасочванията не се одитират като страници — но фактът,
    // че връзка води до 404, е дефект сам по себе си.
    const status = response?.status() ?? 0;
    if (status !== 200) {
      found.push({ pathname, status, broken: true });
      continue;
    }

    found.push({ pathname, status });

    const links = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
    );

    for (const href of links) {
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) continue;
      if (href.startsWith("http") && !href.startsWith(base)) continue;

      const url = new URL(href, base);
      if (url.origin !== new URL(base).origin) continue;
      // Заявките в адреса дават същата страница с друг филтър — не са
      // нова страница за целите на достъпността.
      if (!seen.has(url.pathname) && !skipped(url.pathname)) {
        queue.push(url.pathname);
      }
    }
  }

  return { pages: found, truncated };
}

// ─────────────────────────────────────────────────────────────────────────
//  Отчитане
// ─────────────────────────────────────────────────────────────────────────

export function report(title) {
  const problems = [];
  let checks = 0;

  return {
    ok(name, passed, detail = "") {
      checks += 1;
      if (!passed) problems.push({ name, detail });
      return passed;
    },
    problem(name, detail = "") {
      problems.push({ name, detail });
    },
    counted() {
      return checks;
    },
    summary() {
      console.log(`\n── ${title} ──`);
      if (problems.length === 0) {
        console.log(`✓ ${checks} проверки, нито един проблем.`);
        return 0;
      }
      console.log(`✗ ${problems.length} проблема от ${checks} проверки:\n`);
      for (const p of problems) {
        console.log(`  ✗ ${p.name}`);
        if (p.detail) {
          for (const line of String(p.detail).split("\n")) {
            console.log(`      ${line}`);
          }
        }
      }
      return problems.length;
    },
  };
}
