import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TextbookBoxSize = 'sm' | 'md' | 'lg';

export function TextbookAnswerBox({ size = 'md', className }: { size?: TextbookBoxSize; className?: string }) {
  return <span className={cn('textbook-answer-box', `textbook-answer-box--${size}`, className)} aria-hidden="true" />;
}

export function TextbookFraction({ numerator, denominator }: { numerator?: ReactNode; denominator?: ReactNode }) {
  return (
    <span className="textbook-fraction" dir="ltr" aria-label="שבר">
      <span className="textbook-fraction-slot">{numerator ?? <TextbookAnswerBox />}</span>
      <span className="textbook-fraction-line" aria-hidden="true" />
      <span className="textbook-fraction-slot">{denominator ?? <TextbookAnswerBox />}</span>
    </span>
  );
}

export function TextbookRatioAnswer({ size = 'md' }: { size?: TextbookBoxSize }) {
  return (
    <span className="textbook-ratio-answer" dir="ltr" aria-label="מקום לכתיבת יחס">
      <TextbookAnswerBox size={size} />
      <span className="textbook-ratio-colon" aria-hidden="true">:</span>
      <TextbookAnswerBox size={size} />
    </span>
  );
}

export function TextbookSelect({ options = [], ariaLabel = 'בחירה' }: { options?: string[]; ariaLabel?: string }) {
  return (
    <select className="textbook-select" defaultValue="" aria-label={ariaLabel}>
      <option value="" disabled></option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

export function TextbookDownArrow() {
  return <div className="textbook-down-arrow" aria-hidden="true">↓</div>;
}

export function TextbookActivityTitle({ children }: { children: ReactNode }) {
  return <div className="textbook-activity-title">{children}</div>;
}

export function TextbookQuestionTitle({ n }: { n: number }) {
  return (
    <div className="textbook-question-title">
      <strong>שאלה {n}</strong>
      <span>(12.5 נקודות)</span>
    </div>
  );
}
