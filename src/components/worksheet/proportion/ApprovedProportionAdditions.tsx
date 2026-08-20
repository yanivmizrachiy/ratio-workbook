import { ReactNode } from 'react';
import { PageLayout } from '../pages/PageLayout';
import {
  TextbookActivityTitle,
  TextbookAnswerBox,
  TextbookDownArrow,
  TextbookFraction,
  TextbookQuestionTitle,
  TextbookRatioAnswer,
  TextbookSelect,
} from '../TextbookPrimitives';

const CHAPTER = '7 · פרופורציה';
const TOPIC = 'פרופורציה';

function ProportionPage({ pageNumber, children }: { pageNumber: number; children: ReactNode }) {
  return (
    <PageLayout pageNumber={pageNumber} chapter={CHAPTER} topic={TOPIC} className="approved-proportion-page">
      <div className="approved-proportion-content">{children}</div>
    </PageLayout>
  );
}

function Row({ children, center = false, spread = false }: { children: ReactNode; center?: boolean; spread?: boolean }) {
  const className = [
    'approved-proportion-row',
    center ? 'approved-proportion-row--center' : '',
    spread ? 'approved-proportion-row--spread' : '',
  ].filter(Boolean).join(' ');
  return <div className={className}>{children}</div>;
}

function IntroActivity() {
  return (
    <ProportionPage pageNumber={901}>
      <TextbookActivityTitle>פרופורציה=שוויון בין יחסים</TextbookActivityTitle>
      <p>שכבת ח' האלופה יצאה לטיול שנתי.</p>
      <p>בכיתה ח'1 על כל 10 תלמידים יש מורה מבוגר מלווה.</p>
      <Row>השלימו: בכיתה ח'1 יצאו פי 10 <TextbookSelect options={['תלמידים', 'מורים']} /> מאשר <TextbookSelect options={['תלמידים', 'מורים']} /></Row>
      <Row>היחס בין המורים לתלמידים הוא: <TextbookFraction /> <span>(אפשר לכתוב גם:</span><TextbookRatioAnswer /><span>)</span></Row>
      <div className="approved-proportion-spacer--sm" />
      <p>בכיתה ח'2 יצאו לטיול 30 תלמידים ו - 3 מבוגרים</p>
      <Row>היחס בין המבוגרים לתלמידים בכיתה ח'2 הוא: <TextbookFraction numerator={3} /></Row>
      <TextbookDownArrow />
      <Row center><TextbookFraction /><strong className="approved-proportion-label">יחס מצומצם</strong></Row>
      <div className="approved-proportion-spacer--sm" />
      <Row><strong className="approved-proportion-label">מסקנה:</strong> גם בכיתה ח'1 וגם בכיתה ח'2 היחס בין המבוגרים לילדים הוא 1 ל - <TextbookAnswerBox /></Row>
      <Row>היחס בין המבוגרים לילדים בשתי הכיתות הוא: <TextbookSelect /></Row>
      <p>לכן יש פרופורציה בין היחסים.</p>
    </ProportionPage>
  );
}

function Question2() {
  return (
    <ProportionPage pageNumber={902}>
      <TextbookQuestionTitle n={2} />
      <Row>איך כותבים את היחס בין 8 ל 80?<TextbookSelect /></Row>
      <Row>היחס 2:20 הוא היחס בין <TextbookSelect /> ל - <TextbookSelect /></Row>
      <p>איך בודקים את היחסים הם שווים ? בואו נצמצם!</p>
      <Row spread><span><TextbookFraction numerator={2} denominator={20} /> = <TextbookFraction /></span><span><TextbookFraction numerator={8} denominator={80} /> = <TextbookFraction /></span></Row>
      <Row>קיבלנו שלאחר צמצום היחסים <TextbookSelect /> ולכן <TextbookSelect /> ביניהם פרופורציה.</Row>
      <TextbookActivityTitle>אם יחסים שווים אז אומרים שהם פרופורציוניים</TextbookActivityTitle>
      <Row>אם יחסים <strong>לא שווים</strong> אז הם <TextbookSelect options={['פרופורציוניים', 'לא פרופורציוניים']} /></Row>
    </ProportionPage>
  );
}

function Question3() {
  return (
    <ProportionPage pageNumber={903}>
      <TextbookQuestionTitle n={3} />
      <p><strong>המחיר של 3 עטים הוא 27 שקלים. המחיר של 5 עטים הוא 45 שקלים</strong></p>
      <p>האם היחס <strong>3:27</strong> שווה ליחס <strong>5:45</strong>?</p>
      <Row spread>
        <div className="approved-proportion-pair"><strong className="approved-proportion-emphasis">3:27</strong><TextbookDownArrow /><TextbookRatioAnswer /></div>
        <div className="approved-proportion-pair"><strong className="approved-proportion-emphasis">5:45</strong><TextbookDownArrow /><TextbookRatioAnswer /></div>
      </Row>
      <Row>היחסים המצומצמים <TextbookSelect /> ולכן <TextbookSelect /> פרופורציה</Row>
    </ProportionPage>
  );
}

function Question4() {
  return (
    <ProportionPage pageNumber={904}>
      <TextbookQuestionTitle n={4} />
      <p><strong>מכונית עוברת 120 ק"מ במשך 2 שעות</strong></p>
      <p><strong>רכבת עוברת 240 ק"מ במשך 3 שעות</strong></p>
      <p><strong>מה היחס בין המרחק של הנסיעה לבין זמן הנסיעה?</strong></p>
      <Row spread>
        <div className="approved-proportion-pair"><div className="approved-proportion-pair-title">רכבת</div><TextbookDownArrow /><span><TextbookFraction /> = <TextbookFraction /></span></div>
        <div className="approved-proportion-pair"><div className="approved-proportion-pair-title">מכונית</div><TextbookDownArrow /><span><TextbookFraction /> = <TextbookFraction /></span></div>
      </Row>
      <Row>היחסים <TextbookSelect /> ולכן <TextbookSelect /> ביניהם פרופורציה.</Row>
    </ProportionPage>
  );
}

function HowToWrite() {
  return (
    <ProportionPage pageNumber={905}>
      <TextbookActivityTitle>איך כותבים?</TextbookActivityTitle>
      <Row><strong>היחס בין 5 ל - 10</strong> : נכתוב ← <TextbookFraction /> <span>ואפשר גם לכתוב:</span><TextbookRatioAnswer /></Row>
      <Row><strong>היחס בין 3 ל - 6</strong> : נכתוב ← <TextbookFraction /> <span>ואפשר גם לכתוב:</span><TextbookRatioAnswer /></Row>
      <Row>אם מצמצמים את היחסים שכתבנו למעלה מקבלים שהם שווים ליחס המצומצם: <TextbookFraction /></Row>
      <TextbookActivityTitle>היחסים שווים = היחסים פרופורציוניים</TextbookActivityTitle>
      <TextbookActivityTitle>איך כותבים?</TextbookActivityTitle>
      <p><strong>היחס בין 5 ל - 10 שווה ליחס בין 3 ל - 6</strong></p>
      <Row><strong>נכתוב (משמאל לימין) ←</strong><TextbookFraction /> = <TextbookFraction /></Row>
    </ProportionPage>
  );
}

function Question6() {
  return (
    <ProportionPage pageNumber={906}>
      <TextbookQuestionTitle n={6} />
      <TextbookActivityTitle>איך כותבים?</TextbookActivityTitle>
      <p><strong>היחס בין a ל - b שווה ליחס בין c ל - d:</strong></p>
      <Row><strong>נכתוב (משמאל לימין) ←</strong><TextbookFraction /> = <TextbookFraction /></Row>
      <Row>ואפשר גם לכתוב כך: <TextbookRatioAnswer /> = <TextbookRatioAnswer /></Row>
    </ProportionPage>
  );
}

function Question7() {
  return (
    <ProportionPage pageNumber={907}>
      <TextbookQuestionTitle n={7} />
      <Row>היחס בין <TextbookFraction numerator={5} denominator={10} /> שווה ליחס בין <TextbookFraction numerator={3} denominator={6} /> ( כי שניהם שווים ל - <TextbookFraction /> )</Row>
      <div className="approved-proportion-center"><TextbookFraction numerator={5} denominator={10} /> = <TextbookFraction numerator={3} denominator={6} /></div>
      <TextbookActivityTitle>איזה קשר נוסף יש בין המספרים?</TextbookActivityTitle>
      <Row><strong>מתקיים כפל בהצלבה:</strong> 5 · <TextbookAnswerBox size="lg" /> = 3 · <TextbookAnswerBox size="lg" /></Row>
      <Row center><strong>אם:</strong><TextbookFraction numerator="a" denominator="b" /> = <TextbookFraction numerator="c" denominator="d" /><strong>אז:</strong><TextbookAnswerBox size="lg" /> · b = <TextbookAnswerBox size="lg" /> · d</Row>
    </ProportionPage>
  );
}

function Question8() {
  return (
    <ProportionPage pageNumber={908}>
      <TextbookQuestionTitle n={8} />
      <p>היחס בין 2 ל-18 שווה ליחס בין 8 ל-x:</p>
      <Row>השלימו את המשוואה: <TextbookFraction numerator={2} denominator={<TextbookAnswerBox />} /> = <TextbookFraction /></Row>
      <TextbookDownArrow />
      <Row center><span>2 · <TextbookAnswerBox size="lg" /> = <TextbookAnswerBox size="lg" /></span><strong className="approved-proportion-label">(כפל בהצלבה)</strong></Row>
      <TextbookDownArrow />
      <Row center><em>x</em> = <TextbookAnswerBox size="lg" /></Row>
    </ProportionPage>
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
