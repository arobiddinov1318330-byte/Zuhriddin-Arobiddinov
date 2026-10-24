// Data layer. Currently backed by localStorage (demo). Swap these async
// functions for real server calls later without touching the UI.

export interface ResultRecord {
  certId: string;
  name: string;
  score: number;
  correct: number;
  total: number;
  seconds: number;
  date: string;
  seed?: number;
  points?: number;
  maxPoints?: number;
}

const KEY = "essence-iq-results";

function read(): ResultRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export async function saveResult(r: ResultRecord) {
  const all = read().filter((x) => x.certId !== r.certId);
  localStorage.setItem(KEY, JSON.stringify([r, ...all].slice(0, 50)));
}

export async function findCertificate(id: string) {
  return read().find((x) => x.certId.toUpperCase() === id.trim().toUpperCase()) ?? null;
}

/** Real persisted results only (this device): best score per name, no demo entries. */
export async function getLeaderboard(me?: string): Promise<{ name: string; score: number; me?: boolean }[]> {
  const best = new Map<string, number>();
  for (const r of read()) best.set(r.name, Math.max(best.get(r.name) ?? 0, r.score));
  return [...best]
    .map(([name, score]) => ({ name, score, me: name === me }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
