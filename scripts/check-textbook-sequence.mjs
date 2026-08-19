import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function extractPageContent(markup, key) {
  const marker = '<div class="page-content">';
  const start = markup.indexOf(marker);
  if (start === -1) throw new Error(`Page ${key} has no .page-content element.`);
  return markup.slice(start + marker.length).replace(/<\/div><\/div>$/, '');
}

function taskKeysForPage(key, markup) {
  const inner = extractPageContent(markup, key);
  const groups = inner
    .split('<div class="q-separator"></div>')
    .map((group) => group.trim())
    .filter(Boolean);
  if (groups.length === 0) throw new Error(`Page ${key} has no task groups.`);
  return groups.map((_, index) => `${key}#${index + 1}`);
}

const server = await createServer({
  root: projectRoot,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'error',
});

try {
  const pagesModule = await server.ssrLoadModule('/src/data/worksheetPages.tsx');
  const baselineModule = await server.ssrLoadModule('/src/data/contentBaseline.ts');
  const sequenceModule = await server.ssrLoadModule('/src/data/taskSequence.ts');

  const pages = pagesModule.WORKSHEET_PAGES;
  const baseline = baselineModule.PRE_REORDER_PAGE_MARKUP_SHA256;
  const baselineWorkbookSha = baselineModule.PRE_REORDER_WORKBOOK_SHA256;
  const sequence = sequenceModule.TEXTBOOK_TASK_SEQUENCE;
  const chapterOrder = sequenceModule.TEXTBOOK_CHAPTER_ORDER;

  if (!Array.isArray(pages) || pages.length === 0) throw new Error('WORKSHEET_PAGES must be non-empty.');
  if (!baseline || typeof baseline !== 'object') throw new Error('Missing pre-reorder content baseline.');
  if (!Array.isArray(sequence) || sequence.length === 0) throw new Error('TEXTBOOK_TASK_SEQUENCE must be non-empty.');
  if (!Array.isArray(chapterOrder) || chapterOrder.length === 0) throw new Error('TEXTBOOK_CHAPTER_ORDER must be non-empty.');

  const sourceKeys = pages.map((page) => page.key);
  const baselineKeys = Object.keys(baseline);
  if (sourceKeys.length !== baselineKeys.length || sourceKeys.some((key) => !baselineKeys.includes(key))) {
    throw new Error(`Source page set changed: source=${sourceKeys.length}, baseline=${baselineKeys.length}.`);
  }

  const pageHashes = [];
  const generatedTaskKeys = [];
  for (const page of pages) {
    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null, page.component()));
    const actualSha = sha256(markup);
    const expectedSha = baseline[page.key];
    if (!expectedSha) throw new Error(`Missing baseline hash for ${page.key}.`);
    if (actualSha !== expectedSha) {
      throw new Error(`Content changed in ${page.key}: expected ${expectedSha}, got ${actualSha}. Reordering is allowed; content editing is not.`);
    }
    pageHashes.push(`${page.key}:${actualSha}`);
    generatedTaskKeys.push(...taskKeysForPage(page.key, markup));
  }

  const actualWorkbookSha = sha256(pageHashes.join('\n'));
  if (actualWorkbookSha !== baselineWorkbookSha) {
    throw new Error(`Workbook source hash changed: expected ${baselineWorkbookSha}, got ${actualWorkbookSha}.`);
  }

  const sequenceTaskKeys = sequence.map((entry) => entry.taskKey);
  const sequenceUnique = new Set(sequenceTaskKeys);
  if (sequenceUnique.size !== sequenceTaskKeys.length) {
    throw new Error(`Task sequence contains ${sequenceTaskKeys.length - sequenceUnique.size} duplicate task key(s).`);
  }

  const generatedSet = new Set(generatedTaskKeys);
  const sequenceSet = new Set(sequenceTaskKeys);
  const missing = generatedTaskKeys.filter((key) => !sequenceSet.has(key));
  const unknown = sequenceTaskKeys.filter((key) => !generatedSet.has(key));
  if (missing.length || unknown.length || generatedTaskKeys.length !== sequenceTaskKeys.length) {
    throw new Error(`Task coverage mismatch. Generated=${generatedTaskKeys.length}, sequence=${sequenceTaskKeys.length}, missing=${missing.join(', ') || 'none'}, unknown=${unknown.join(', ') || 'none'}.`);
  }

  const chapterIndex = new Map(chapterOrder.map((chapter, index) => [chapter, index]));
  let previousChapterIndex = -1;
  const chapterCounts = Object.fromEntries(chapterOrder.map((chapter) => [chapter, 0]));
  for (const entry of sequence) {
    if (!chapterIndex.has(entry.chapter)) throw new Error(`Unknown textbook chapter: ${entry.chapter}`);
    const currentIndex = chapterIndex.get(entry.chapter);
    if (currentIndex < previousChapterIndex) {
      throw new Error(`Chapter order regressed at ${entry.taskKey}: ${entry.chapter}.`);
    }
    previousChapterIndex = currentIndex;
    chapterCounts[entry.chapter] += 1;
  }
  const emptyChapters = Object.entries(chapterCounts).filter(([, count]) => count === 0).map(([chapter]) => chapter);
  if (emptyChapters.length) throw new Error(`Textbook chapter(s) have no tasks: ${emptyChapters.join(', ')}.`);

  console.log(JSON.stringify({
    status: 'pass',
    sourcePages: pages.length,
    taskUnits: generatedTaskKeys.length,
    duplicateTasks: 0,
    missingTasks: 0,
    changedSourcePages: 0,
    sourceWorkbookSha256: actualWorkbookSha,
    chapters: chapterCounts,
  }, null, 2));
} finally {
  await server.close();
}
