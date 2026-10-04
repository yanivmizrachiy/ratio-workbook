import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });
try {
  const pagesModule = await server.ssrLoadModule('/src/data/worksheetPages.tsx');
  const pages = pagesModule.WORKSHEET_PAGES;
  if (!Array.isArray(pages) || pages.length === 0) throw new Error('WORKSHEET_PAGES missing');
  const hashes = {};
  const fullPageHashes = [];
  for (const page of pages) {
    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null, page.component()));
    const hash = sha256(markup);
    hashes[page.key] = hash;
    fullPageHashes.push(`${page.key}:${hash}`);
  }
  const workbookHash = sha256(fullPageHashes.join('\n'));
  const ordered = Object.fromEntries(pages.map((p) => [p.key, hashes[p.key]]));
  const body = `export const PRE_REORDER_PAGE_MARKUP_SHA256: Readonly<Record<string, string>> = ${JSON.stringify(ordered, null, 2)};\n\nexport const PRE_REORDER_WORKBOOK_SHA256 = ${JSON.stringify(workbookHash)};\n`;
  fs.writeFileSync(path.join(root, 'src/data/contentBaseline.ts'), body, 'utf8');
  console.log(`baseline regenerated for ${pages.length} pages: ${workbookHash}`);
} finally {
  await server.close();
}
