#!/usr/bin/env node
// Проверка: няма ли останал незапълнен правен текст.
//
//   npm run check:legal
//
// В CI при PR — само предупреждава (нормално е текстовете да липсват през
// цялата разработка). При CHECK_LEGAL_STRICT=1 излиза с код 1 — така се
// пуска преди деплой в продукция, където празен правен раздел, който
// изглежда завършен, е по-опасен от липсваща страница.
//
// Виж docs/ПРАВНИ-ИЗИСКВАНИЯ.md, отворен въпрос 6.

import { readdirSync, readFileSync, lstatSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.CHECK_LEGAL_STRICT === "1";

const SEARCH_ROOTS = ["app", "components"];
// ДВА вида блокиращ маркер, не един:
//   • AwaitingLegalText   — липсва текст от юрист;
//   • MissingRetentionJob — текстът е верен, но кодът не го спазва
//     (обещан срок за изтриване без задача, която да трие).
// Вторият е по-коварен — разделът изглежда завършен и звучи вярно, а е
// невярно твърдение. Затова спира деплоя точно като първия.
const MARKERS = ["AwaitingLegalText", "MissingRetentionJob"];

// lstat, НЕ stat: stat следва symlink-ове и хвърля ENOENT при счупен.
// Грешката се разпространяваше до външния catch, той правеше `continue`,
// и вече намерените файлове в този корен се губеха — тоест ЕДИН счупен
// symlink караше strict проверката да излезе с код 0 и да пусне деплой с
// незапълнени правни текстове. Проверка, която се проваля наопаки, е
// по-лоша от липсваща.
function walk(dir, files = [], problems = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    problems.push(`${dir}: ${error.message}`);
    return files;
  }

  for (const entry of entries) {
    if (entry === "node_modules" || entry === "generated" || entry.startsWith("."))
      continue;

    const full = join(dir, entry);

    let stats;
    try {
      stats = lstatSync(full);
    } catch (error) {
      problems.push(`${full}: ${error.message}`);
      continue;
    }

    // Symlink-ове се пропускат нарочно: няма причина правен текст да е
    // зад symlink, а следването им води до цикли.
    if (stats.isSymbolicLink()) {
      problems.push(`${full}: symlink, пропуснат`);
      continue;
    }

    if (stats.isDirectory()) {
      walk(full, files, problems);
    } else if (stats.isFile() && /\.tsx?$/.test(full)) {
      files.push(full);
    }
  }

  return files;
}

const hits = [];
const problems = [];
let scanned = 0;

for (const searchRoot of SEARCH_ROOTS) {
  const files = walk(join(root, searchRoot), [], problems);
  scanned += files.length;

  for (const file of files) {
    // Дефиницията на самия компонент не е употреба.
    if (file.endsWith("legal-page.tsx")) continue;

    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      if (!MARKERS.some((marker) => line.includes(`<${marker}`))) return;

      // Изважда what="…" от СЛЕДВАЩИТЕ редове на този елемент, не от
      // първото срещане в файла — иначе всички повторения на един и същ
      // ред получават описанието на първото.
      const window = lines.slice(index, index + 6).join("\n");
      const match = window.match(/what=(?:\{`|")([^`"]{0,140})/);

      hits.push({
        file: relative(root, file),
        line: index + 1,
        what: match ? match[1] : "(без описание)",
      });
    });
  }
}

// Проблем при обхождането означава, че проверката НЕ е видяла всичко —
// това не бива да минава за „чисто“.
if (problems.length > 0) {
  console.log(`\n! ${problems.length} проблема при обхождането:\n`);
  for (const problem of problems) console.log(`  ${problem}`);
  console.log();
}

if (hits.length === 0 && problems.length === 0) {
  console.log(`✓ Няма незапълнени правни текстове (${scanned} файла).`);
  process.exit(0);
}

if (hits.length === 0 && problems.length > 0) {
  console.log(
    "Няма намерени маркери, но обхождането беше непълно — не е доказано чисто.",
  );
  process.exit(strict ? 1 : 0);
}

const byFile = new Map();
for (const hit of hits) {
  if (!byFile.has(hit.file)) byFile.set(hit.file, []);
  byFile.get(hit.file).push(hit);
}

console.log(
  `\n${strict ? "✗" : "!"} ${hits.length} незапълнени правни текста в ${byFile.size} файла:\n`,
);

for (const [file, fileHits] of byFile) {
  console.log(`  ${file}`);
  for (const hit of fileHits) {
    console.log(`    :${hit.line}  ${hit.what}`);
  }
  console.log();
}

if (strict) {
  console.log(
    "Тези страници НЕ бива да се публикуват. Текстовете идват от юрист —\n" +
      "виж docs/ПРАВНИ-ИЗИСКВАНИЯ.md, отворен въпрос 6.\n",
  );
  process.exit(1);
}

console.log(
  "Това е очаквано през разработката. Преди деплой се пуска с\n" +
    "CHECK_LEGAL_STRICT=1 и тогава спира пускането.\n",
);
