import { ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';

export const GRAPHICS_TOKENS = {
  ink: '#1f2a44',
  inkSoft: '#475569',
  grid: '#d8e0eb',
  gridStrong: '#a8b5c6',
  fillMid: '#cbd5e1',
  accentBlue: '#1e40af',
  strokeFine: 0.9,
  strokeNormal: 1.5,
  strokeStrong: 2,
} as const;

type MathSvgProps = {
  viewBox: string;
  width?: number | string;
  height?: number | string;
  label?: string;
  className?: string;
  family?: 'chart' | 'counters' | 'generic' | 'geometry' | 'grid' | 'number-line' | 'ratio-model';
  children: ReactNode;
};

export function MathSvg({ viewBox, width, height, label, className, family = 'generic', children }: MathSvgProps) {
  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className={cn('math-graphic', className)}
      data-graphic-family={family}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      {children}
    </svg>
  );
}

export function DotPattern({ id, spacing = 8, radius = 1.4, fill = GRAPHICS_TOKENS.accentBlue }: {
  id: string;
  spacing?: number;
  radius?: number;
  fill?: string;
}) {
  const half = spacing / 2;
  return (
    <pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse">
      <circle cx={half} cy={half} r={radius} fill={fill} stroke="none" />
    </pattern>
  );
}

type GridCell = {
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  fill?: string;
  pattern?: 'dots';
};

export function ParametricGrid({
  rows,
  cols,
  cellWidth,
  cellHeight,
  cells = [],
  label,
  className,
}: {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  cells?: GridCell[];
  label?: string;
  className?: string;
}) {
  const patternId = `dots-${useId().replace(/:/g, '')}`;
  const width = cols * cellWidth;
  const height = rows * cellHeight;
  return (
    <MathSvg viewBox={`0 0 ${width} ${height}`} label={label} className={className} family="grid">
      <defs><DotPattern id={patternId} /></defs>
      <rect x={0.75} y={0.75} width={width - 1.5} height={height - 1.5} fill="#fff" stroke={GRAPHICS_TOKENS.ink} strokeWidth={GRAPHICS_TOKENS.strokeNormal} />
      {cells.map((cell, index) => {
        const w = (cell.colSpan ?? 1) * cellWidth;
        const h = (cell.rowSpan ?? 1) * cellHeight;
        return (
          <rect
            key={`${cell.row}-${cell.col}-${index}`}
            x={cell.col * cellWidth}
            y={cell.row * cellHeight}
            width={w}
            height={h}
            fill={cell.pattern === 'dots' ? `url(#${patternId})` : (cell.fill ?? '#fff')}
            stroke={GRAPHICS_TOKENS.ink}
            strokeWidth={GRAPHICS_TOKENS.strokeFine}
          />
        );
      })}
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`v-${i}`} x1={(i + 1) * cellWidth} y1={0} x2={(i + 1) * cellWidth} y2={height} stroke={GRAPHICS_TOKENS.gridStrong} strokeWidth={GRAPHICS_TOKENS.strokeFine} />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line key={`h-${i}`} x1={0} y1={(i + 1) * cellHeight} x2={width} y2={(i + 1) * cellHeight} stroke={GRAPHICS_TOKENS.gridStrong} strokeWidth={GRAPHICS_TOKENS.strokeFine} />
      ))}
    </MathSvg>
  );
}

export function CircleStrip({ filled, hollow, radius = 8, gap = 6, label }: {
  filled: number;
  hollow: number;
  radius?: number;
  gap?: number;
  label?: string;
}) {
  const total = filled + hollow;
  const step = radius * 2 + gap;
  const width = total * step - gap;
  const height = radius * 2 + 4;
  return (
    <MathSvg viewBox={`0 0 ${width} ${height}`} width={width} height={height} label={label} family="counters">
      {Array.from({ length: total }, (_, i) => (
        <circle
          key={i}
          cx={radius + i * step}
          cy={height / 2}
          r={radius}
          fill={i < filled ? '#111827' : '#fff'}
          stroke={GRAPHICS_TOKENS.ink}
          strokeWidth={GRAPHICS_TOKENS.strokeNormal}
        />
      ))}
    </MathSvg>
  );
}

export function DimensionLine({ x1, y1, x2, y2, label }: {
  x1: number; y1: number; x2: number; y2: number; label?: string;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g className="math-dimension-line">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GRAPHICS_TOKENS.inkSoft} strokeWidth={GRAPHICS_TOKENS.strokeFine} />
      {label ? <text x={mx} y={my - 5} textAnchor="middle" fontSize="11" direction="ltr">{label}</text> : null}
    </g>
  );
}

export function RightAngleMarker({ x, y, size = 9 }: { x: number; y: number; size?: number }) {
  return <path d={`M ${x} ${y - size} L ${x + size} ${y - size} L ${x + size} ${y}`} fill="none" stroke={GRAPHICS_TOKENS.ink} strokeWidth={GRAPHICS_TOKENS.strokeFine} />;
}
