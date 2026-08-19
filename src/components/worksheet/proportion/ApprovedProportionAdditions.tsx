import { ReactNode } from 'react';
import { PageLayout } from '../pages/PageLayout';

const CHAPTER = '7 · פרופורציה';
const TOPIC = 'פרופורציה';
const ACCENT = '#1f2a44';
const BORDER = '#9fb0c8';

function Box({ width = 58 }: { width?: number }) {
  return <span aria-hidden="true" style={{ display: 'inline-block', width, height: 31, border: `1px solid ${BORDER}`, verticalAlign: 'middle', background: '#fff' }} />;
}

function Fraction({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span dir="ltr" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 64, verticalAlign: 'middle', marginInline: 8 }}>
      <span style={{ minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>{num}</span>
      <span style={{ borderTop: `1.5px solid ${ACCENT}` }} />
      <span style={{ minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>{den}</span>
    </span>
  );
}

function FractionBoxes({ num, den }: { num?: ReactNode; den?: ReactNode }) {
  return <Fraction num={num ?? <Box />} den={den ?? <Box />} />;
}

function RatioBoxes() {
  return (
    <span dir="ltr" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, verticalAlign: 'middle', marginInline: 8 }}>
      <Box /><span style={{ fontSize: 24 }}>:</span><Box />
    </span>
  );
}

function Choice({ options = [] }: { options?: string[] }) {
  return (
    <select defaultValue="" aria-label="בחירה" style={{ minWidth: 132, height: 34, border: `1px solid ${BORDER}`, background: '#fff', font: 'inherit', marginInline: 6 }}>
      <option value="" disabled></option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function Arrow() {
  return <div aria-hidden="true" style={{ fontSize: 34, lineHeight: 1, textAlign: 'center', margin: '6px 0' }}>↓</div>;
}

function ActivityTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 28, fontWeight: 700, color: ACCENT, marginBottom: 20 }}>{children}</div>;
}

function QuestionTitle({ n }: { n: number }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 24 }}><strong style={{ fontSize: 26 }}>שאלה {n}</strong><span style={{ color: '#7d8a97', fontSize: 15 }}>(12.5 נקודות)</span></div>;
}

const text = { fontSize: 20, lineHeight: 1.65 } as const;
const centered = { ...text, textAlign: 'center' as const };
const row = { ...text, display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 7 };

function IntroActivity() {
  return (
    <PageLayout pageNumber={901} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 20 }}>
        <ActivityTitle>פרופורציה=שוויון בין יחסים</ActivityTitle>
        <p>שכבת ח׳ האלופה יצאה לטיול שנתי.</p>
        <p>בכיתה ח׳1 על כל 10 תלמידים יש מורה מבוגר מלווה.</p>
        <div style={row}>השלימו: בכיתה ח׳1 יצאו פי 10 <Choice options={['תלמידים', 'מורים']} /> מאשר <Choice options={['תלמידים', 'מורים']} /></div>
        <div style={row}>היחס בין המורים לתלמידים הוא: <FractionBoxes /> <span>(אפשר לכתוב גם:</span><RatioBoxes /><span>)</span></div>
        <div style={{ height: 12 }} />
        <p>בכיתה ח׳2 יצאו לטיול 30 תלמידים ו - 3 מבוגרים</p>
        <div style={row}>היחס בין המבוגרים לתלמידים בכיתה ח׳2 הוא: <FractionBoxes num={3} /></div>
        <Arrow />
        <div style={{ ...row, justifyContent: 'center' }}><FractionBoxes /><strong style={{ color: ACCENT }}>יחס מצומצם</strong></div>
        <div style={{ height: 6 }} />
        <div style={row}><strong style={{ color: ACCENT }}>מסקנה:</strong> גם בכיתה ח׳1 וגם בכיתה ח׳2 היחס בין המבוגרים לילדים הוא 1 ל - <Box /></div>
        <div style={row}>היחס בין המבוגרים לילדים בשתי הכיתות הוא: <Choice /></div>
        <p>לכן יש פרופורציה בין היחסים.</p>
      </div>
    </PageLayout>
  );
}

function Question2() {
  return (
    <PageLayout pageNumber={902} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 22 }}>
        <QuestionTitle n={2} />
        <div style={row}>איך כותבים את היחס בין 8 ל 80?<Choice /></div>
        <div style={row}>היחס 2:20 הוא היחס בין <Choice /> ל - <Choice /></div>
        <p>איך בודקים את היחסים הם שווים ? בואו נצמצם!</p>
        <div style={{ ...row, justifyContent: 'space-around' }}><span><Fraction num={2} den={20} /> = <FractionBoxes /></span><span><Fraction num={8} den={80} /> = <FractionBoxes /></span></div>
        <div style={row}>קיבלנו שלאחר צמצום היחסים <Choice /> ולכן <Choice /> ביניהם פרופורציה.</div>
        <ActivityTitle>אם יחסים שווים אז אומרים שהם פרופורציוניים</ActivityTitle>
        <div style={row}>אם יחסים <strong>לא שווים</strong> אז הם <Choice options={['פרופורציוניים', 'לא פרופורציוניים']} /></div>
      </div>
    </PageLayout>
  );
}

function Question3() {
  return (
    <PageLayout pageNumber={903} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 24 }}>
        <QuestionTitle n={3} />
        <p><strong>המחיר של 3 עטים הוא 27 שקלים. המחיר של 5 עטים הוא 45 שקלים</strong></p>
        <p>האם היחס <strong>3:27</strong> שווה ליחס <strong>5:45</strong>?</p>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', textAlign: 'center' }}>
          <div><strong style={{ fontSize: 32 }}>3:27</strong><Arrow /><RatioBoxes /></div>
          <div><strong style={{ fontSize: 32 }}>5:45</strong><Arrow /><RatioBoxes /></div>
        </div>
        <div style={row}>היחסים המצומצמים <Choice /> ולכן <Choice /> פרופורציה</div>
      </div>
    </PageLayout>
  );
}

function Question4() {
  return (
    <PageLayout pageNumber={904} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 24 }}>
        <QuestionTitle n={4} />
        <p><strong>מכונית עוברת 120 ק״מ במשך 2 שעות</strong></p>
        <p><strong>רכבת עוברת 240 ק״מ במשך 3 שעות</strong></p>
        <p><strong>מה היחס בין המרחק של הנסיעה לבין זמן הנסיעה?</strong></p>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', textAlign: 'center' }}>
          <div><div style={{ fontWeight: 600, marginBottom: 8 }}>רכבת</div><Arrow /><span><FractionBoxes /> = <FractionBoxes /></span></div>
          <div><div style={{ fontWeight: 600, marginBottom: 8 }}>מכונית</div><Arrow /><span><FractionBoxes /> = <FractionBoxes /></span></div>
        </div>
        <div style={row}>היחסים <Choice /> ולכן <Choice /> ביניהם פרופורציה.</div>
      </div>
    </PageLayout>
  );
}

function HowToWrite() {
  return (
    <PageLayout pageNumber={905} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 22 }}>
        <ActivityTitle>איך כותבים?</ActivityTitle>
        <div style={row}><strong>היחס בין 5 ל - 10</strong> : נכתוב ← <FractionBoxes /> <span>ואפשר גם לכתוב:</span><RatioBoxes /></div>
        <div style={row}><strong>היחס בין 3 ל - 6</strong> : נכתוב ← <FractionBoxes /> <span>ואפשר גם לכתוב:</span><RatioBoxes /></div>
        <div style={row}>אם מצמצמים את היחסים שכתבנו למעלה מקבלים שהם שווים ליחס המצומצם: <FractionBoxes /></div>
        <ActivityTitle>היחסים שווים = היחסים פרופורציוניים</ActivityTitle>
        <ActivityTitle>איך כותבים?</ActivityTitle>
        <p><strong>היחס בין 5 ל - 10 שווה ליחס בין 3 ל - 6</strong></p>
        <div style={row}><strong>נכתוב (משמאל לימין) ←</strong><FractionBoxes /> = <FractionBoxes /></div>
      </div>
    </PageLayout>
  );
}

function Question6() {
  return (
    <PageLayout pageNumber={906} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 24 }}>
        <QuestionTitle n={6} />
        <ActivityTitle>איך כותבים?</ActivityTitle>
        <p><strong>היחס בין a ל - b שווה ליחס בין c ל - d:</strong></p>
        <div style={row}><strong>נכתוב (משמאל לימין) ←</strong><FractionBoxes /> = <FractionBoxes /></div>
        <div style={row}>ואפשר גם לכתוב כך: <RatioBoxes /> = <RatioBoxes /></div>
      </div>
    </PageLayout>
  );
}

function Question7() {
  return (
    <PageLayout pageNumber={907} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 24 }}>
        <QuestionTitle n={7} />
        <div style={row}>היחס בין <Fraction num={5} den={10} /> שווה ליחס בין <Fraction num={3} den={6} /> ( כי שניהם שווים ל - <FractionBoxes /> )</div>
        <div style={{ ...centered, fontSize: 26 }}><Fraction num={5} den={10} /> = <Fraction num={3} den={6} /></div>
        <ActivityTitle>איזה קשר נוסף יש בין המספרים?</ActivityTitle>
        <div style={row}><strong>מתקיים כפל בהצלבה:</strong> 5 · <Box width={70} /> = 3 · <Box width={70} /></div>
        <div style={{ ...row, justifyContent: 'center', marginTop: 18 }}><strong>אם:</strong><Fraction num="a" den="b" /> = <Fraction num="c" den="d" /><strong>אז:</strong><Box width={70} /> · b = <Box width={70} /> · d</div>
      </div>
    </PageLayout>
  );
}

function Question8() {
  return (
    <PageLayout pageNumber={908} chapter={CHAPTER} topic={TOPIC}>
      <div style={{ ...text, display: 'grid', gap: 24 }}>
        <QuestionTitle n={8} />
        <p>היחס בין 2 ל-18 שווה ליחס בין 8 ל-x:</p>
        <div style={row}>השלימו את המשוואה: <Fraction num={2} den={<Box />} /> = <FractionBoxes /></div>
        <Arrow />
        <div style={{ ...row, justifyContent: 'center' }}><span>2 · <Box width={72} /> = <Box width={82} /></span><strong style={{ color: ACCENT }}>(כפל בהצלבה)</strong></div>
        <Arrow />
        <div style={{ ...row, justifyContent: 'center' }}><em>x</em> = <Box width={82} /></div>
      </div>
    </PageLayout>
  );
}

export const APPROVED_PROPORTION_ADDITION_PAGES = [
  { key: 'prop-addition-01', title: 'פרופורציה — פתיחה', component: () => <IntroActivity /> },
  { key: 'prop-addition-02', title: 'פרופורציה — שאלה 2', component: () => <Question2 /> },
  { key: 'prop-addition-03', title: 'פרופורציה — שאלה 3', component: () => <Question3 /> },
  { key: 'prop-addition-04', title: 'פרופורציה — שאלה 4', component: () => <Question4 /> },
  { key: 'prop-addition-05', title: 'פרופורציה — איך כותבים?', component: () => <HowToWrite /> },
  { key: 'prop-addition-06', title: 'פרופורציה — שאלה 6', component: () => <Question6 /> },
  { key: 'prop-addition-07', title: 'פרופורציה — שאלה 7', component: () => <Question7 /> },
  { key: 'prop-addition-08', title: 'פרופורציה — שאלה 8', component: () => <Question8 /> },
] as const;
