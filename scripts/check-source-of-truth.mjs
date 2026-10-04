import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'SOURCE_OF_TRUTH.md',
  'README.md',
  'src/data/worksheetPages.tsx',
  'scripts/generate-content-manifest.mjs',
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}

const forbiddenLegacyFiles = [
  'COMPLIANCE-PLAN.md',
  'PARABULA-INTEGRATION.md',
  'bun.lock',
  'bun.lockb',
  'src/teacher-intro-pages.css',
  'src/components/worksheet/corrected/TeacherIntroPages.tsx',
];

for (const file of forbiddenLegacyFiles) {
  if (fs.existsSync(path.join(root, file))) throw new Error(`Forbidden legacy file: ${file}`);
}

if (fs.existsSync(path.join(root, 'sources'))) throw new Error('sources/ is forbidden');

const sot = fs.readFileSync(path.join(root, 'SOURCE_OF_TRUTH.md'), 'utf8');
const requiredSotMarkers = [
  '# יחס ופרופורציה — SOURCE OF TRUTH',
  'מקור האמת היחיד והמחייב',
  'נכונות מתמטית קודמת',
  '## 3. מתמטיקה — שער איכות עליון',
  '## 4. נאמנות למקורות רשמיים',
  '## 9. Baselines, hashes ו־content lock',
  '## 11. בדיקות חובה — Definition of Verified',
  '## 12. מניעת חזרת שגיאות שכבר נמצאו',
  '## 18. כללים ישנים שבוטלו או הוחלפו במפורש',
  '0 דפי פתיחה” — בוטל',
  'baseline הוא guard בלבד',
  'כשל בשכבה אחת = **לא verified**',
];

for (const marker of requiredSotMarkers) {
  if (!sot.includes(marker)) throw new Error(`SOURCE_OF_TRUTH missing mandatory governance marker: ${marker}`);
}

const forbiddenSotFragments = [
  'את התוספות מעתיקים **בדיוק כפי שנשלחו**: אין לתקן ניסוח',
  '55 דפי המקור הישנים נשארים נעולים ללא שינוי',
  '0 דפי פתיחה למורה ו־0 דפי מורה בחוברת',
];

for (const fragment of forbiddenSotFragments) {
  if (sot.includes(fragment)) throw new Error(`SOURCE_OF_TRUTH contains superseded rule: ${fragment}`);
}

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (!readme.includes('SOURCE_OF_TRUTH.md') || readme.length > 2200) {
  throw new Error('README must stay a short pointer to SOURCE_OF_TRUTH.md');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

for (const file of ['src', 'scripts', '.github/workflows'].flatMap(walk)) {
  if (path.basename(file) === 'check-source-of-truth.mjs') continue;
  if (!/\.(?:[cm]?[jt]sx?|css|ya?ml|json)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const legacyDependency of ['sources/lovable/ratio-workbook', 'yanivmizrachiy/razpages']) {
    if (text.includes(legacyDependency)) throw new Error(`Legacy dependency in ${file}`);
  }
}

const manifestScript = fs.readFileSync(path.join(root, 'scripts/generate-content-manifest.mjs'), 'utf8');
if (!manifestScript.includes("requirementsSourceOfTruth: 'SOURCE_OF_TRUTH.md'")) {
  throw new Error('Manifest source metadata missing');
}

console.log('Single source-of-truth governance guard passed.');
