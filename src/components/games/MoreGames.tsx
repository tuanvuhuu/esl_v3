'use client';

// Bốn trò chơi tiếp theo (35.16): bingo nghe, Simon nói, đoán chữ, đua xe trả lời nhanh. Không trừ điểm khi sai, chỉ tính đúng.
import { Volume2 } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  bingoBoard,
  bingoLine,
  guessable,
  HANGMAN_LIVES,
  hangmanState,
  maskWord,
  RACE_SECONDS,
  raceQuestions,
  seeded,
  shuffle,
  simonGame,
  type GameWord,
} from '@/lib/games';
import { BIG, Picture, say, type GameProps } from './shared';

const TILE = 'flex aspect-square w-full items-center justify-center rounded-2xl border-4 bg-surface shadow-card transition-transform active:scale-90';

// ---------- Bingo nghe: nghe từ, chạm đúng ô trên bảng; đủ một hàng là thắng ----------
export function BingoGame({ words, seed, onFinish }: GameProps) {
  const board = useMemo(() => bingoBoard(words, seeded(seed)), [words, seed]);
  const [call, setCall] = useState(0);
  const [marked, setMarked] = useState<boolean[]>(() => board.cells.map(() => false));
  const [taps, setTaps] = useState(0);
  const [miss, setMiss] = useState<number | null>(null);
  const current = board.calls[call];

  useEffect(() => {
    if (current) say(current);
  }, [current]);

  function tap(k: number) {
    if (marked[k] || !current) return;
    const nextTaps = taps + 1;
    setTaps(nextTaps);
    if (board.cells[k].word !== current.word) {
      setMiss(k);
      setTimeout(() => setMiss(null), 600);
      return;
    }
    const next = marked.map((m, i) => (i === k ? true : m));
    setMarked(next);
    const hits = call + 1;
    if (bingoLine(next, board.size)) setTimeout(() => onFinish(hits, nextTaps), 700);
    else setCall(hits);
  }

  return (
    <div className="flex flex-col gap-4" data-target={current?.word}>
      <p className="text-sm text-ink-2">Đã đánh dấu {marked.filter(Boolean).length} ô · đủ một hàng ngang, dọc hoặc chéo là BINGO</p>
      <button type="button" onClick={() => current && say(current)} className={`${BIG} w-full`}>
        <Volume2 className="size-6" aria-hidden /> Nghe lại từ
      </button>
      <ul className={`grid gap-2 ${board.size === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} aria-label="Bảng bingo">
        {board.cells.map((c, k) => (
          <li key={c.word}>
            <button
              type="button"
              onClick={() => tap(k)}
              data-word={c.word}
              aria-pressed={marked[k]}
              aria-label={`Tranh ${c.meaningVi || c.word}`}
              className={`${TILE} relative ${marked[k] ? 'border-[var(--accent)] bg-mint' : miss === k ? 'border-blush-ink bg-blush' : 'border-line'}`}
            >
              <Picture w={c} size={board.size === 2 ? 'lg' : 'md'} />
              {marked[k] && <span className="absolute right-1 top-1 text-xl" aria-hidden>✅</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Simon nói: nghe chuỗi từ (tranh sáng lần lượt), rồi chạm lại đúng thứ tự ----------
const SIMON_STEP_MS = 1100;

export function SimonGame({ words, seed, onFinish }: GameProps) {
  const game = useMemo(() => simonGame(words, seeded(seed)), [words, seed]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [wrong, setWrong] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seq = game.sequences[round];

  // Phát chuỗi: mỗi từ sáng tranh và đọc lên, xong thì cho chạm
  function play(list: GameWord[]) {
    timers.current.forEach(clearTimeout);
    timers.current = list.map((w, k) =>
      setTimeout(() => {
        setLit(w.word);
        say(w);
      }, 400 + k * SIMON_STEP_MS),
    );
    timers.current.push(
      setTimeout(() => {
        setLit(null);
        setBusy(false);
      }, 400 + list.length * SIMON_STEP_MS),
    );
  }

  useEffect(() => {
    play(seq);
    const pending = timers;
    return () => pending.current.forEach(clearTimeout);
  }, [seq]);

  function next(nextScore: number) {
    if (round + 1 >= game.sequences.length) onFinish(nextScore, game.sequences.length);
    else {
      setStep(0);
      setBusy(true);
      setRound(round + 1);
    }
  }

  function tap(w: GameWord) {
    if (busy || wrong) return;
    if (w.word === seq[step].word) {
      say(w);
      if (step + 1 < seq.length) {
        setStep(step + 1);
        return;
      }
      const s = score + 1;
      setScore(s);
      setBusy(true);
      setTimeout(() => next(s), 700);
      return;
    }
    setWrong(true);
    setTimeout(() => {
      setWrong(false);
      next(score);
    }, 1500);
  }

  function replay() {
    setStep(0);
    setBusy(true);
    play(seq);
  }

  return (
    <div className="flex flex-col gap-4" data-target={seq.map((w) => w.word).join('|')}>
      <p className="text-sm text-ink-2">Lượt {round + 1}/{game.sequences.length} · {seq.length} từ · Đúng {score}</p>
      <p className="rounded-2xl bg-surface p-3 text-base font-bold text-ink" aria-live="polite">
        {wrong ? `Chưa đúng. Thứ tự là: ${seq.map((w) => w.word).join(', ')}` : busy ? 'Nghe và nhìn tranh sáng lên…' : `Chạm lại ${seq.length} tranh theo đúng thứ tự (đã chạm ${step})`}
      </p>
      <ul className="grid grid-cols-2 gap-3" aria-label="Các tranh">
        {game.choices.map((c) => (
          <li key={c.word}>
            <button
              type="button"
              onClick={() => tap(c)}
              disabled={busy || wrong}
              data-word={c.word}
              aria-label={`Tranh ${c.meaningVi || c.word}`}
              className={`${TILE} ${lit === c.word ? 'scale-105 border-primary-deep bg-primary' : 'border-line'} disabled:cursor-default`}
            >
              <Picture w={c} size="lg" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={replay} disabled={busy || wrong} className={`${BIG} w-full`}>
        <Volume2 className="size-6" aria-hidden /> Nghe lại chuỗi
      </button>
    </div>
  );
}

// ---------- Đoán chữ: đoán từng chữ cái, mỗi lần sai nổ một bóng bay ----------
const KEYS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export function HangmanGame({ words, seed, onFinish }: GameProps) {
  const list = useMemo(() => shuffle(words.filter((w) => guessable(w.word).length >= 3), seeded(seed)).slice(0, 3), [words, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const w = list[i];
  const state = hangmanState(w.word, guessed);
  const need = guessable(w.word);

  function guess(ch: string) {
    if (guessed.has(ch) || state.solved || state.lost) return;
    const g = new Set(guessed).add(ch);
    setGuessed(g);
    const s = hangmanState(w.word, g);
    if (!s.solved && !s.lost) return;
    if (s.solved) say(w);
    const sc = score + (s.solved ? 1 : 0);
    setScore(sc);
    setTimeout(() => {
      if (i + 1 >= list.length) onFinish(sc, list.length);
      else {
        setI(i + 1);
        setGuessed(new Set());
      }
    }, s.solved ? 900 : 2000);
  }

  return (
    <div className="flex flex-col gap-4" data-target={w.word}>
      <p className="text-sm text-ink-2">Từ {i + 1}/{list.length} · Đúng {score}</p>
      <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
        <Picture w={w} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          {w.meaningVi && <b className="text-lg font-extrabold text-ink">{w.meaningVi}</b>}
          <span className="text-2xl tracking-tight" aria-label={`Còn ${HANGMAN_LIVES - state.wrong} bóng bay`}>
            {Array.from({ length: HANGMAN_LIVES }, (_, k) => (k < HANGMAN_LIVES - state.wrong ? '🎈' : '💥')).join('')}
          </span>
        </div>
      </div>
      <p className="flex flex-wrap justify-center gap-1.5" aria-label="Từ đang đoán" aria-live="polite">
        {(state.lost ? [...w.word] : maskWord(w.word, guessed)).map((ch, k) => (
          <span key={k} className={`flex h-12 min-w-9 items-center justify-center rounded-xl text-2xl font-extrabold uppercase ${ch === '_' ? 'border-b-4 border-ink-2 text-transparent' : state.lost ? 'bg-blush text-blush-ink' : 'bg-mint text-ink'}`}>
            {ch === '_' ? '·' : ch}
          </span>
        ))}
      </p>
      {state.lost && <p className="text-center text-base font-bold text-blush-ink">Hết bóng bay rồi. Từ đúng là “{w.word}”.</p>}
      <ul className="grid grid-cols-7 gap-1.5" aria-label="Bàn phím chữ cái">
        {KEYS.map((ch) => {
          const used = guessed.has(ch);
          const hit = used && need.includes(ch);
          return (
            <li key={ch}>
              <button
                type="button"
                onClick={() => guess(ch)}
                disabled={used || state.solved || state.lost}
                data-key={ch}
                className={`flex h-11 w-full items-center justify-center rounded-xl border-2 text-lg font-extrabold uppercase transition-transform active:scale-90 ${
                  hit ? 'border-[var(--accent)] bg-mint text-ink' : used ? 'border-line bg-stone text-muted' : 'border-line bg-surface text-ink'
                }`}
              >
                {ch}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Đua xe: nhìn tranh chọn đúng từ trong 8 giây, đúng thì xe tiến lên ----------
export function RaceGame({ words, seed, onFinish }: GameProps) {
  const qs = useMemo(() => raceQuestions(words, seeded(seed)), [words, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(RACE_SECONDS);
  const [picked, setPicked] = useState<string | null>(null);
  const answered = useRef(false);
  const q = qs[i];

  function answer(word: string | null) {
    if (answered.current) return;
    answered.current = true;
    setPicked(word ?? '');
    const ok = word === q.target.word;
    const s = score + (ok ? 1 : 0);
    setScore(s);
    if (ok) say(q.target);
    setTimeout(() => {
      setPicked(null);
      if (i + 1 >= qs.length) onFinish(s, qs.length);
      else {
        answered.current = false;
        setLeft(RACE_SECONDS);
        setI(i + 1);
      }
    }, ok ? 500 : 1100);
  }

  const timeUp = useEffectEvent(() => answer(null));
  useEffect(() => {
    const t = setTimeout(timeUp, RACE_SECONDS * 1000);
    const tick = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(tick);
    };
  }, [i]);

  const progress = score / qs.length;
  return (
    <div className="flex flex-col gap-4" data-target={q.target.word}>
      <p className="text-sm text-ink-2">Câu {i + 1}/{qs.length} · Đúng {score}</p>
      <div className="relative h-14 overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface" aria-label={`Xe đã đi ${score}/${qs.length} chặng`}>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-3xl" aria-hidden>🏁</span>
        <span className="absolute top-1/2 -translate-y-1/2 text-4xl transition-[left] duration-500" style={{ left: `calc(${progress} * (100% - 5.5rem) + 0.25rem)` }} aria-hidden>
          🏎️
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone" aria-label={`Còn ${left} giây`}>
        <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${left <= 3 ? 'bg-blush-ink' : 'bg-primary'}`} style={{ width: `${(left / RACE_SECONDS) * 100}%` }} />
      </div>
      <div className="flex justify-center rounded-2xl bg-surface p-4">
        <Picture w={q.target} size="lg" />
      </div>
      <ul className="flex flex-col gap-2" aria-label="Chọn từ đúng">
        {q.options.map((o) => {
          const state = picked === null ? 'border-line bg-surface' : o.word === q.target.word ? 'border-[var(--accent)] bg-mint' : picked === o.word ? 'border-blush-ink bg-blush' : 'border-line bg-surface opacity-50';
          return (
            <li key={o.word}>
              <button type="button" onClick={() => answer(o.word)} data-word={o.word} className={`flex min-h-14 w-full items-center justify-center rounded-2xl border-2 px-4 text-xl font-extrabold text-ink transition-transform active:scale-95 ${state}`}>
                {o.word}
              </button>
            </li>
          );
        })}
      </ul>
      {picked === '' && <p className="text-center text-base font-bold text-blush-ink">Hết giờ! Từ đúng là “{q.target.word}”.</p>}
    </div>
  );
}
