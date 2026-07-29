#!/usr/bin/env node
// Контрастен одит на палитрата · WCAG 2.1
//
// Чете app/tokens.css, резолвира var() веригите и мери всяка двойка,
// която реално се среща в интерфейса. Формулата е от спецификацията.
//
//   npm run a11y:contrast
//
// Излиза с код 1 при провал — става за CI преди задача 23v.
//
// Защо съществува: „подбрахме достъпна палитра" е твърдение, което
// никой не проверява, докато не дойде одит. Директива (ЕС) 2019/882 е
// в сила от 28.06.2025 и WCAG 2.1 AA е задължителен — виж
// docs/ПРАВНИ-ИЗИСКВАНИЯ.md §6.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/tokens.css"), "utf8");

// ── Парсване ─────────────────────────────────────────────────────────────
// Хваща и `--x: #aabbcc;`, и `--x: var(--y);` в @theme, :root и .dark.

function parseBlock(source) {
  const vars = new Map();
  const re = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    vars.set(m[1], m[2].trim());
  }
  return vars;
}

const darkStart = css.indexOf(".dark {");
const lightSource = darkStart === -1 ? css : css.slice(0, darkStart);
const darkSource = darkStart === -1 ? "" : css.slice(darkStart);

const lightVars = parseBlock(lightSource);
// Тъмният режим наследява всичко и предефинира част от него.
const darkVars = new Map(lightVars);
for (const [k, v] of parseBlock(darkSource)) darkVars.set(k, v);

function resolve(name, vars, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Циклична препратка: ${name}`);
  seen.add(name);
  const raw = vars.get(name);
  if (!raw) throw new Error(`Няма такъв токен: ${name}`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  if (ref) return resolve(ref[1], vars, seen);
  return raw;
}

// ── Контраст ─────────────────────────────────────────────────────────────

function toRgb(color) {
  const hex = color.trim();
  const m = hex.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!m) throw new Error(`Неразпознат цвят: ${color}`);
  const v = m[1];
  const rgb = [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
  // Полупрозрачните гранични цветове (#ffffff1a) се сливат с фона на
  // тъмния режим, иначе мерим срещу нищо.
  if (m[2]) {
    const a = parseInt(m[2], 16) / 255;
    const base = [28, 26, 25]; // ink-950
    return rgb.map((c, i) => Math.round(c * a + base[i] * (1 - a)));
  }
  return rgb;
}

function luminance(color) {
  const [r, g, b] = toRgb(color).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// ── Двойките, които реално се срещат ─────────────────────────────────────
// 4.5 = нормален текст (AA). 3.0 = едър текст и нетекстови елементи,
// които носят информация (граница на поле, фокусен пръстен) — 1.4.11.

const TEXT = 4.5;
const NONTEXT = 3.0;

const PAIRS = [
  ["основен текст", "--foreground", "--background", TEXT],
  ["текст в карта", "--card-foreground", "--card", TEXT],
  ["вторичен текст", "--muted-foreground", "--background", TEXT],
  ["вторичен в карта", "--muted-foreground", "--card", TEXT],
  ["вторичен върху muted фон", "--muted-foreground", "--muted", TEXT],
  ["subtle като текст", "--color-subtle", "--background", TEXT],
  ["вторичен бутон", "--secondary-foreground", "--secondary", TEXT],
  ["акцент/kicker", "--primary", "--background", TEXT],
  ["акцент в карта", "--primary", "--card", TEXT],
  ["текст в основен бутон", "--primary-foreground", "--primary", TEXT],
  ["hover състояние", "--accent-foreground", "--accent", TEXT],
  ["текст на грешка", "--destructive", "--background", TEXT],
  ["успех като текст", "--color-success", "--background", TEXT],
  ["текст в успех-бутон", "--color-success-foreground", "--color-success", TEXT],
  ["предупреждение", "--color-warning-foreground", "--color-warning", TEXT],
  ["popover текст", "--popover-foreground", "--popover", TEXT],
  ["граница на поле", "--input", "--background", NONTEXT],
  ["фокусен пръстен", "--ring", "--background", NONTEXT],
  ["фокусен пръстен в карта", "--ring", "--card", NONTEXT],
  ["sidebar текст", "--sidebar-foreground", "--sidebar", TEXT],
  ["sidebar акцент", "--sidebar-accent-foreground", "--sidebar-accent", TEXT],
];

function audit(label, vars) {
  const rows = [];
  for (const [name, fgVar, bgVar, min] of PAIRS) {
    let r;
    try {
      r = ratio(resolve(fgVar, vars), resolve(bgVar, vars));
    } catch (err) {
      rows.push({ name, err: err.message });
      continue;
    }
    rows.push({ name, r, min, pass: r >= min });
  }

  const width = Math.max(...rows.map((x) => x.name.length));
  console.log(`\n${label}`);
  console.log("─".repeat(width + 26));
  for (const row of rows) {
    if (row.err) {
      console.log(`? ${row.name.padEnd(width)}  ${row.err}`);
      continue;
    }
    const mark = row.pass ? "✓" : "✗";
    const note = row.pass ? "" : `  ПАДА (трябва ${row.min})`;
    console.log(
      `${mark} ${row.name.padEnd(width)}  ${row.r.toFixed(2).padStart(6)}:1${note}`,
    );
  }
  return rows;
}

const light = audit("СВЕТЪЛ РЕЖИМ", lightVars);
const dark = audit("ТЪМЕН РЕЖИМ (админ)", darkVars);

const all = [...light, ...dark];
const failed = all.filter((r) => r.err || !r.pass);
const errored = all.filter((r) => r.err);

console.log(
  `\n${all.length} проверки · ${all.length - failed.length} минават · ${failed.length - errored.length} падат${
    errored.length ? ` · ${errored.length} неразпознати` : ""
  }\n`,
);

if (failed.length > 0) {
  console.log("Поправя се със смяна на стойност в app/tokens.css.\n");
  process.exit(1);
}
