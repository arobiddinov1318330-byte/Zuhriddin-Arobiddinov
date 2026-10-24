// Original Raven-style matrix puzzle generator. Pure + seeded so a backend
// (or a friend in battle mode) can reproduce the exact same test from a seed.

export type ShapeKind = "circle" | "triangle" | "square" | "pentagon" | "hexagon";
export type Fill = "solid" | "outline" | "dot";
export type RuleType = "count" | "latin" | "rotation" | "size" | "countLatin" | "position";

export interface Cell {
  shape: ShapeKind;
  count: number;
  rotation: number;
  fill: Fill;
  size: number;
  pos?: number; // 0..3 corner, only for position rule
}

export interface Puzzle {
  id: string;
  rule: RuleType;
  grid: Cell[]; // 9 cells, index 8 is the hidden answer
  options: Cell[]; // 4 visual choices
  answerIndex: number;
  difficulty: Difficulty;
  timeLimit: number; // seconds
}

export type Difficulty = 1 | 2 | 3;
export const DIFFICULTY: Record<RuleType, Difficulty> = { count: 1, size: 1, latin: 2, rotation: 2, position: 2, countLatin: 3 };
export const TIME_LIMIT: Record<Difficulty, number> = { 1: 40, 2: 60, 3: 90 };
export const MAX_COUNT = 4;

export const SHAPES: ShapeKind[] = ["circle", "triangle", "square", "pentagon", "hexagon"];
export const FILLS: Fill[] = ["solid", "outline", "dot"];
export const RULES: RuleType[] = ["count", "latin", "rotation", "size", "countLatin", "position"];
const SYM: Record<ShapeKind, number> = { circle: 1, triangle: 120, square: 90, pentagon: 72, hexagon: 60 };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
const pick = <T,>(r: Rng, a: T[]) => a[Math.floor(r() * a.length)];
function shuffle<T>(r: Rng, a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Visual identity key: rotations equal under the shape's symmetry are the same picture. */
export function cellKey(c: Cell) {
  const sym = SYM[c.shape];
  const rot = sym === 1 ? 0 : ((c.rotation % sym) + sym) % sym;
  return [c.shape, c.count, rot, c.fill, c.size, c.pos ?? -1].join("|");
}

const base = (shape: ShapeKind, fill: Fill): Cell => ({ shape, count: 1, rotation: 0, fill, size: 1 });

function buildGrid(rule: RuleType, r: Rng): Cell[] {
  const S = shuffle(r, SHAPES).slice(0, 3);
  const F = shuffle(r, FILLS);
  const g: Cell[] = [];
  const offset = pick(r, [0, 1]);
  const step = pick(r, [30, 45]);
  const rotShapes = shuffle(r, ["triangle", "pentagon", "triangle"] as ShapeKind[]);
  const sizes = r() < 0.5 ? [0.45, 0.72, 1] : [1, 0.72, 0.45];
  const dir = r() < 0.5 ? 1 : 3;
  const f0 = pick(r, ["solid", "outline"] as Fill[]);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++) {
      switch (rule) {
        case "count":
          g.push({ ...base(S[row], F[row]), count: col + 1 + offset });
          break;
        case "latin":
          g.push(base(S[(row + col) % 3], F[(row + 2 * col) % 3]));
          break;
        case "rotation":
          g.push({ ...base(rotShapes[row], F[row]), rotation: (col + row) * step });
          break;
        case "size":
          g.push({ ...base(S[row], F[row]), size: sizes[col] });
          break;
        case "countLatin":
          g.push({ ...base(S[(row + 2 * col) % 3], f0), count: ((row + col) % 3) + 1 });
          break;
        case "position":
          g.push({ ...base(S[row], F[row]), size: 0.45, pos: (row + col * dir) % 4 });
          break;
      }
    }
  return g;
}

function mutations(a: Cell, rule: RuleType): Cell[] {
  const out: Cell[] = [];
  out.push({ ...a, count: a.count + 1 }, { ...a, count: Math.max(1, a.count - 1) });
  SHAPES.forEach((s) => out.push({ ...a, shape: s }));
  FILLS.forEach((f) => out.push({ ...a, fill: f }));
  if (rule === "rotation") [15, 30, 45, -30].forEach((d) => out.push({ ...a, rotation: a.rotation + d }));
  if (rule === "size") [0.45, 0.72, 1].forEach((s) => out.push({ ...a, size: s }));
  if (rule === "position") [0, 1, 2, 3].forEach((p) => out.push({ ...a, pos: p }));
  // Drop out-of-range counts: 5+ renders identically to 4 and would be a visual duplicate.
  return out.filter((c) => c.count >= 1 && c.count <= MAX_COUNT);
}

/** True when the answer is present exactly once and every option is a distinct, renderable picture. */
export function validatePuzzle(p: Puzzle): boolean {
  if (p.grid.length !== 9 || p.options.length !== 4) return false;
  const keys = p.options.map(cellKey);
  if (new Set(keys).size !== 4) return false;
  const ak = cellKey(p.grid[8]);
  if (keys.filter((k) => k === ak).length !== 1 || keys[p.answerIndex] !== ak) return false;
  return p.options.every((c) => c.count >= 1 && c.count <= MAX_COUNT);
}

export function generatePuzzle(rule: RuleType, r: Rng, id: string): Puzzle {
  const grid = buildGrid(rule, r);
  const answer = grid[8];
  const ak = cellKey(answer);
  const seen = new Set([ak]);
  // Plausible distractors first: other cells from the grid, then single-attribute mutations.
  const pool = [...shuffle(r, grid.slice(0, 8)), ...shuffle(r, mutations(answer, rule))];
  const near = shuffle(r, mutations(answer, rule));
  const distractors: Cell[] = [];
  for (const c of [near[0], ...pool, ...near]) {
    if (!c || distractors.length >= 3) continue;
    const k = cellKey(c);
    if (seen.has(k)) continue;
    seen.add(k);
    distractors.push(c);
  }
  const answerIndex = Math.floor(r() * 4);
  const options = [...distractors];
  options.splice(answerIndex, 0, answer);
  const difficulty = DIFFICULTY[rule];
  return { id, rule, grid, options, answerIndex, difficulty, timeLimit: TIME_LIMIT[difficulty] };
}

/** 20 unique puzzles, rules evenly mixed, reproducible from the seed. */
export function makeTest(seed: number, n = 20): Puzzle[] {
  const r = mulberry32(seed);
  const out: Puzzle[] = [];
  const sigs = new Set<string>();
  let order: RuleType[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 1000) {
    if (!order.length) order = shuffle(r, RULES);
    const rule = order.shift()!;
    const p = generatePuzzle(rule, r, `${seed}-${out.length}`);
    const sig = rule + p.grid.map(cellKey).join("/");
    if (sigs.has(sig) || !validatePuzzle(p)) continue;
    sigs.add(sig);
    out.push(p);
  }
  return out;
}

/** Practice estimate only — not a clinically valid IQ score. */
export const estimateScore = (correct: number, total: number) => Math.round(70 + (correct / total) * 75);

/** Difficulty-weighted points: a correct answer earns its puzzle's difficulty (1–3); timeouts/wrong earn 0. */
export function scoreTest(puzzles: Puzzle[], answers: (number | null | undefined)[]) {
  let points = 0, max = 0, correct = 0;
  puzzles.forEach((p, i) => {
    max += p.difficulty;
    if (answers[i] === p.answerIndex) { points += p.difficulty; correct++; }
  });
  return { points, max, correct, score: max ? estimateScore(points, max) : 70 };
}
