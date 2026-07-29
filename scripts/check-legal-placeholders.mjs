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

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.CHECK_LEGAL_STRICT === "1";

const SEARCH_ROOTS = ["app", "components"];
const MARKER = "AwaitingLegalText";

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "generated" || entry.startsWith("."))
      continue;

    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (/\.tsx?$/.test(full)) {
      files.push(full);
    }
  }
  return files;
}

const hits = [];

for (const searchRoot of SEARCH_ROOTS) {
  let files;
  try {
    files = walk(join(root, searchRoot));
  } catch {
    continue;
  }

  for (const file of files) {
    // Дефиницията на самия компонент не е употреба.
    if (file.endsWith("legal-page.tsx")) continue;

    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      if (!line.includes(`<${MARKER}`)) return;

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

if (hits.length === 0) {
  console.log("✓ Няма незапълнени правни текстове.");
  process.exit(0);
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
