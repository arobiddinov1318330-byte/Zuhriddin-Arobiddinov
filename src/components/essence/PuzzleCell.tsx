import type { Cell, ShapeKind } from "@/lib/puzzles";

const SIDES: Record<Exclude<ShapeKind, "circle">, number> = { triangle: 3, square: 4, pentagon: 5, hexagon: 6 };
const LAYOUT: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[29, 50], [71, 50]],
  3: [[50, 28], [28, 70], [72, 70]],
  4: [[29, 29], [71, 29], [29, 71], [71, 71]],
};
const RADIUS: Record<number, number> = { 1: 32, 2: 18, 3: 17, 4: 16 };
const CORNERS: [number, number][] = [[28, 28], [72, 28], [72, 72], [28, 72]];

function Shape({ cell, cx, cy, r }: { cell: Cell; cx: number; cy: number; r: number }) {
  const solid = cell.fill === "solid";
  const props = {
    fill: solid ? "currentColor" : "none",
    stroke: "currentColor",
    strokeWidth: solid ? 0 : Math.max(3, r * 0.16),
    strokeLinejoin: "round" as const,
  };
  let el;
  if (cell.shape === "circle") el = <circle cx={cx} cy={cy} r={r} {...props} />;
  else {
    const n = SIDES[cell.shape];
    const start = n === 4 ? -45 : -90;
    const pts = Array.from({ length: n }, (_, i) => {
      const a = ((start + cell.rotation + (i * 360) / n) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ");
    el = <polygon points={pts} {...props} />;
  }
  return (
    <g>
      {el}
      {cell.fill === "dot" && <circle cx={cx} cy={cy} r={r * 0.3} fill="currentColor" />}
    </g>
  );
}

export function PuzzleCell({ cell }: { cell: Cell }) {
  const pts = cell.pos !== undefined ? [CORNERS[cell.pos]] : LAYOUT[Math.min(cell.count, 4)] ?? LAYOUT[1];
  const r = (cell.pos !== undefined ? 32 : RADIUS[Math.min(cell.count, 4)]) * cell.size;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full text-tile-ink" aria-hidden>
      {pts.map(([x, y], i) => (
        <Shape key={i} cell={cell} cx={x} cy={y} r={r} />
      ))}
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-from)" />
          <stop offset="1" stopColor="var(--brand-to)" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#lg)" />
      <polygon points="24,9 37,32 11,32" fill="none" stroke="var(--primary-foreground)" strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="24" cy="25" r="4.5" fill="var(--primary-foreground)" />
    </svg>
  );
}
