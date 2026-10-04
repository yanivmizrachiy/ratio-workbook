from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str, count: int = 1):
    p = ROOT / path
    s = p.read_text(encoding='utf-8')
    actual = s.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count} occurrences, found {actual}: {old[:100]!r}')
    p.write_text(s.replace(old, new), encoding='utf-8')
    print(f'fixed {path}: {old[:70]}')


def regex_replace(path: str, pattern: str, repl: str, count: int = 1):
    p = ROOT / path
    s = p.read_text(encoding='utf-8')
    out, n = re.subn(pattern, repl, s, count=count, flags=re.S)
    if n != count:
        raise SystemExit(f'{path}: expected regex {count}, got {n}: {pattern[:100]}')
    p.write_text(out, encoding='utf-8')
    print(f'fixed {path}: regex {pattern[:70]}')

# 1. ratio-page-11: restore the exhaustiveness condition required by the official question.
replace(
    'src/components/worksheet/corrected/Chapter2Corrections.tsx',
    'ביום קיץ הגיעו לבית הספר יותר מ־65 תלמידים. היחס בין מספר התלמידים שנעלו נעלי ספורט למספר התלמידים שנעלו סנדלים היה 5 : 3.',
    'ביום קיץ הגיעו לבית הספר יותר מ־65 תלמידים. חלקם נעלו נעלי ספורט והיתר נעלו סנדלים. היחס בין מספר התלמידים שנעלו נעלי ספורט למספר התלמידים שנעלו סנדלים היה 5 : 3.',
)

# 2. Curriculum page 02: ask for the two group allocations, not the already-stated per-child amount.
replace(
    'src/components/worksheet/corrected/CurriculumQuestionsPages.tsx',
    'חילקו 18 כדורי משחק לשתי קבוצות של ילדים ביחס של 5 : 4. כל ילד קיבל כדור אחד. כמה כדורים קיבל כל ילד?',
    'חילקו 18 כדורי משחק לשתי קבוצות ביחס של 5 : 4. כמה כדורים קיבלה כל קבוצה?',
)

# 3. Chapter 4 semantic precision: blue concentration, not undefined visual darkness; correct units.
replace(
    'src/components/worksheet/pages/Chapter4Pages.tsx',
    'באיזו כוס התקבל צבע ירוק <strong>כהה יותר</strong>? הסבירו על-ידי השוואת היחסים.',
    'באיזו כוס שיעור הטיפות הכחולות מתוך כלל הטיפות גדול יותר? הסבירו על-ידי השוואת היחסים.',
)
replace(
    'src/components/worksheet/pages/Chapter4Pages.tsx',
    "<FinalAnswer label=\"סעו-נא :\" unit='ק\"מ' />\n          <FinalAnswer label=\"הנוסעים :\" unit='ק\"מ' />",
    "<FinalAnswer label=\"סעו-נא :\" unit='ק\"מ/ליטר' />\n          <FinalAnswer label=\"הנוסעים :\" unit='ק\"מ/ליטר' />",
)

# 4. Chapter 6: denominator domain and explicit x/y meaning.
replace(
    'src/components/worksheet/pages/Chapter6Pages.tsx',
    'כדי לבדוק אם מתקיימת פרופורציה בין <Frac num="a" den="b" /> לבין <Frac num="c" den="d" /> בודקים אם <strong>a · d = b · c</strong> .',
    'כדי לבדוק אם מתקיימת פרופורציה בין <Frac num="a" den="b" /> לבין <Frac num="c" den="d" /> כאשר <strong>b ≠ 0</strong> ו־<strong>d ≠ 0</strong>, בודקים אם <strong>a · d = b · c</strong> .',
)
replace(
    'src/components/worksheet/pages/Chapter6Pages.tsx',
    'מהו הייצוג האלגברי של הישר המתאר את היחס בין מספר כוסות הקמח למספר גביעי היוגורט?',
    'נסמן x = מספר כוסות הקמח ו־y = מספר גביעי היוגורט. מהו הייצוג האלגברי של הישר?',
)

# 5. Chapter 2: make the intended positive-number domain explicit.
replace(
    'src/components/worksheet/pages/Chapter2Pages.tsx',
    'היחס בין שני מספרים הוא 4 : 9 , <strong>מכפלת</strong> המספרים היא 144 . מצאו את שני המספרים.',
    'היחס בין שני מספרים <strong>חיוביים</strong> הוא 4 : 9 , <strong>מכפלת</strong> המספרים היא 144 . מצאו את שני המספרים.',
)

# 6. Chapter 1: avoid a fractional blank in an integer drill and replace the trivial divisibility-by-1 prompt.
replace(
    'src/components/worksheet/pages/Chapter1Pages.tsx',
    '1 : 2  =  <Blank /> : 3',
    '1 : 2  =  <Blank /> : 6',
)
replace(
    'src/components/worksheet/pages/Chapter1Pages.tsx',
    '<SubQuestion label="ב."><p><strong>השלימו</strong> : מספר התלמידים בטיול הוא מספר שמתחלק ב - <Blank /> .</p></SubQuestion>',
    '<SubQuestion label="ב."><p><strong>השלימו</strong> : מספר המבוגרים בטיול הוא מספר שמתחלק ב - <Blank /> .</p></SubQuestion>',
)

# 7. Chapter 3: give part (a) an explicit response field and disambiguate the recolouring action.
replace(
    'src/components/worksheet/corrected/Chapter3Corrections.tsx',
    '<SubQuestion label="א."><p>אם מעבירים את תכולת ג׳ לא׳, מהו היחס בין לבנים לשחורים?</p></SubQuestion>',
    '<SubQuestion label="א."><p>אם מעבירים את תכולת ג׳ לא׳, מהו היחס בין לבנים לשחורים?</p><RatioAnswer /></SubQuestion>',
)
replace(
    'src/components/worksheet/corrected/Chapter3Corrections.tsx',
    'אם נצבע משבצת נוספת, כמה משבצות לבנות צריך להוסיף כדי לשמור על היחס?',
    'אם נצבע אחת מ־12 המשבצות הלבנות, כמה משבצות לבנות צריך להוסיף כדי לשמור על היחס?',
)

# 8. Mitzav 2012: restore source ratio and recipe amounts.
replace(
    'src/components/worksheet/pages/Chapter7Pages.tsx',
    'היחס בין מספר השעות שדניאל יְשֵׁנה ביממה למספר השעות שבהן היא ערה הוא 1 : 2 . כמה שעות דניאל יְשֵׁנה ביממה?',
    'היחס בין מספר השעות שדניאל יְשֵׁנה ביממה למספר השעות שבהן היא ערה הוא 2 : 1 . כמה שעות דניאל יְשֵׁנה ביממה?',
)
replace(
    'src/components/worksheet/pages/Chapter7Pages.tsx',
    '<Frac num={1} den={2} /> כוס סוכר &nbsp;·&nbsp; <Frac num={1} den={4} /> כוס חלב',
    '<Frac num={2} den={3} /> כוס סוכר &nbsp;·&nbsp; <Frac num={1} den={3} /> כוס חלב',
)

# 9. Mitzav 2013 kangaroo: restore official chart values 16, 24, 20, 30.
replace(
    'src/components/worksheet/pages/Chapter7Pages.tsx',
    '// Kangaroo jumps bar chart: A 30, B 20, C 40, D 6 (avg = 24)',
    '// Kangaroo jumps bar chart: official source values A 16, B 24, C 20, D 30',
)
replace(
    'src/components/worksheet/pages/Chapter7Pages.tsx',
    '''  const data = [\n    { l: "א'", v: 30 },\n    { l: "ב'", v: 20 },\n    { l: "ג'", v: 40 },\n    { l: "ד'", v: 6 },\n  ];''',
    '''  const data = [\n    { l: "א'", v: 16 },\n    { l: "ב'", v: 24 },\n    { l: "ג'", v: 20 },\n    { l: "ד'", v: 30 },\n  ];''',
)
replace(
    'src/components/worksheet/pages/Chapter7Pages.tsx',
    'aria-label="דיאגרמת עמודות של מספר הקפיצות לכל קנגורו: א׳ 30, ב׳ 20, ג׳ 40, ד׳ 6"',
    'aria-label="דיאגרמת עמודות של מספר הקפיצות לכל קנגורו: א׳ 16, ב׳ 24, ג׳ 20, ד׳ 30"',
)

# 10. Mitzav 2014 rail: restore official 160/240 measurements and proportional geometry.
regex_replace(
    'src/components/worksheet/pages/Chapter7Pages.tsx',
    r'// Hook rail: A ── 90 ── B ── 120 ── C\nfunction HookRail\(\) \{.*?\n\}\n\n// Similar triangles',
    '''// Hook rail: A ── 160 ── B ── 240 ── C\nfunction HookRail() {\n  const W = 460, H = 90;\n  const ax = 40, bx = 190, cx = 415; // display distances 150:225 = 2:3, matching 160:240\n  return (\n    <div className="flex justify-center my-2">\n      <svg width={W} height={H} role="img" aria-label="מסילה עם לולאות A B C ומרחקים 160 ו־240 סנטימטרים" shapeRendering="geometricPrecision">\n        <line x1="20" y1="40" x2={W - 20} y2="40" stroke="#333" strokeWidth="2" />\n        <line x1="20" y1="44" x2={W - 20} y2="44" stroke="#333" strokeWidth="2" />\n        {[{ x: ax, l: 'A' }, { x: bx, l: 'B' }, { x: cx, l: 'C' }].map((p) => (\n          <g key={p.l}>\n            <path d={`M ${p.x} 44 Q ${p.x} 60, ${p.x - 6} 64 Q ${p.x - 10} 70, ${p.x} 74 Q ${p.x + 10} 70, ${p.x + 6} 64 Q ${p.x} 60, ${p.x} 44`} fill="none" stroke="#333" strokeWidth="1.5" />\n            <circle cx={p.x} cy="44" r="3" fill="#333" />\n            <text x={p.x} y="22" fontSize="14" textAnchor="middle" fontWeight="bold">{p.l}</text>\n          </g>\n        ))}\n        <text x={(ax + bx) / 2} y="88" fontSize="11" textAnchor="middle">160 ס"מ</text>\n        <text x={(bx + cx) / 2} y="88" fontSize="11" textAnchor="middle">240 ס"מ</text>\n      </svg>\n    </div>\n  );\n}\n\n// Similar triangles''',
)

# 11. Mitzav 2014 similar triangle: restore official side lengths 2,4,5 and geometrically consistent drawing.
regex_replace(
    'src/components/worksheet/pages/Chapter7Pages.tsx',
    r'// Similar triangles ABC ~ DEF \(DEF lengths shown\)\nfunction SimilarTriangles\(\) \{.*?\n\}\n\n// Two similar triangles DOC',
    '''// Similar triangles ABC ~ DEF (official DEF side lengths: 2, 4, 5)\nfunction SimilarTriangles() {\n  return (\n    <div className="flex justify-center gap-12 my-2">\n      <svg width="170" height="160" aria-hidden="true">\n        <polygon points="20,140 150,140 60,20" fill="none" stroke="#222" strokeWidth="1.6" />\n        <text x="14" y="156" fontSize="12">A</text>\n        <text x="154" y="156" fontSize="12">B</text>\n        <text x="58" y="16" fontSize="12">C</text>\n      </svg>\n      <svg width="140" height="160" role="img" aria-label="משולש DEF שצלעותיו 5, 4 ו־2" shapeRendering="geometricPrecision">\n        <polygon points="16,120 116,120 90,89.6" fill="none" stroke="#222" strokeWidth="1.8" />\n        <text x="8" y="133" fontSize="12">D</text>\n        <text x="119" y="133" fontSize="12">E</text>\n        <text x="88" y="84" fontSize="12">F</text>\n        <text x="66" y="136" fontSize="11" textAnchor="middle" direction="ltr">5</text>\n        <text x="50" y="101" fontSize="11" textAnchor="middle" direction="ltr">4</text>\n        <text x="105" y="101" fontSize="11" textAnchor="middle" direction="ltr">2</text>\n      </svg>\n    </div>\n  );\n}\n\n// Two similar triangles DOC''',
)

# 12. Mitzav 2015 ratio-page-42: restore official coordinate data and ratio 1:4.
regex_replace(
    'src/components/worksheet/corrected/Chapter7Corrections.tsx',
    r'function CoordinateTriangles\(\) \{.*?\n\}\n\nexport function RatioPage42',
    '''function CoordinateTriangles() {\n  const originX = 145;\n  const originY = 150;\n  const scale = 6;\n  const p = (x: number, y: number) => `${originX + x * scale},${originY - y * scale}`;\n  return (\n    <div className="svg-center svg-center--tight">\n      <svg viewBox="0 0 300 285" width="320" height="300" role="img" aria-label="מערכת צירים ובה המשולשים הדומים DOC ו־AOB; A(0,20), D(-5,0), C(0,-3), B(12,0)" shapeRendering="geometricPrecision">\n        <line x1="20" y1={originY} x2="285" y2={originY} stroke="#172554" strokeWidth="1.5" />\n        <line x1={originX} y1="15" x2={originX} y2="270" stroke="#172554" strokeWidth="1.5" />\n        <polygon points={`${p(0,0)} ${p(-5,0)} ${p(0,-3)}`} fill="#eef2ff" stroke="#1e40af" strokeWidth="1.8" />\n        <polygon points={`${p(0,0)} ${p(0,20)} ${p(12,0)}`} fill="none" stroke="#172554" strokeWidth="2" />\n        <text x={originX - 12} y={originY - 7}>O</text>\n        <text x={originX - 5 * scale - 42} y={originY + 5} direction="ltr">D(-5,0)</text>\n        <text x={originX - 42} y={originY + 3 * scale + 18} direction="ltr">C(0,-3)</text>\n        <text x={originX - 48} y={originY - 20 * scale - 6} direction="ltr">A(0,20)</text>\n        <text x={originX + 12 * scale + 8} y={originY + 5} direction="ltr">B(12,0)</text>\n      </svg>\n    </div>\n  );\n}\n\nexport function RatioPage42''',
)
replace(
    'src/components/worksheet/corrected/Chapter7Corrections.tsx',
    'הנקודות הן O(0,0),‏ D(0,6),‏ C(4,0),‏ A(10,0).',
    'הנקודות הנתונות הן A(0,20),‏ D(-5,0),‏ C(0,-3),‏ O(0,0).',
)
replace(
    'src/components/worksheet/corrected/Chapter7Corrections.tsx',
    "{ value: '2 : 5' },",
    "{ value: '3 : 20' },",
)
# After the previous replacement there would be a duplicated 3:20 option; restore the official option set exactly.
replace(
    'src/components/worksheet/corrected/Chapter7Corrections.tsx',
    "{ value: '1 : 4' },\n            { value: '3 : 20' },\n            { value: '3 : 5' },\n            { value: '3 : 20' },",
    "{ value: '1 : 12' },\n            { value: '3 : 20' },\n            { value: '1 : 4' },\n            { value: '3 : 5' },",
)

# 13. Update structure tests to the restored official coordinates and lock all audit fixes.
replace(
    'src/test/workbookStructure.test.tsx',
    "for (const value of ['C(4,0)', 'D(0,6)', 'A(10,0)', 'B(0,15)'])",
    "for (const value of ['D(-5,0)', 'C(0,-3)', 'A(0,20)', 'B(12,0)'])",
)
insert = '''\n\n  it('locks the 2026-10-04 deep mathematical audit corrections', () => {\n    expect(renderKey('ratio-page-11')).toContain('חלקם נעלו נעלי ספורט והיתר נעלו סנדלים');\n    expect(renderKey('curriculum-page-02')).toContain('כמה כדורים קיבלה כל קבוצה?');\n    expect(renderKey('ch4-page-02')).toContain('שיעור הטיפות הכחולות מתוך כלל הטיפות גדול יותר');\n    expect(renderKey('ch4-page-03')).toContain('ק&quot;מ/ליטר');\n    expect(renderKey('ch6-page-01')).toContain('b ≠ 0');\n    expect(renderKey('ch6-page-03')).toContain('x = מספר כוסות הקמח');\n    expect(renderKey('ch2-page-10')).toContain('מספרים <strong>חיוביים</strong>');\n    expect(renderKey('ch1-page-08')).toContain('1 : 2  =  <span class="inline-blank"></span> : 6');\n    expect(renderKey('ratio-page-23')).toContain('אחת מ־12 המשבצות הלבנות');\n    expect(renderKey('ch7-page-08')).toContain('הוא 2 : 1');\n    expect(renderKey('ch7-page-08')).toContain('2</span><span class="fraction-line"></span><span class="fraction-den">3');\n    expect(renderKey('ch7-page-07')).toContain('א׳ 16, ב׳ 24, ג׳ 20, ד׳ 30');\n    expect(renderKey('ch7-page-05')).toContain('160 ס&quot;מ');\n    expect(renderKey('ch7-page-05')).toContain('240 ס&quot;מ');\n    expect(renderKey('ratio-page-42')).toContain('A(0,20)');\n    expect(renderKey('ratio-page-42')).toContain('B(12,0)');\n  });\n'''
p = ROOT / 'src/test/workbookStructure.test.tsx'
s = p.read_text(encoding='utf-8')
marker = '\n});\n'
idx = s.rfind(marker)
if idx < 0:
    raise SystemExit('workbookStructure.test.tsx: closing marker not found')
if 'locks the 2026-10-04 deep mathematical audit corrections' not in s:
    s = s[:idx] + insert + s[idx:]
    p.write_text(s, encoding='utf-8')

# 14. SOURCE_OF_TRUTH: later explicit rule overrides old locks when a mathematical/source error is verified.
p = ROOT / 'SOURCE_OF_TRUTH.md'
s = p.read_text(encoding='utf-8')
section = '''\n\n## 25. תיקון שגיאות מתמטיות ואימות מקור — כלל מחייב מ־2026-10-04\n\n- ההוראה המאוחרת והמפורשת של יניב מחייבת **לתקן לעומק כל שגיאה מתמטית, לוגית, ממדית או סטייה מאומתת ממקור רשמי**, גם אם תוכן קודם הוגדר כנעול או כהעתקה מדויקת. סעיף זה גובר, לצורך תיקון שגיאה מאומתת בלבד, על נעילות המלל/ה־hash שבסעיפים 14–16.\n- אין לשמר טעות בשם נאמנות ל־baseline. כאשר יש סתירה בין baseline ישן לבין מתמטיקה נכונה או מקור רשמי מאומת — מתקנים את התוכן, מעדכנים בדיקות regression ורק לאחר מכן מייצרים baseline חדש מן הגרסה המתוקנת.\n- שאלה המיוחסת למיצ״ב/ראמ״ה/משרד החינוך חייבת להיות נאמנה לנתונים, ליחסים, לגרפים, למידות ולאפשרויות של המקור הרשמי. אסור להחליף מספרים או לבנות גרסה חדשה ולשמור את הייחוס כאילו היא המקור.\n- כל שאלה חייבת להיות מוגדרת היטב: כל הנחות היסוד הדרושות לתשובה המבוקשת נכתבות במפורש; לא מסתמכים על הנחה סמויה כגון 'אלה שתי הקבוצות היחידות' או 'המספרים חיוביים'.\n- יחס חלק־לשלם, חלוקת פריטים בדידים, פרופורציה, יחידות מידה ותחום הגדרה נבדקים סמנטית ולא רק חזותית. תוצאה של פריטים בדידים שאינה שלמה מחייבת בדיקה אם זו אכן מטרת השאלה.\n- בייצוג אלגברי מגדירים במפורש מה מייצגים המשתנים כאשר החלפת הצירים משנה את הנוסחה. ביחסים בעלי יחידות, יחידת התשובה חייבת להיות היחידה המורכבת הנכונה, למשל ק״מ/ליטר.\n- ניסוח מילולי אינו רשאי לטעון תכונה שאינה נובעת מתמטית מן הנתונים; לדוגמה, יחס צבעים יכול לקבוע שיעור של רכיב אך לא 'כהות' בלי מודל שמגדיר זאת.\n- תיקון מתמטי מאומת מקבל בדיקת regression ספציפית שמונעת חזרה של הנוסח/הנתון השגוי. `verified` פירושו מעתה גם מעבר בדיקות סמנטיות ייעודיות לממצאי הביקורת, ולא רק build/מבנה/PDF/SVG.\n- שינויי תיקון מבוצעים תחילה בענף Preview מבודד. Production אינו משתנה ללא מעבר כל שרשרת האימות ובהתאם לכללי הפרסום התקפים.\n'''
if '## 25. תיקון שגיאות מתמטיות ואימות מקור' not in s:
    p.write_text(s.rstrip() + section + '\n', encoding='utf-8')

print('All deterministic deep-math-audit source edits applied.')
