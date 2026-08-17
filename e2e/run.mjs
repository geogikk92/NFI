// ОРКЕСТРАТОРЪТ на end-to-end проверките · задача 24a.
//
//   npm run e2e            # всички
//   npm run e2e vhod       # само тези, чието име съдържа „vhod"
//
// ─────────────────────────────────────────────────────────────────────────
//  ЗАЩО СЪЩЕСТВУВА
// ─────────────────────────────────────────────────────────────────────────
// Досега пускането на проверките искаше три ръчни стъпки в правилния ред:
// вдигане на dev сървър на порт 3130, засяване на базата и после всяка
// проверка поотделно. Три стъпки, които се правят наум, се пропускат — а
// пропуснатият сийд дава провал, който изглежда като дефект в кода.
//
// Тук всичко е една команда: свободен порт, готов сървър, проверена база,
// всички проверки, събран резултат, изгасен сървър.

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// ─────────────────────────────────────────────────────────────────────────
//  Порт
// ─────────────────────────────────────────────────────────────────────────

/**
 * Свободен порт, поискан от системата.
 *
 * Зашитият 3130 значи, че две пускания се бият, а забравен стар сървър
 * кара проверките да минават срещу СТАР код — най-подвеждащият възможен
 * резултат.
 */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
//  База
// ─────────────────────────────────────────────────────────────────────────

/**
 * Базата трябва да е МИГРИРАНА и ЗАСЯТА, преди да тръгне каквото и да е.
 *
 * Проверките разчитат на сийднатите профили и курсове. Празна база ги
 * вали с „не намери елемента" — съобщение, което насочва към фронтенда,
 * а причината е друга.
 */
function prepareDatabase() {
  if (!process.env.DATABASE_URL) {
    // .env.local се чете от самите скриптове през --env-file-if-exists;
    // тук проверяваме само дали изобщо има конфигурация.
    const probe = spawnSync("node", ["-e", "process.exit(0)"], { cwd: root });
    if (probe.status !== 0) throw new Error("Node не тръгва.");
  }

  console.log("· Миграции…");
  const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (migrate.status !== 0) {
    console.error(migrate.stderr || migrate.stdout);
    throw new Error("Миграциите се провалиха.");
  }

  console.log("· Чистене на остатъци…");
  const clean = spawnSync("npm", ["run", "e2e:clean"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (clean.status !== 0) {
    console.error(clean.stderr || clean.stdout);
    throw new Error("Чистенето се провали.");
  }
  const cleanLine = (clean.stdout || "").split("\n").find((l) => l.startsWith("·"));
  if (cleanLine) console.log(`  ${cleanLine.slice(2)}`);

  console.log("· Сийд…");
  const seed = spawnSync("npm", ["run", "db:seed"], {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  if (seed.status !== 0) {
    console.error(seed.stderr || seed.stdout);
    throw new Error("Сийдът се провали.");
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  Сървър
// ─────────────────────────────────────────────────────────────────────────

/**
 * DEV сървър, не продукционен билд — нарочно.
 *
 * В продукция сесийната бисквитка се казва `__Host-nfi_session`, а
 * браузърът приема такова име само по https. По http://localhost я
 * изхвърля мълчаливо и всички проверки с вход падат по причина, която на
 * Vercel не съществува. (Обяснението е и в e2e/README.md.)
 */
async function startServer(port) {
  console.log(`· Вдигам сървър на порт ${port}…`);

  const server = spawn(
    "npx",
    ["next", "dev", "--turbopack", "-p", String(port)],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      // Своя процесна група: Next вдига дъщерни процеси и без това
      // убиването на родителя оставя порта зает до края на сесията.
      detached: true,
    },
  );

  let log = "";
  server.stdout.on("data", (chunk) => (log += chunk));
  server.stderr.on("data", (chunk) => (log += chunk));

  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 90_000;

  // Чака се ОТГОВОР, не съобщение в лога: Next пише „Ready" преди първата
  // компилация, а първата заявка след това още чака десетина секунди.
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Сървърът излезе с код ${server.exitCode}:\n${log.slice(-1500)}`);
    }

    try {
      const response = await fetch(`${base}/bg`, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        console.log("· Сървърът отговаря.");
        await warmUp(base);
        return { server, base };
      }
    } catch {
      // още не е готов
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  server.kill("SIGTERM");
  throw new Error(`Сървърът не отговори за 90 секунди:\n${log.slice(-1500)}`);
}

/**
 * Отваря веднъж маршрутите, които проверките ползват — за да се компилират
 * ПРЕДИ да почне измерването.
 *
 * При `next dev` всеки маршрут се компилира при първото си посещение. Без
 * това стопляне цената се плаща ВЪТРЕ в проверките, и то на машина, вече
 * натоварена от предишните — оттам идваше трепкането: `sertifikati.mjs`
 * пуснат сам винаги минаваше, а в пълен пробег падаше през път точно на
 * издаването (най-тежката заявка: брояч + PDF с вградени шрифтове).
 * Вдигането на срока от 20 на 45 s не помогна, което показа, че причината
 * не е в числото.
 *
 * Продукционен билд би решил компилацията, но НЕ СТАВА: там бисквитката е
 * `__Host-nfi_session`, а браузърът приема това име само по https — виж
 * бележката при startServer. Затова се стопля, вместо да се сменя режимът.
 *
 * Админските адреси отговарят 404 без вход и това е достатъчно: маршрутът
 * се компилира и без успешен достъп. (17.08.2026.)
 */
async function warmUp(base) {
  const routes = [
    "/bg/anmelden",
    "/bg/registrieren",
    "/bg/profil",
    "/bg/kurse",
    "/bg/shop",
    "/bg/warenkorb",
    "/bg/materialien",
    "/bg/einstufungstest",
    "/de/kurse",
    "/admin",
    "/admin/anketi",
    "/admin/kursove",
    "/admin/kursove/nov",
    "/admin/produkti",
    "/admin/promocii",
    "/admin/prevodi",
    "/admin/sertifikati",
    "/admin/sertifikati/nov",
    "/admin/mediya",
    "/admin/mediya/nov",
    "/admin/materiali",
    "/admin/materiali/nov",
    "/admin/dnevnik",
  ];

  process.stdout.write(`· Стоплям ${routes.length} маршрута…`);

  for (const route of routes) {
    try {
      await fetch(base + route, { signal: AbortSignal.timeout(60_000) });
    } catch {
      // Провалът тук не е дефект: маршрутът може да иска вход или да
      // отговори бавно. Целта е компилацията, не отговорът.
    }
  }

  console.log(" готово.\n");
}

// ─────────────────────────────────────────────────────────────────────────
//  Проверките
// ─────────────────────────────────────────────────────────────────────────

/** Всички .mjs файлове без тези, които започват с долна черта. */
function specs(filter) {
  return readdirSync(here)
    .filter((name) => name.endsWith(".mjs"))
    .filter((name) => !name.startsWith("_") && name !== "run.mjs")
    .filter((name) => !filter || name.includes(filter))
    .sort();
}

/**
 * Всяка проверка е ОТДЕЛЕН процес.
 *
 * Така една паднала не сваля останалите, глобалното ѝ състояние не тече в
 * следващата, а изходният ѝ код е чист сигнал. Цената е по едно пускане
 * на браузър на файл — приемлива за десетина файла.
 */
function runSpec(name, base) {
  return new Promise((resolve) => {
    const child = spawn("node", [join(here, name)], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, E2E_BASE_URL: base },
    });

    child.on("exit", (code) => resolve({ name, ok: code === 0 }));
  });
}

// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const filter = process.argv[2];
  const files = specs(filter);

  if (files.length === 0) {
    console.error(filter ? `Няма проверка с „${filter}".` : "Няма проверки.");
    process.exit(1);
  }

  console.log(`End-to-end: ${files.length} проверки\n`);

  prepareDatabase();

  const port = await freePort();
  const { server, base } = await startServer(port);

  const results = [];

  try {
    for (const file of files) {
      results.push(await runSpec(file, base));
    }
  } finally {
    // SIGTERM на групата: Next вдига дъщерни процеси и убиването само на
    // родителя оставя порта зает.
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
  }

  const failed = results.filter((r) => !r.ok);

  console.log("\n═══════════════════════════════════");
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
  console.log(
    `\n${results.length - failed.length}/${results.length} проверки минават`,
  );

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
});
