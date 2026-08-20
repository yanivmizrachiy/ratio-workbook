import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const sourceRoot = path.join(root, 'src', 'components', 'worksheet');
const write = process.argv.includes('--write');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function count(text, re) {
  return [...text.matchAll(re)].length;
}

const files = walk(sourceRoot);
const fileRows = [];
const colors = new Map();
const strokeWidths = new Map();
const shapes = { line: 0, rect: 0, circle: 0, polygon: 0, polyline: 0, path: 0, text: 0, pattern: 0 };
let svgCount = 0;
let missingViewBox = 0;
let inlineSvgStyle = 0;
let rasterImages = 0;
let canvasCount = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const svgTags = [...text.matchAll(/<svg\b[^>]*>/g)].map((m) => m[0]);
  const row = {
    file: rel(file),
    svg: svgTags.length,
    missingViewBox: svgTags.filter((tag) => !/\bviewBox\s*=/.test(tag)).length,
    inlineSvgStyle: svgTags.filter((tag) => /\bstyle\s*=/.test(tag)).length,
    img: count(text, /<img\b/g),
    canvas: count(text, /<canvas\b/g),
  };
  if (row.svg || row.img || row.canvas) fileRows.push(row);
  svgCount += row.svg;
  missingViewBox += row.missingViewBox;
  inlineSvgStyle += row.inlineSvgStyle;
  rasterImages += row.img;
  canvasCount += row.canvas;

  for (const shape of Object.keys(shapes)) shapes[shape] += count(text, new RegExp(`<${shape}\\b`, 'g'));
  for (const m of text.matchAll(/(?:stroke|fill)\s*=\s*["'](#[0-9a-fA-F]{3,8})["']/g)) {
    const key = m[1].toLowerCase();
    colors.set(key, (colors.get(key) || 0) + 1);
  }
  for (const m of text.matchAll(/strokeWidth\s*=\s*(?:\{)?["']?([0-9.]+)["']?(?:\})?/g)) {
    const key = m[1];
    strokeWidths.set(key, (strokeWidths.get(key) || 0) + 1);
  }
}

const result = {
  generatedAt: new Date().toISOString(),
  sourceRoot: rel(sourceRoot),
  sourceFilesWithGraphics: fileRows.length,
  sourceSvgTags: svgCount,
  sourceSvgMissingViewBox: missingViewBox,
  sourceSvgInlineStyle: inlineSvgStyle,
  rasterImageTags: rasterImages,
  canvasTags: canvasCount,
  shapes,
  colors: Object.fromEntries([...colors.entries()].sort((a, b) => b[1] - a[1])),
  strokeWidths: Object.fromEntries([...strokeWidths.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
  files: fileRows,
};

if (write) {
  const out = path.join(root, 'preview', 'graphics-inventory-source.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify(result, null, 2));

const failures = [];
if (rasterImages > 0) failures.push(`Found ${rasterImages} raster <img> tag(s) inside worksheet source.`);
if (canvasCount > 0) failures.push(`Found ${canvasCount} <canvas> tag(s); mathematical graphics must remain vector/DOM.`);
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
}
