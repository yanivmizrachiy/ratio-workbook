import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const inputHtml = path.resolve(process.argv[2] || 'preview/full-workbook.html');
const outputDir = path.resolve(process.argv[3] || 'preview/audit');

if (!fs.existsSync(inputHtml)) throw new Error(`Preview HTML not found: ${inputHtml}`);
fs.mkdirSync(outputDir, { recursive: true });
const pagesDir = path.join(outputDir, 'pages');
fs.mkdirSync(pagesDir, { recursive: true });

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
    };
  });

  return {
    htmlReady: document.documentElement.dataset.workbookReady === 'true',
    workbookError: document.documentElement.dataset.workbookError || null,
    declaredTaskCount: Number(document.documentElement.dataset.taskCount || 0),
    meta,
    teacherMarkers,
    teacherHeadingCount,
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
  renderedTaskKeys,
  pages: audit.physical,
};

fs.writeFileSync(path.join(outputDir, 'audit.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (failures.length > 0) process.exitCode = 1;