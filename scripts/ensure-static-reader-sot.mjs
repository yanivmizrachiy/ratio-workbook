import { readFile, writeFile } from 'node:fs/promises';

const path = 'SOURCE_OF_TRUTH.md';
let current = await readFile(path, 'utf8');

current = current
  .replace('- ה־Hero עצמו קטן ועדין: רק הכותרת `יחס ופרופורציה` ומשפט קצר. אין בו כפתורים, eyebrow נוסף או איור יחס בצד שמאל.', '- ה־Hero עצמו קטן ועדין: רק הכותרת `יחס ופרופורציה`. אין בו משפטי הסבר/דמו, כפתורים, eyebrow נוסף או איור יחס בצד שמאל.')
  .replace('- ממשק העריכה/Sidebar/toolbar/כפתור הורדה צף הישן בתוך `workbook.html` מוסתר רק בהקשר של הקורא המוטמע. ה־artifact עצמו נשאר שמור כדי לא לפגוע בדפים המאומתים או ב־PDF.\n', '')
  .replace('- יניב ביקש במפורש ב־2026-08-26 את שינוי המונחים, קורא הדפים ללא גלילה, פעולות הדפדוף/הדפסה, הקטנת הסרטון, מניעת כפילויות, מחיקת טקסטי דמו וניקוי מקור האמת; בקשה זו מאשרת פרסום מיידי באותו קישור ציבורי.', `- \`workbook.html\` הוא artifact סטטי מאומת. בזמן טעינה הוא מסיים pagination, מסמן \`document.documentElement.dataset.workbookReady === 'true'\`, ומייצר את העמודים הפיזיים כ־\`.wb-page.worksheet-page\`. הקורא הציבורי חייב להמתין ל־\`workbookReady\` ולגלות את הדפים ישירות דרך \`.wb-page\`; אסור לבסס את הקורא על \`ratio-editor-sidebar\`, כפתורי React או מבנה עורך שאינו קיים ב־artifact המפורסם.\n- מצב שבו \`workbookReady=true\` אך לא נמצאו רכיבי \`.wb-page\` הוא **כשל פרסום**, לא מצב משתמש תקין. אין לפרסם ממשק שמציג \`לא נמצאו דפים\` במקום הדפים.\n- לפני כל פרסום של המעטפת חובה לאמת שה־artifact מכיל את מנגנון \`workbookReady\` ואת יצירת \`wb-page worksheet-page\`, ושהמעטפת עצמה מחפשת \`.wb-page\`.\n- יניב ביקש במפורש ב־2026-08-26 את שינוי המונחים, קורא הדפים ללא גלילה, פעולות הדפדוף/הדפסה, הקטנת הסרטון, מניעת כפילויות, מחיקת טקסטי דמו, תיקון מצב \`לא נמצאו דפים\` וניקוי מקור האמת; בקשה זו מאשרת פרסום מיידי באותו קישור ציבורי.`);

if (!current.includes("dataset.workbookReady === 'true'")) throw new Error('Failed to lock workbookReady reader rule');
if (!current.includes('מצב שבו `workbookReady=true` אך לא נמצאו רכיבי `.wb-page` הוא **כשל פרסום**')) throw new Error('Failed to lock non-empty pages rule');

await writeFile(path, current, 'utf8');
console.log('SOURCE_OF_TRUTH: static .wb-page reader contract enforced');
