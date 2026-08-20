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
  "function readEmbeddedRubikCss() {",
  `const APPROVED_PERSON_NAME_REPLACEMENTS = [
  ['משפחת תמיר', 'משפחת הראל'],
  ['משפחת סביון', 'משפחת גלעד'],
  ['משפחת ארז', 'משפחת אריאל'],
  ['משפחת פרץ', 'משפחת יונתן'],
  ['נֹגַה', 'אורנית'],
  ['בָּר', 'אריאל'],
  ['יהודית', 'סבתא אתי'],
  ['מרים', 'סבתא רבקה'],
  ['דניאל', 'אריאל'],
  ['עמיחי', 'גלעד'],
  ['אלעד', 'יונתן'],
  ['איילת', 'אורנית'],
  ['נורית', 'צצונה'],
  ['שרית', 'אורנית'],
  ['רונן', 'יונתן'],
  ['מירב', 'מאיה'],
  ['נעמה', 'מאיה'],
  ['עדינה', 'תמר'],
  ['נעמי', 'מאיה'],
  ['עודד', 'הראל'],
  ['רינת', 'אורנית'],
  ['רותי', 'מאיה'],
  ['נועם', 'רותם'],
  ['מירי', 'תמר'],
  ['דינה', 'מאיה'],
  ['גדי', 'גלעד'],
  ['יאיר', 'הראל'],
  ['נועה', 'מאיה'],
  ['ירון', 'אריאל'],
  ['יוסי', 'יונתן'],
  ['יוני', 'איתי'],
  ['סימה', 'סבתא אתי'],
  ['שושי', 'סבתא רבקה'],
  ['טלי', 'תמר'],
  ['קרן', 'אורנית'],
  ['ענת', 'תמר'],
  ['יפה', 'תמר'],
  ['חיים', 'סבא שלמה'],
  ['משה', 'סבא שמעון'],
  ['אורי', 'הראל'],
  ['רפי', 'גלעד'],
  ['אלי', 'איתי'],
  ['דני', 'גלעד'],
  ['רן', 'איתי'],
  ['עידן', 'אריאל'],
  ['טל', 'רותם'],
  ['דן', 'איתי'],
];

const APPROVED_CONTEXT_REPLACEMENTS = [
  ['בני משתמש', 'איתי משתמש'],
];

const LEGACY_PERSON_NAME_GUARDS = APPROVED_PERSON_NAME_REPLACEMENTS.map(([from]) => from);

function replacePersonToken(html, from, to) {
  if (from.includes(' ') || /[\\u0591-\\u05C7]/.test(from)) return html.split(from).join(to);
  const pattern = new RegExp('(?<![א-ת])([ובלמשכה]{0,2})' + from + '(?![א-ת])', 'g');
  return html.replace(pattern, (_match, prefix) => prefix + to);
}

function applyApprovedPersonNames(html) {
  let result = html;
  for (const [from, to] of APPROVED_CONTEXT_REPLACEMENTS) result = result.split(from).join(to);
  for (const [from, to] of APPROVED_PERSON_NAME_REPLACEMENTS) result = replacePersonToken(result, from, to);
  return result;
}

function hasLegacyPersonName(html, name) {
  if (name.includes(' ') || /[\\u0591-\\u05C7]/.test(name)) return html.includes(name);
  const pattern = new RegExp('(?<![א-ת])([ובלמשכה]{0,2})' + name + '(?![א-ת])');
  return pattern.test(html);
}

function assertNoLegacyPersonNames(html) {
  const leftovers = LEGACY_PERSON_NAME_GUARDS.filter((name) => hasLegacyPersonName(html, name));
  if (html.includes('בני משתמש')) leftovers.push('בני משתמש');
  if (leftovers.length) throw new Error('Legacy person names remain after approved-name transform: ' + [...new Set(leftovers)].join(', '));
}

function readEmbeddedRubikCss() {`,
  'approved person-name transform',
);

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
  `  const baseTaskSequence = sequenceModule.TEXTBOOK_TASK_SEQUENCE;\n  textbookChapterOrder = sequenceModule.TEXTBOOK_CHAPTER_ORDER;\n  const approvedAdditionPages = additionsModule.APPROVED_PROPORTION_ADDITION_PAGES;\n  const expectedAdditionKeys = [\n    'prop-addition-01', 'prop-addition-02', 'prop-addition-03', 'prop-addition-04',\n    'prop-addition-05', 'prop-addition-06', 'prop-addition-07', 'prop-addition-08',\n    'prop-addition-09',\n  ];\n  if (!Array.isArray(approvedAdditionPages)) throw new Error('APPROVED_PROPORTION_ADDITION_PAGES must be an array.');\n  const additionKeys = approvedAdditionPages.map((page) => page.key);\n  if (JSON.stringify(additionKeys) !== JSON.stringify(expectedAdditionKeys)) {\n    throw new Error('Approved proportion additions changed order or identity.');\n  }\n  if (new Set(additionKeys).size !== additionKeys.length) throw new Error('Approved proportion additions contain duplicate keys.');\n  const insertionIndex = baseTaskSequence.findIndex((entry) => entry.chapter === 'פרופורציה');\n  if (insertionIndex < 0) throw new Error('Could not find the proportion chapter insertion point.');\n  const additionTaskSequence = approvedAdditionPages.map((page) => ({ taskKey: page.key + '#1', chapter: 'פרופורציה' }));\n  textbookTaskSequence = [\n    ...baseTaskSequence.slice(0, insertionIndex),\n    ...additionTaskSequence,\n    ...baseTaskSequence.slice(insertionIndex),\n  ];`,
  'sequence assignment',
);

replaceOnce(
  "    const inner = markup.slice(markerIndex + marker.length).replace(/<\\/div><\\/div>$/, '');\n    const contentSha = sha256(inner);",
  "    const inner = markup.slice(markerIndex + marker.length).replace(/<\\/div><\\/div>$/, '');\n    const approvedInner = applyApprovedPersonNames(inner);\n    const contentSha = sha256(approvedInner);",
  'source approved-name transform',
);

replaceOnce(
  "    srcHtml += `<div class=\"wb-srcpage\" data-key=\"${page.key}\" data-source-page=\"${page.id}\">${inner}</div>`;",
  "    srcHtml += `<div class=\"wb-srcpage\" data-key=\"${page.key}\" data-source-page=\"${page.id}\">${approvedInner}</div>`;",
  'source approved-name output',
);

replaceOnce(
  "  if (sourceWorkbookSha256 !== expectedWorkbookSha) {\n    throw new Error(`Locked source workbook hash changed: expected ${expectedWorkbookSha}, got ${sourceWorkbookSha256}.`);\n  }",
  `  if (sourceWorkbookSha256 !== expectedWorkbookSha) {\n    throw new Error(\`Locked source workbook hash changed: expected \${expectedWorkbookSha}, got \${sourceWorkbookSha256}.\`);\n  }\n\n  const additionHashes = [];\n  for (const addition of approvedAdditionPages) {\n    if (!addition?.key || typeof addition.component !== 'function') throw new Error('Invalid approved proportion addition definition.');\n    const markup = renderToStaticMarkup(React.createElement(React.Fragment, null, addition.component()));\n    if (markup.includes('teacher-intro-page') || markup.includes('יחס · למורה')) {\n      throw new Error(\`Teacher-only markup leaked into approved addition \${addition.key}.\`);\n    }\n    const markerIndex = markup.indexOf(marker);\n    if (markerIndex === -1) throw new Error(\`Approved addition \${addition.key} has no .page-content element.\`);\n    const inner = markup.slice(markerIndex + marker.length).replace(/<\\/div><\\/div>$/, '');\n    const approvedInner = applyApprovedPersonNames(inner);\n    const markupSha = sha256(markup);\n    additionHashes.push(\`\${addition.key}:\${markupSha}\`);\n    srcHtml += \`<div class=\"wb-addpage\" data-key=\"\${addition.key}\" data-source-page=\"approved-addition\">\${approvedInner}</div>\`;\n  }\n  approvedAdditionsSha256 = sha256(additionHashes.join('\\n'));\n  assertNoLegacyPersonNames(srcHtml);`,
  'locked workbook check',
);

replaceOnce(
  "const contentSha256 = sha256(`${sourceWorkbookSha256}\\n${taskSequenceSha256}`);",
  "const renderedWorkbookSha256 = sha256(srcHtml);\nconst contentSha256 = sha256(`${sourceWorkbookSha256}\\n${approvedAdditionsSha256}\\n${taskSequenceSha256}\\n${renderedWorkbookSha256}`);",
  'content hash',
);

replaceOnce(
  "  taskCount: textbookTaskSequence.length,",
  "  taskCount: textbookTaskSequence.length,\n  approvedAdditionPages: 9,\n  approvedAdditionsSha256,\n  renderedWorkbookSha256,",
  'build metadata',
);

replaceOnce(
  "    [].forEach.call(document.querySelectorAll('.wb-src .wb-srcpage'),function(sourcePage){",
  "    [].forEach.call(document.querySelectorAll('.wb-src .wb-srcpage, .wb-src .wb-addpage'),function(sourcePage){",
  'paginator source selector',
);

replaceOnce(
  "  function run(){",
  `  function classifyGraphic(svg){\n    var parts=[];\n    var node=svg;\n    for(var depth=0;node&&depth<5;depth++,node=node.parentElement){\n      parts.push(node.getAttribute&&node.getAttribute('class')||'');\n      parts.push(node.getAttribute&&node.getAttribute('aria-label')||'');\n    }\n    var context=parts.join(' ').toLowerCase();\n    if(/bar-chart|\\bchart\\b|ratio-graph|graph-container|דיאגרמ/.test(context))return 'chart';\n    if(/geo-|geometry|triangle|trapezoid|angle|משולש|טרפז|זווית|גאומטר/.test(context))return 'geometry';\n    if(/number-line|ציר מספרים/.test(context))return 'number-line';\n    if(/bags-|bag|שקיות|שקים/.test(context))return 'ratio-model';\n    if(/bracelet|circles-|circle-option|חרוז|עיגול|גולות/.test(context))return 'counters';\n    if(/grid-|tile|משבצ|ריצוף/.test(context))return 'grid';\n    return 'generic';\n  }\n\n  function ensureGraphicViewBox(svg){\n    if(svg.hasAttribute('viewBox'))return;\n    function numericLength(value){\n      if(!value||/%/.test(value))return NaN;\n      var n=parseFloat(value);\n      return Number.isFinite(n)&&n>0?n:NaN;\n    }\n    var w=numericLength(svg.getAttribute('width'));\n    var h=numericLength(svg.getAttribute('height'));\n    if(!(w>0&&h>0)){var r=svg.getBoundingClientRect();w=r.width;h=r.height;}\n    if(w>0&&h>0){svg.setAttribute('viewBox','0 0 '+String(Math.round(w*1000)/1000)+' '+String(Math.round(h*1000)/1000));}\n  }\n\n  function normalizeGraphics(){\n    var svgs=[].slice.call(document.querySelectorAll('.wb-page svg'));\n    svgs.forEach(function(svg,index){\n      var family=classifyGraphic(svg);\n      ensureGraphicViewBox(svg);\n      svg.classList.add('math-graphic');\n      svg.setAttribute('data-graphic-index',String(index+1));\n      svg.setAttribute('data-graphic-family',family);\n      svg.setAttribute('shape-rendering','geometricPrecision');\n      svg.setAttribute('text-rendering','geometricPrecision');\n      svg.setAttribute('preserveAspectRatio','xMidYMid meet');\n      svg.setAttribute('focusable','false');\n      if(svg.getAttribute('aria-hidden')!=='true'&&!svg.getAttribute('aria-label')){\n        var q=svg.closest('.question-block');\n        var p=q&&q.querySelector('p');\n        var text=p&&p.textContent?p.textContent.replace(/\\s+/g,' ').trim():'';\n        svg.setAttribute('role','img');\n        svg.setAttribute('aria-label',text?('תרשים: '+text.slice(0,140)):'תרשים מתמטי');\n      }\n    });\n    document.documentElement.dataset.graphicsNormalized='true';\n    document.documentElement.dataset.graphicsCount=String(svgs.length);\n  }\n\n  function run(){`,
  'graphics normalizer',
);

replaceOnce(
  "    [].forEach.call(document.querySelectorAll('.wb-src'),function(source){source.remove();});\n    document.documentElement.dataset.workbookReady='true';",
  "    normalizeGraphics();\n    [].forEach.call(document.querySelectorAll('.wb-src'),function(source){source.remove();});\n    document.documentElement.dataset.workbookReady='true';",
  'graphics normalize call',
);

fs.writeFileSync(generatedScript, source, 'utf8');
try {
  await import(`${pathToFileURL(generatedScript).href}?v=${Date.now()}`);
} finally {
  fs.rmSync(generatedScript, { force: true });
}
