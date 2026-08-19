import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const baseScript = path.join(here, '_build-textbook-workbook.mjs');
const generatedScript = path.join(here, '.generated-build-textbook-with-additions.mjs');

let source = fs.readFileSync(baseScript, 'utf8');

function replaceOnce(find, replacement, label) {
  const first = source.indexOf(find);
  if (first === -1) throw new Error(`Approved-additions build patch failed: missing ${label}.`);
  if (source.indexOf(find, first + find.length) !== -1) throw new Error(`Approved-additions build patch failed: duplicate ${label}.`);
  source = source.replace(find, replacement);
}

replaceOnce(
  "let sourceWorkbookSha256 = '';",
  "let sourceWorkbookSha256 = '';\nlet approvedAdditionsSha256 = '';",
  'build state',
);

replaceOnce(
  "  const sequenceModule = await server.ssrLoadModule('/src/data/taskSequence.ts');",
  "  const sequenceModule = await server.ssrLoadModule('/src/data/taskSequence.ts');\n  const additionsModule = await server.ssrLoadModule('/src/components/worksheet/proportion/ApprovedProportionAdditions.tsx');",
  'module loading',
);

replaceOnce(
  "  textbookTaskSequence = sequenceModule.TEXTBOOK_TASK_SEQUENCE;\n  textbookChapterOrder = sequenceModule.TEXTBOOK_CHAPTER_ORDER;",
  `  const baseTaskSequence = sequenceModule.TEXTBOOK_TASK_SEQUENCE;\n  textbookChapterOrder = sequenceModule.TEXTBOOK_CHAPTER_ORDER;\n  const approvedAdditionPages = additionsModule.APPROVED_PROPORTION_ADDITION_PAGES;\n  const expectedAdditionKeys = [\n    'prop-addition-01', 'prop-addition-02', 'prop-addition-03', 'prop-addition-04',\n    'prop-addition-05', 'prop-addition-06', 'prop-addition-07', 'prop-addition-08',\n  ];\n  if (!Array.isArray(approvedAdditionPages)) throw new Error('APPROVED_PROPORTION_ADDITION_PAGES must be an array.');\n  const additionKeys = approvedAdditionPages.map((page) => page.key);\n  if (JSON.stringify(additionKeys) !== JSON.stringify(expectedAdditionKeys)) {\n    throw new Error('Approved proportion additions changed order or identity.');\n  }\n  if (new Set(additionKeys).size !== additionKeys.length) throw new Error('Approved proportion additions contain duplicate keys.');\n  const insertionIndex = baseTaskSequence.findIndex((entry) => entry.chapter === 'פרופורציה');\n  if (insertionIndex < 0) throw new Error('Could not find the proportion chapter insertion point.');\n  const additionTaskSequence = approvedAdditionPages.map((page) => ({ taskKey: page.key + '#1', chapter: 'פרופורציה' }));\n  textbookTaskSequence = [\n    ...baseTaskSequence.slice(0, insertionIndex),\n    ...additionTaskSequence,\n    ...baseTaskSequence.slice(insertionIndex),\n  ];`,
  'sequence assignment',
);

replaceOnce(
  "  if (sourceWorkbookSha256 !== expectedWorkbookSha) {\n    throw new Error(`Locked source workbook hash changed: expected ${expectedWorkbookSha}, got ${sourceWorkbookSha256}.`);\n  }",
  `  if (sourceWorkbookSha256 !== expectedWorkbookSha) {\n    throw new Error(\`Locked source workbook hash changed: expected \${expectedWorkbookSha}, got \${sourceWorkbookSha256}.\`);\n  }\n\n  const additionHashes = [];\n  for (const addition of approvedAdditionPages) {\n    if (!addition?.key || typeof addition.component !== 'function') throw new Error('Invalid approved proportion addition definition.');\n    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null, addition.component()));\n    if (markup.includes('teacher-intro-page') || markup.includes('יחס · למורה')) {\n      throw new Error(\`Teacher-only markup leaked into approved addition \${addition.key}.\`);\n    }\n    const markerIndex = markup.indexOf(marker);\n    if (markerIndex === -1) throw new Error(\`Approved addition \${addition.key} has no .page-content element.\`);\n    const inner = markup.slice(markerIndex + marker.length).replace(/<\\/div><\\/div>$/, '');\n    const markupSha = sha256(markup);\n    additionHashes.push(\`\${addition.key}:\${markupSha}\`);\n    srcHtml += \`<div class=\"wb-addpage\" data-key=\"\${addition.key}\" data-source-page=\"approved-addition\">\${inner}</div>\`;\n  }\n  approvedAdditionsSha256 = sha256(additionHashes.join('\\n'));`,
  'locked workbook check',
);

replaceOnce(
  "const contentSha256 = sha256(`${sourceWorkbookSha256}\\n${taskSequenceSha256}`);",
  "const contentSha256 = sha256(`${sourceWorkbookSha256}\\n${approvedAdditionsSha256}\\n${taskSequenceSha256}`);",
  'content hash',
);

replaceOnce(
  "  taskCount: textbookTaskSequence.length,",
  "  taskCount: textbookTaskSequence.length,\n  approvedAdditionPages: 8,\n  approvedAdditionsSha256,",
  'build metadata',
);

replaceOnce(
  "    [].forEach.call(document.querySelectorAll('.wb-src .wb-srcpage'),function(sourcePage){",
  "    [].forEach.call(document.querySelectorAll('.wb-src .wb-srcpage, .wb-src .wb-addpage'),function(sourcePage){",
  'paginator source selector',
);

fs.writeFileSync(generatedScript, source, 'utf8');
try {
  await import(`${pathToFileURL(generatedScript).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedScript, { force: true });
}
