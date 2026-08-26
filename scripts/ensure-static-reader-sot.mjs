import { readFile } from 'node:fs/promises';

const current = await readFile('SOURCE_OF_TRUTH.md', 'utf8');
if (!current.includes("document.documentElement.dataset.workbookReady === 'true'")) {
  throw new Error('Canonical SOURCE_OF_TRUTH is missing the static workbookReady reader contract');
}
if (!current.includes('מצב שבו `workbookReady=true` אך לא נמצאו רכיבי `.wb-page` הוא **כשל פרסום**')) {
  throw new Error('Canonical SOURCE_OF_TRUTH is missing the non-empty .wb-page publication rule');
}
if (!current.includes('אסור לבסס את הקורא על `ratio-editor-sidebar`')) {
  throw new Error('Canonical SOURCE_OF_TRUTH is missing the obsolete React/sidebar prohibition');
}
console.log('SOURCE_OF_TRUTH: static reader contract is canonical in section 24');
