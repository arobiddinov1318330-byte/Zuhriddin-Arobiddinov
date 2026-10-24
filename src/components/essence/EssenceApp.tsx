import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Swords, Award, Play, Trophy, Share2, Download, X, Check, ArrowLeft, Clock } from "lucide-react";
import { makeTest, scoreTest, type Puzzle } from "@/lib/puzzles";
import { t, levelIndex, type Lang } from "@/lib/i18n";
import { saveResult, findCertificate, getLeaderboard, type ResultRecord } from "@/lib/api";
import { initTelegram, haptic, shareText, tg } from "@/lib/telegram";
import { PuzzleCell, Logo } from "./PuzzleCell";
import { certificateSvg, downloadCertificate } from "./certificate";

type Screen = "home" | "test" | "result" | "battle" | "restore";
interface TestState {
  seed: number;
  puzzles: Puzzle[];
  idx: number;
  answers: (number | null)[];
  selected: number | null;
  revealed: boolean;
  startedAt: number;
  qStartedAt: number;
  timedOut: boolean;
  rival?: number | undefined;
}

const certIdFrom = (seed: number, at: number) => "EIQ-" + ((seed * 31 + at) % 2176782336).toString(36).toUpperCase().padStart(6, "0");
/** Battle code = base36 seed + "." + rival's difficulty-weighted points. */
export function parseBattleCode(code: string): { seed: number; rival?: number | undefined } | null {
  const m = /^(?:b_)?([0-9a-z]+)(?:\.(\d{1,3}))?$/i.exec(code.trim());
  if (!m) return null;
  const seed = parseInt(m[1] ?? "", 36);
  if (!Number.isFinite(seed) || seed <= 0 || seed >= 2147483647) return null;
  return { seed, rival: m[2] !== undefined ? parseInt(m[2], 10) : undefined };
}

export function EssenceApp() {
  const [lang, setLang] = useState<Lang>("uz");
  const [dark, setDark] = useState(true);
  const [name, setName] = useState("Mehmon");
  const [screen, setScreen] = useState<Screen>("home");
  const [test, setTest] = useState<TestState | null>(null);
  const [result, setResult] = useState<ResultRecord | null>(null);
  const [cert, setCert] = useState<ResultRecord | null>(null);
  const [board, setBoard] = useState<{ name: string; score: number; me?: boolean }[]>([]);
  const d = t(lang);

  useEffect(() => {
    const w = initTelegram();
    const s = localStorage.getItem("essence-prefs");
    if (s) {
      const p = JSON.parse(s);
      if (p.lang) setLang(p.lang);
      if (typeof p.dark === "boolean") setDark(p.dark);
      if (p.name) setName(p.name);
    } else if (w?.colorScheme) setDark(w.colorScheme === "dark");
    const u = w?.initDataUnsafe?.user;
    if (u?.first_name) setName([u.first_name, u.last_name].filter(Boolean).join(" "));
    const sp = w?.initDataUnsafe?.start_param ?? new URLSearchParams(location.search).get("battle");
    if (sp) joinBattle(sp.replace(/^b_/, ""));
    getLeaderboard(name).then(setBoard);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("essence-prefs", JSON.stringify({ lang, dark, name }));
  }, [lang, dark, name]);

  function start(seed = Date.now() % 2147483647, rival?: number) {
    const now = Date.now();
    setTest({ seed, puzzles: makeTest(seed), idx: 0, answers: [], selected: null, revealed: false, startedAt: now, qStartedAt: now, timedOut: false, rival });
    setScreen("test");
  }
  function joinBattle(code: string) {
    const b = parseBattleCode(code);
    if (!b) return false;
    start(b.seed, b.rival);
    return true;
  }

  async function finish(st: TestState) {
    const sc = scoreTest(st.puzzles, st.answers);
    const correct = sc.correct;
    const at = Date.now();
    const rec: ResultRecord = {
      certId: certIdFrom(st.seed, at),
      name,
      score: sc.score,
      seed: st.seed,
      points: sc.points,
      maxPoints: sc.max,
      correct,
      total: st.puzzles.length,
      seconds: Math.round((Date.now() - st.startedAt) / 1000),
      date: new Date().toISOString().slice(0, 10),
    };
    await saveResult(rec);
    setResult(rec);
    setBoard(await getLeaderboard(name));
    setScreen("result");
  }

  return (
    <div className="min-h-screen bg-app text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-4">
        <header className="mb-5 flex items-center justify-between">
          <button className="flex items-center gap-2" onClick={() => setScreen("home")}>
            <Logo className="h-9 w-9" />
            <span className="font-display text-lg font-bold tracking-tight">Essence IQ</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-surface p-1">
              {(["uz", "ru", "en"] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase transition ${lang === l ? "btn-brand" : "text-muted-foreground"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button aria-label="theme" onClick={() => setDark(!dark)} className="grid h-9 w-9 place-items-center rounded-full bg-surface">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {screen === "home" && (
          <Home d={d} board={board} onStart={() => start()} onBattle={() => setScreen("battle")} onRestore={() => setScreen("restore")} name={name} setName={setName} />
        )}
        {screen === "test" && test && <TestView d={d} st={test} set={setTest} onFinish={finish} onExit={() => setScreen("home")} />}
        {screen === "result" && result && test && (
          <ResultView d={d} r={result} rival={test.rival} onCert={() => setCert(result)} onHome={() => setScreen("home")} onRetry={() => start()} />
        )}
        {screen === "battle" && <BattleView d={d} onCreate={() => start()} onJoin={joinBattle} onBack={() => setScreen("home")} />}
        {screen === "restore" && <RestoreView d={d} onFound={setCert} onBack={() => setScreen("home")} />}
      </div>
      {cert && <CertModal d={d} r={cert} onClose={() => setCert(null)} />}
    </div>
  );
}

type D = ReturnType<typeof t>;

function Home({ d, board, onStart, onBattle, onRestore, name, setName }: { d: D; board: { name: string; score: number; me?: boolean }[]; onStart: () => void; onBattle: () => void; onRestore: () => void; name: string; setName: (s: string) => void }) {
  const demo = useMemo(() => makeTest(7)[0], []);
  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2">
      <section className="hero-card rounded-3xl p-5">
        <p className="text-sm text-muted-foreground">{d.tagline}</p>
        <h1 className="font-display mt-1 text-3xl font-extrabold leading-tight">
          Essence <span className="text-gradient">IQ</span>
        </h1>
        <div className="mx-auto mt-4 grid w-56 grid-cols-3 gap-2">
          {demo.grid.map((c, i) => (
            <div key={i} className="tile aspect-square p-1.5">
              {i === 8 ? <div className="grid h-full place-items-center font-display text-2xl font-bold text-tile-ink">?</div> : <PuzzleCell cell={c} />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">{d.note}</p>
      </section>

      <label className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-sm">
        <span className="text-muted-foreground">{d.name}</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 30))} className="flex-1 bg-transparent text-right font-semibold outline-none" />
      </label>

      <div className="flex flex-col gap-3">
        <button onClick={onStart} className="btn-brand flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold">
          <Play className="h-5 w-5" /> {d.start}
        </button>
        <button onClick={onBattle} className="btn-outline-brand flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold">
          <Swords className="h-5 w-5" /> {d.battle}
        </button>
        <button onClick={onRestore} className="btn-outline-brand flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold">
          <Award className="h-5 w-5" /> {d.restore}
        </button>
      </div>

      <section className="rounded-3xl bg-surface p-4">
        <h2 className="font-display mb-3 flex items-center gap-2 font-bold">
          <Trophy className="h-5 w-5 text-magenta" /> {d.ranking}
        </h2>
        {board.length === 0 && <p className="text-sm text-muted-foreground">{d.noResults}</p>}
        <ol className="flex flex-col gap-1.5">
          {board.map((b, i) => (
            <li key={b.name + i} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${b.me ? "ring-brand" : ""}`}>
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i < 3 ? "btn-brand" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
              <span className="flex-1 font-medium">{b.name}{b.me && ` · ${d.you}`}</span>
              <span className="font-display font-bold">{b.score}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="text-center text-[11px] text-muted-foreground">{d.disclaimer}</p>
    </div>
  );
}

function TestView({ d, st, set, onFinish, onExit }: { d: D; st: TestState; set: (s: TestState) => void; onFinish: (s: TestState) => void; onExit: () => void }) {
  const p = st.puzzles[st.idx];
  const total = st.puzzles.length;
  const ok = st.selected === p.answerIndex;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const left = Math.max(0, p.timeLimit - Math.floor((now - st.qStartedAt) / 1000));
  useEffect(() => {
    if (!st.revealed && left === 0) {
      const answers = [...st.answers];
      answers[st.idx] = null;
      haptic(false);
      set({ ...st, selected: null, revealed: true, timedOut: true, answers });
    }
  }, [left, st.revealed]);

  function choose(i: number) {
    if (st.revealed) return;
    const answers = [...st.answers];
    answers[st.idx] = i;
    haptic(i === p.answerIndex);
    set({ ...st, selected: i, revealed: true, timedOut: false, answers });
  }
  function next() {
    if (st.idx + 1 >= total) return onFinish(st);
    set({ ...st, idx: st.idx + 1, selected: null, revealed: false, timedOut: false, qStartedAt: Date.now() });
  }

  return (
    <div key={p.id} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
      <div className="flex items-center justify-between text-sm">
        <button onClick={onExit} className="grid h-9 w-9 place-items-center rounded-full bg-surface" aria-label="back"><ArrowLeft className="h-4 w-4" /></button>
        <span className="font-display font-bold">{d.question} {st.idx + 1}/{total}</span>
        <span className={`flex items-center gap-1 ${left <= 10 && !st.revealed ? "text-destructive" : "text-muted-foreground"}`}><Clock className="h-4 w-4" />{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="progress-brand h-full rounded-full transition-all" style={{ width: `${((st.idx + (st.revealed ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <div className="rounded-3xl bg-surface p-3">
        <div className="grid grid-cols-3 gap-2">
          {p.grid.map((c, i) => (
            <div key={i} className={`tile aspect-square p-2 ${i === 8 ? (st.revealed ? "" : "tile-missing") : ""}`}>
              {i === 8 ? (
                st.revealed ? <PuzzleCell cell={c} /> : <div className="grid h-full place-items-center font-display text-4xl font-bold text-tile-ink">?</div>
              ) : (
                <PuzzleCell cell={c} />
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">{d.diff[p.difficulty - 1]} · {d.choose}</p>
      <div className="grid grid-cols-4 gap-2">
        {p.options.map((c, i) => {
          const state = !st.revealed ? "" : i === p.answerIndex ? "tile-correct" : i === st.selected ? "tile-wrong" : "opacity-50";
          return (
            <button key={i} onClick={() => choose(i)} disabled={st.revealed} aria-label={`option ${i + 1}`} className={`tile aspect-square p-1.5 transition active:scale-95 ${state}`}>
              <PuzzleCell cell={c} />
            </button>
          );
        })}
      </div>

      {st.revealed && (
        <div className={`rounded-2xl p-4 text-sm animate-in fade-in slide-in-from-bottom-2 ${ok ? "feedback-ok" : "feedback-bad"}`}>
          <p className="mb-1 flex items-center gap-2 font-bold">{ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{ok ? d.correct : st.timedOut ? d.timeUp : d.wrong}</p>
          <p className="text-foreground/80">{d.rules[p.rule]}</p>
        </div>
      )}
      {st.revealed && (
        <button onClick={next} className="btn-brand rounded-2xl py-4 font-bold">{st.idx + 1 >= total ? d.finish : d.next}</button>
      )}
    </div>
  );
}

function ResultView({ d, r, rival, onCert, onHome, onRetry }: { d: D; r: ResultRecord; rival?: number; onCert: () => void; onHome: () => void; onRetry: () => void }) {
  const pts = r.points ?? 0;
  const code = `${(r.seed ?? 0).toString(36)}.${pts}`;
  return (
    <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95">
      <section className="hero-card rounded-3xl p-6 text-center">
        <p className="text-sm text-muted-foreground">{d.estimate}</p>
        <p className="font-display text-gradient my-2 text-7xl font-black">{r.score}</p>
        <p className="font-semibold">{d.level[levelIndex(r.score)]}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-muted p-3"><p className="text-muted-foreground">{d.correctCount}</p><p className="font-display text-xl font-bold">{r.correct}/{r.total}</p><p className="text-xs text-muted-foreground">{d.points}: {pts}/{r.maxPoints ?? 0}</p></div>
          <div className="rounded-2xl bg-muted p-3"><p className="text-muted-foreground">{d.time}</p><p className="font-display text-xl font-bold">{Math.floor(r.seconds / 60)}:{String(r.seconds % 60).padStart(2, "0")}</p></div>
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground">{d.disclaimer}</p>
      </section>
      {rival !== undefined && (
        <section className="rounded-3xl bg-surface p-4 text-center">
          <p className="font-display text-xl font-bold">{pts > rival ? d.win : pts < rival ? d.lose : d.draw}</p>
          <p className="text-sm text-muted-foreground">{d.points}: {d.you} {pts} — {rival} {d.rival}</p>
        </section>
      )}
      <button onClick={onCert} className="btn-brand flex items-center justify-center gap-2 rounded-2xl py-4 font-bold"><Award className="h-5 w-5" />{d.certificate}</button>
      <button onClick={() => shareText(`Essence IQ battle: ${code}`, `${location.origin}/?battle=${code}`)} className="btn-outline-brand flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold"><Swords className="h-5 w-5" />{d.sendCode}</button>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onRetry} className="rounded-2xl bg-surface py-3 font-semibold">{d.retry}</button>
        <button onClick={onHome} className="rounded-2xl bg-surface py-3 font-semibold">{d.home}</button>
      </div>
    </div>
  );
}

function BattleView({ d, onCreate, onJoin, onBack }: { d: D; onCreate: () => void; onJoin: (c: string) => boolean; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <div className="flex flex-col gap-4 animate-in fade-in">
      <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full bg-surface" aria-label="back"><ArrowLeft className="h-4 w-4" /></button>
      <section className="hero-card rounded-3xl p-6 text-center">
        <Swords className="mx-auto h-10 w-10 text-magenta" />
        <h2 className="font-display mt-2 text-2xl font-bold">{d.battleTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{d.battleDesc}</p>
      </section>
      <button onClick={onCreate} className="btn-brand rounded-2xl py-4 font-bold">{d.create}</button>
      <div className="rounded-3xl bg-surface p-4">
        <p className="mb-2 text-sm text-muted-foreground">{d.enterCode}</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => { setCode(e.target.value); setBad(false); }} placeholder="abc123.15" className="flex-1 rounded-xl bg-muted px-3 py-3 font-mono outline-none" />
          <button onClick={() => code && !onJoin(code) && setBad(true)} className="btn-brand rounded-xl px-4 font-semibold">{d.join}</button>
        </div>
        {bad && <p className="mt-2 text-sm text-destructive">{d.badCode}</p>}
      </div>
    </div>
  );
}

function RestoreView({ d, onFound, onBack }: { d: D; onFound: (r: ResultRecord) => void; onBack: () => void }) {
  const [id, setId] = useState("");
  const [miss, setMiss] = useState(false);
  return (
    <div className="flex flex-col gap-4 animate-in fade-in">
      <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full bg-surface" aria-label="back"><ArrowLeft className="h-4 w-4" /></button>
      <section className="hero-card rounded-3xl p-6 text-center">
        <Award className="mx-auto h-10 w-10 text-magenta" />
        <h2 className="font-display mt-2 text-2xl font-bold">{d.restore}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{d.restoreDesc}</p>
      </section>
      <div className="flex gap-2">
        <input value={id} onChange={(e) => { setId(e.target.value); setMiss(false); }} placeholder="EIQ-XXXXXX" className="flex-1 rounded-xl bg-surface px-3 py-3 font-mono uppercase outline-none" />
        <button onClick={async () => { const r = await findCertificate(id); if (r) onFound(r); else setMiss(true); }} className="btn-brand rounded-xl px-5 font-semibold">{d.find}</button>
      </div>
      {miss && <p className="text-center text-sm text-destructive">{d.notFound}</p>}
    </div>
  );
}

function CertModal({ d, r, onClose }: { d: D; r: ResultRecord; onClose: () => void }) {
  const svg = certificateSvg(r, d);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4 animate-in fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-bold">{d.certificate}</h3>
          <button onClick={onClose} aria-label={d.close} className="grid h-8 w-8 place-items-center rounded-full bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-hidden rounded-2xl" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={() => downloadCertificate(svg, `${r.certId}.png`)} className="btn-brand flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold"><Download className="h-4 w-4" />{d.download}</button>
          <button onClick={() => shareText(`Essence IQ — ${d.estimate}: ${r.score} (${r.certId})`)} className="btn-outline-brand flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold"><Share2 className="h-4 w-4" />{d.share}</button>
        </div>
        {!tg() && <p className="mt-2 text-center text-[11px] text-muted-foreground">ID: {r.certId}</p>}
      </div>
    </div>
  );
}
