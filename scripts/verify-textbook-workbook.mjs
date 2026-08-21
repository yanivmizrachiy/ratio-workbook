import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const inputHtml = path.resolve(process.argv[2] || 'preview/full-workbook.html');
const outputDir = path.resolve(process.argv[3] || 'preview/audit');

if (!fs.existsSync(inputHtml)) throw new Error(`Preview HTML not found: ${inputHtml}`);
fs.mkdirSync(outputDir, { recursive: true });
const pagesDir = path.join(outputDir, 'pages');
const graphicsDir = path.join(outputDir, 'graphics');
const grayscaleDir = path.join(outputDir, 'grayscale');
fs.mkdirSync(pagesDir, { recursive: true });
fs.mkdirSync(graphicsDir, { recursive: true });
fs.mkdirSync(grayscaleDir, { recursive: true });

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function inspectPdf(buffer) {
  const text = buffer.toString('latin1');
  const explicitPageObjects = (text.match(/\/Type\s*\/Page\b/g) || []).length;
  const declaredPageCounts = [...text.matchAll(/\/Type\s*\/Pages\b[\s\S]{0,320}?\/Count\s+(\d+)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isInteger(value) && value > 0);
  const declaredMax = declaredPageCounts.length > 0 ? Math.max(...declaredPageCounts) : 0;
  return {
    headerValid: text.startsWith('%PDF-'),
    eofValid: text.includes('%%EOF'),
    explicitPageObjects,
    declaredMax,
    pageCount: Math.max(explicitPageObjects, declaredMax),
    bytes: buffer.length,
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 });
const consoleErrors = [];
const pageErrors = [];
const externalRequests = [];

page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
page.on('request', (request) => {
  try {
    const url = new URL(request.url());
    if (url.protocol === 'http:' || url.protocol === 'https:') externalRequests.push(request.url());
  } catch {
    // Ignore browser internals.
  }
});

await page.goto(pathToFileURL(inputHtml).href, { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.dataset.workbookReady === 'true', null, { timeout: 30_000 });
await page.evaluate(() => document.fonts?.ready);

const audit = await page.evaluate(() => {
  const metaNode = document.getElementById('ratio-build-meta');
  const meta = metaNode?.textContent ? JSON.parse(metaNode.textContent) : null;
  const pages = [...document.querySelectorAll('.wb-page')];
  const teacherMarkers = document.querySelectorAll('.teacher-intro-page').length;
  const teacherHeadingCount = [...document.querySelectorAll('.page-header-title')]
    .filter((node) => node.textContent?.includes('למורה')).length;

  const numericAttrs = ['x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','width','height'];
  const svgs = [...document.querySelectorAll('.wb-page svg')];
  const graphicRows = svgs.map((svg, index) => {
    const vb = svg.viewBox?.baseVal;
    let invalidNumericAttributes = 0;
    let invalidDimensions = 0;
    const shapes = [...svg.querySelectorAll('line,rect,circle,ellipse,polygon,polyline,path,text')];
    for (const shape of shapes) {
      for (const attr of numericAttrs) {
        if (!shape.hasAttribute(attr)) continue;
        const raw = shape.getAttribute(attr) || '';
        if (/NaN|Infinity/i.test(raw)) invalidNumericAttributes++;
      }
      if (shape.tagName.toLowerCase() === 'rect') {
        const w = Number(shape.getAttribute('width'));
        const h = Number(shape.getAttribute('height'));
        if (Number.isFinite(w) && w <= 0) invalidDimensions++;
        if (Number.isFinite(h) && h <= 0) invalidDimensions++;
      }
      if (shape.tagName.toLowerCase() === 'circle') {
        const r = Number(shape.getAttribute('r'));
        if (Number.isFinite(r) && r <= 0) invalidDimensions++;
      }
    }
    const accessible = svg.getAttribute('aria-hidden') === 'true'
      || Boolean(svg.getAttribute('aria-label'))
      || Boolean(svg.querySelector('title')?.textContent?.trim());
    return {
      index: index + 1,
      family: svg.getAttribute('data-graphic-family') || 'unclassified',
      hasViewBox: svg.hasAttribute('viewBox') && Boolean(vb && vb.width > 0 && vb.height > 0),
      preserveAspectRatio: svg.getAttribute('preserveAspectRatio') || '',
      shapeRendering: svg.getAttribute('shape-rendering') || '',
      textRendering: svg.getAttribute('text-rendering') || '',
      accessible,
      rasterImages: svg.querySelectorAll('image').length,
      invalidNumericAttributes,
      invalidDimensions,
      shapeCount: shapes.length,
    };
  });
  const familyCounts = {};
  for (const row of graphicRows) familyCounts[row.family] = (familyCounts[row.family] || 0) + 1;

  const physical = pages.map((node, index) => {
    const body = node.querySelector('.wb-body');
    const rect = node.getBoundingClientRect();
    const numberText = node.querySelector('.page-number')?.textContent?.trim() || '';
    const svgOutside = [...node.querySelectorAll('svg')].filter((svg) => {
      const r = svg.getBoundingClientRect();
      return r.left < rect.left - 1 || r.right > rect.right + 1 || r.top < rect.top - 1 || r.bottom > rect.bottom + 1;
    }).length;
    const imagesWithoutAlt = [...node.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt')).length;
    const groups = [...node.querySelectorAll('.wb-group[data-task-key]')];
    return {
      physicalPage: index + 1,
      displayedNumber: Number(numberText),
      chapter: node.getAttribute('data-textbook-chapter') || '',
      width: rect.width,
      height: rect.height,
      bodyClientHeight: body?.clientHeight ?? 0,
      bodyScrollHeight: body?.scrollHeight ?? 0,
      bodyOverflowPx: body ? Math.max(0, body.scrollHeight - body.clientHeight) : null,
      svgOutside,
      imagesWithoutAlt,
      taskKeys: groups.map((group) => group.getAttribute('data-task-key')).filter(Boolean),
      sourceKeys: [...new Set(groups.map((group) => group.getAttribute('data-source-key')).filter(Boolean))],
      graphicFamilies: [...new Set([...node.querySelectorAll('svg[data-graphic-family]')]
        .map((svg) => svg.getAttribute('data-graphic-family')).filter(Boolean))],
    };
  });

  return {
    htmlReady: document.documentElement.dataset.workbookReady === 'true',
    workbookError: document.documentElement.dataset.workbookError || null,
    graphicsNormalized: document.documentElement.dataset.graphicsNormalized === 'true',
    declaredGraphicsCount: Number(document.documentElement.dataset.graphicsCount || 0),
    declaredTaskCount: Number(document.documentElement.dataset.taskCount || 0),
    meta,
    teacherMarkers,
    teacherHeadingCount,
    graphics: {
      total: graphicRows.length,
      missingViewBox: graphicRows.filter((row) => !row.hasViewBox).length,
      missingPreserveAspectRatio: graphicRows.filter((row) => row.preserveAspectRatio !== 'xMidYMid meet').length,
      missingPrecision: graphicRows.filter((row) => row.shapeRendering !== 'geometricPrecision' || row.textRendering !== 'geometricPrecision').length,
      inaccessible: graphicRows.filter((row) => !row.accessible).length,
      rasterImages: graphicRows.reduce((sum, row) => sum + row.rasterImages, 0),
      invalidNumericAttributes: graphicRows.reduce((sum, row) => sum + row.invalidNumericAttributes, 0),
      invalidDimensions: graphicRows.reduce((sum, row) => sum + row.invalidDimensions, 0),
      canvas: document.querySelectorAll('.wb-page canvas').length,
      familyCounts,
      rows: graphicRows,
    },
    physical,
  };
});

const failures = [];
if (!audit.htmlReady) failures.push('Workbook never reached ready state.');
if (audit.workbookError) failures.push(`Paginator reported: ${audit.workbookError}`);
if (!audit.meta) failures.push('Missing ratio-build-meta.');
if (audit.meta?.teacherPages !== 0) failures.push(`Build metadata reports ${audit.meta?.teacherPages} teacher pages.`);
if (audit.teacherMarkers !== 0) failures.push(`Found ${audit.teacherMarkers} teacher-intro-page elements.`);
if (audit.teacherHeadingCount !== 0) failures.push(`Found ${audit.teacherHeadingCount} teacher headings.`);
if (audit.meta?.firstStudentPage !== 1) failures.push('Metadata firstStudentPage is not 1.');
if (!Number.isInteger(audit.meta?.semanticPageCount) || audit.meta.semanticPageCount <= 0) failures.push('Invalid semanticPageCount.');
if (!Number.isInteger(audit.meta?.taskCount) || audit.meta.taskCount <= 0) failures.push('Invalid taskCount.');
if (!Array.isArray(audit.meta?.taskSequence) || audit.meta.taskSequence.length !== audit.meta?.taskCount) failures.push('Invalid taskSequence metadata.');
if (!Array.isArray(audit.meta?.textbookChapterOrder) || audit.meta.textbookChapterOrder.length === 0) failures.push('Invalid textbookChapterOrder metadata.');

if (!audit.graphicsNormalized) failures.push('Mathematical graphics normalizer did not run.');
if (audit.graphics.total !== audit.declaredGraphicsCount) failures.push(`Graphics count mismatch: DOM=${audit.graphics.total}, declared=${audit.declaredGraphicsCount}.`);
if (audit.graphics.missingViewBox > 0) failures.push(`Found ${audit.graphics.missingViewBox} rendered SVG(s) without a valid viewBox.`);
if (audit.graphics.missingPreserveAspectRatio > 0) failures.push(`Found ${audit.graphics.missingPreserveAspectRatio} rendered SVG(s) without canonical preserveAspectRatio.`);
if (audit.graphics.missingPrecision > 0) failures.push(`Found ${audit.graphics.missingPrecision} rendered SVG(s) without geometric/text precision.`);
if (audit.graphics.inaccessible > 0) failures.push(`Found ${audit.graphics.inaccessible} rendered SVG(s) without aria-hidden or an accessible name.`);
if (audit.graphics.rasterImages > 0) failures.push(`Found ${audit.graphics.rasterImages} raster <image> node(s) inside mathematical SVG.`);
if (audit.graphics.canvas > 0) failures.push(`Found ${audit.graphics.canvas} canvas element(s) in workbook output.`);
if (audit.graphics.invalidNumericAttributes > 0) failures.push(`Found ${audit.graphics.invalidNumericAttributes} invalid SVG numeric attribute(s).`);
if (audit.graphics.invalidDimensions > 0) failures.push(`Found ${audit.graphics.invalidDimensions} non-positive SVG dimension(s).`);

const displayedNumbers = audit.physical.map((item) => item.displayedNumber);
const expectedNumbers = Array.from({ length: audit.physical.length }, (_, index) => index + 1);
if (JSON.stringify(displayedNumbers) !== JSON.stringify(expectedNumbers)) {
  failures.push(`Physical page numbers are not sequential from 1: ${displayedNumbers.join(', ')}`);
}

const renderedTaskKeys = audit.physical.flatMap((item) => item.taskKeys);
const expectedTaskKeys = Array.isArray(audit.meta?.taskSequence) ? audit.meta.taskSequence.map((entry) => entry.taskKey) : [];
if (renderedTaskKeys.length !== audit.meta?.taskCount || audit.declaredTaskCount !== audit.meta?.taskCount) {
  failures.push(`Rendered task count mismatch: DOM=${renderedTaskKeys.length}, declared=${audit.declaredTaskCount}, meta=${audit.meta?.taskCount}.`);
}
if (new Set(renderedTaskKeys).size !== renderedTaskKeys.length) failures.push('Rendered workbook contains duplicate task keys.');
if (JSON.stringify(renderedTaskKeys) !== JSON.stringify(expectedTaskKeys)) {
  const firstMismatch = renderedTaskKeys.findIndex((key, index) => key !== expectedTaskKeys[index]);
  failures.push(`Rendered task order differs from metadata at position ${firstMismatch + 1}: rendered=${renderedTaskKeys[firstMismatch] || 'missing'}, expected=${expectedTaskKeys[firstMismatch] || 'missing'}.`);
}

const chapterOrder = audit.meta?.textbookChapterOrder || [];
const chapterIndex = new Map(chapterOrder.map((chapter, index) => [chapter, index]));
let previousChapter = -1;
const seenChapters = new Set();
for (const item of audit.physical) {
  if (!chapterIndex.has(item.chapter)) {
    failures.push(`Physical page ${item.physicalPage}: unknown chapter ${item.chapter}.`);
    continue;
  }
  const index = chapterIndex.get(item.chapter);
  if (index < previousChapter) failures.push(`Physical page ${item.physicalPage}: chapter order moved backwards to ${item.chapter}.`);
  previousChapter = Math.max(previousChapter, index);
  seenChapters.add(item.chapter);
}
for (const chapter of chapterOrder) if (!seenChapters.has(chapter)) failures.push(`Chapter has no physical page: ${chapter}.`);

for (const item of audit.physical) {
  if (Math.abs(item.width - 793.7) > 3) failures.push(`Page ${item.physicalPage}: A4 width drift (${item.width}px).`);
  if (Math.abs(item.height - 1122.5) > 4) failures.push(`Page ${item.physicalPage}: A4 height drift (${item.height}px).`);
  if (item.bodyOverflowPx != null && item.bodyOverflowPx > 2) failures.push(`Page ${item.physicalPage}: body overflow ${item.bodyOverflowPx}px.`);
  if (item.svgOutside > 0) failures.push(`Page ${item.physicalPage}: ${item.svgOutside} SVG element(s) extend outside the A4 page.`);
  if (item.imagesWithoutAlt > 0) failures.push(`Page ${item.physicalPage}: ${item.imagesWithoutAlt} image(s) missing alt.`);
}

if (externalRequests.length > 0) failures.push(`Preview made ${externalRequests.length} external network request(s).`);
if (consoleErrors.length > 0) failures.push(`Browser console errors: ${consoleErrors.join(' | ')}`);
if (pageErrors.length > 0) failures.push(`Browser page errors: ${pageErrors.join(' | ')}`);

const pageLocators = page.locator('.wb-page');
for (let index = 0; index < audit.physical.length; index++) {
  await pageLocators.nth(index).screenshot({
    path: path.join(pagesDir, `page-${String(index + 1).padStart(3, '0')}.png`),
    animations: 'disabled',
  });
}

const representativeHashes = {};
const families = Object.keys(audit.graphics.familyCounts).sort();
await page.addStyleTag({ content: '.audit-grayscale .math-graphic{filter:grayscale(1)!important}' });
for (const family of families) {
  const locator = page.locator(`svg.math-graphic[data-graphic-family="${family}"]`).first();
  if (await locator.count() === 0) continue;
  const colorPath = path.join(graphicsDir, `${family}.png`);
  const colorBuffer = await locator.screenshot({ path: colorPath, animations: 'disabled' });
  representativeHashes[family] = sha256(colorBuffer);
  await page.evaluate(() => document.documentElement.classList.add('audit-grayscale'));
  await locator.screenshot({ path: path.join(grayscaleDir, `${family}.png`), animations: 'disabled' });
  await page.evaluate(() => document.documentElement.classList.remove('audit-grayscale'));
}

const goldenPath = path.join(projectRoot, 'src', 'data', 'graphicsGoldenHashes.json');
const goldenCandidate = { schemaVersion: 1, families: representativeHashes };
fs.writeFileSync(path.join(outputDir, 'graphics-golden-candidate.json'), `${JSON.stringify(goldenCandidate, null, 2)}\n`, 'utf8');
if (fs.existsSync(goldenPath)) {
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const expectedFamilies = golden?.families || {};
  if (JSON.stringify(Object.keys(expectedFamilies).sort()) !== JSON.stringify(Object.keys(representativeHashes).sort())) {
    failures.push('Graphics golden family set changed; review and explicitly update graphicsGoldenHashes.json.');
  } else {
    for (const family of Object.keys(expectedFamilies)) {
      if (expectedFamilies[family] !== representativeHashes[family]) failures.push(`Visual regression in graphics family: ${family}.`);
    }
  }
}

await page.setViewportSize({ width: 390, height: 844 });
await page.emulateMedia({ media: 'screen' });
await page.evaluate(() => window.dispatchEvent(new Event('resize')));
await page.waitForTimeout(50);
await page.emulateMedia({ media: 'print' });
const printMetrics = await page.locator('.wb-page').evaluateAll((nodes) => nodes.map((node, index) => {
  const rect = node.getBoundingClientRect();
  return { page: index + 1, width: rect.width, height: rect.height, zoom: getComputedStyle(node).zoom || '1' };
}));
for (const metric of printMetrics) {
  if (Math.abs(metric.width - 793.7) > 3) failures.push(`Print page ${metric.page}: A4 width drift after narrow viewport (${metric.width}px).`);
  if (Math.abs(metric.height - 1122.5) > 4) failures.push(`Print page ${metric.page}: A4 height drift after narrow viewport (${metric.height}px).`);
  if (metric.zoom !== '1' && metric.zoom !== 'normal') failures.push(`Print page ${metric.page}: zoom is ${metric.zoom}, expected 1.`);
}

const pdfPath = path.join(outputDir, 'ratio-workbook-preview.pdf');
const pdfBuffer = await page.pdf({
  printBackground: true,
  preferCSSPageSize: true,
  tagged: true,
});
fs.writeFileSync(pdfPath, pdfBuffer);
const pdfAudit = inspectPdf(pdfBuffer);
if (!pdfAudit.headerValid || !pdfAudit.eofValid) failures.push('Generated PDF is structurally incomplete.');
if (pdfAudit.bytes < 10_000) failures.push(`Generated PDF is unexpectedly small (${pdfAudit.bytes} bytes).`);
if (pdfAudit.pageCount !== audit.physical.length) {
  failures.push(`Generated PDF page count mismatch: PDF=${pdfAudit.pageCount}, DOM=${audit.physical.length}.`);
}

const result = {
  generatedAt: new Date().toISOString(),
  inputHtml,
  status: failures.length === 0 ? 'pass' : 'fail',
  failures,
  consoleErrors,
  pageErrors,
  externalRequests,
  semanticPages: audit.meta?.semanticPageCount ?? null,
  taskUnits: audit.meta?.taskCount ?? null,
  physicalPages: audit.physical.length,
  pdfPages: pdfAudit.pageCount,
  pdfBytes: pdfAudit.bytes,
  pdfExplicitPageObjects: pdfAudit.explicitPageObjects,
  pdfDeclaredMaxPages: pdfAudit.declaredMax,
  teacherPages: audit.meta?.teacherPages ?? null,
  firstStudentPage: audit.meta?.firstStudentPage ?? null,
  sourceCommit: audit.meta?.sourceCommit ?? null,
  buildId: audit.meta?.buildId ?? null,
  sourceWorkbookSha256: audit.meta?.sourceWorkbookSha256 ?? null,
  taskSequenceSha256: audit.meta?.taskSequenceSha256 ?? null,
  contentSha256: audit.meta?.contentSha256 ?? null,
  chapterOrder: audit.meta?.textbookChapterOrder ?? null,
  graphics: audit.graphics,
  graphicRepresentativeHashes: representativeHashes,
  renderedTaskKeys,
  pages: audit.physical,
};

fs.writeFileSync(path.join(outputDir, 'audit.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (failures.length > 0) process.exitCode = 1;
