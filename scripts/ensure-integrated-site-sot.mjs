import { readFile, writeFile } from 'node:fs/promises';

const path = 'SOURCE_OF_TRUTH.md';
const heading = '## 23. אתר יחס מאוחד — חוברת + סרטון איילת קריספין — כלל מחייב מ־2026-08-26';
const section = `

${heading}

- הקישור הציבורי הקיים של חוברת היחס, שכבר נשלח למורים, נשאר הקישור הקנוני ואינו משתנה.
- העמוד הציבורי הוא אתר נושא אחד, מעוצב ואחיד, בדפוס של אתרי \`misparim\` / \`zaviyot\`.
- סדר העמוד הציבורי: שער \`יחס ופרופורציה\` → מקטע \`סרטון המחשה בנושא יחס — איילת קריספין\` → החוברת הדיגיטלית הקיימת → הורדת PDF.
- הסרטון הקנוני הוא YouTube \`tszRqqH13Dw\`, מוטמע בתוך האתר; קישור פתיחה ביוטיוב הוא פעולה משנית בלבד.
- החוברת עצמה, כל דפיה, סדרה, ה־PDF והיכולת להדפיס נשמרים ללא שינוי תוכן; מעטפת האתר בלבד מחברת אותם לחוויית לימוד אחת.
- קובץ \`workbook.html\` הוא החוברת המאומתת, \`site-shell.html\` הוא תבנית המעטפת הקנונית, ו־\`index.html\` הוא העמוד הציבורי שמפרסם אותה.
- כפתור \`DOWNLOAD ↓\` נשאר זמין בראש האתר ומוריד ישירות \`ratio-workbook.pdf\` מאותו origin.
- המעטפת חייבת להיות RTL, רספונסיבית, נגישה וללא תלות בנכסי עיצוב חיצוניים; החריג היחיד לרשת חיצונית במעטפת הוא הטמעת YouTube המאושרת.
- פרסום המעטפת המאוחדת אושר במפורש על ידי יניב ב־2026-08-26, כולל החלפת העמוד הציבורי באותו קישור שכבר נשלח למורים.
`;

const current = await readFile(path, 'utf8');
if (!current.includes(heading)) {
  await writeFile(path, current.replace(/\s*$/, '') + section + '\n', 'utf8');
  console.log('SOURCE_OF_TRUTH: appended integrated-site requirement');
} else {
  console.log('SOURCE_OF_TRUTH: integrated-site requirement already present');
}
