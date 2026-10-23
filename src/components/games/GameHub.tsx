'use client';

// Trò chơi từ vựng (35.15, 35.16): chọn một trong tám trò từ một danh sách từ, chơi, xem sao cuối lượt.
// Thiết kế cho điện thoại trước (khung hẹp giữa màn, nút lớn). Âm thanh: tệp của từ nếu có, không thì giọng đọc có sẵn của máy.
import { ArrowLeft, Check, RotateCcw, Volume2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  GAME_LABELS,
  gameStars,
  letters,
  memoryDeck,
  playableGames,
  sameSequence,
  seeded,
  sentenceTiles,
  sentenceWords,
  shuffle,
  spellTiles,
  whackRounds,
  type GameKind,
  type GameWord,
  type MemoryCard,
} from '@/lib/games';
import { BingoGame, HangmanGame, RaceGame, SimonGame } from './MoreGames';
import { BIG, BIG_BASE, Picture, say, type GameProps } from './shared';

export function GameHub({ title, words, backHref, backLabel }: { title: string; words: GameWord[]; backHref: string; backLabel: string }) {
  const games = playableGames(words);
  const [game, setGame] = useState<GameKind | null>(null);
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [result, setResult] = useState<{ correct: number; total: number } | null>(null);

  const finish = (correct: number, total: number) => setResult({ correct, total });
  const replay = () => {
    setResult(null);
    setSeed((s) => s + 1);
  };

  return (
    <section className="mx-auto flex w-full max-w-[480px] flex-col gap-4 py-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        {game ? (
          <button type="button" onClick={() => { setGame(null); setResult(null); }} className="inline-flex items-center gap-1 font-bold text-ink underline underline-offset-4">
            <ArrowLeft className="size-4" aria-hidden /> Chọn trò khác
          </button>
        ) : (
          <Link href={backHref} className="inline-flex items-center gap-1 font-bold text-ink underline underline-offset-4">
            <ArrowLeft className="size-4" aria-hidden /> {backLabel}
          </Link>
        )}
        <span className="truncate text-muted">{title}</span>
      </div>

      {!game && (
        <>
          <h1 className="text-2xl font-extrabold text-ink">Chọn trò chơi</h1>
          {games.length === 0 && <p className="text-base text-ink-2">Danh sách cần ít nhất 2 từ để chơi.</p>}
          <ul className="grid grid-cols-2 gap-3">
            {games.map((g) => (
              <li key={g}>
                <button type="button" onClick={() => { setGame(g); setResult(null); }} className="flex h-full w-full flex-col items-start gap-1 rounded-2xl border-2 border-line bg-surface p-3 text-left transition-transform active:scale-95">
                  <span className="text-3xl" aria-hidden>{GAME_LABELS[g].emoji}</span>
                  <b className="text-lg font-extrabold text-ink">{GAME_LABELS[g].name}</b>
                  <small className="text-sm text-ink-2">{GAME_LABELS[g].hint}</small>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {game && result && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card" role="status" aria-label="Kết quả">
          <span className="text-5xl" aria-label={`${gameStars(result.correct, result.total)} sao`}>{'⭐'.repeat(gameStars(result.correct, result.total))}</span>
          <b className="text-2xl font-extrabold text-ink">{gameStars(result.correct, result.total) === 3 ? 'Giỏi quá!' : 'Cố lên nhé!'}</b>
          <p className="text-base text-ink-2">Đúng {result.correct}/{result.total}</p>
          <div className="grid w-full grid-cols-2 gap-2">
            <button type="button" onClick={replay} className={BIG}>
              <RotateCcw className="size-5" aria-hidden /> Chơi lại
            </button>
            <button type="button" onClick={() => { setGame(null); setResult(null); }} className={`${BIG_BASE} border-primary-deep bg-primary text-on-primary`}>
              Trò khác
            </button>
          </div>
        </div>
      )}

      {game && !result && (
        <div key={`${game}-${seed}`}>
          <h1 className="mb-3 text-xl font-extrabold text-ink">{GAME_LABELS[game].name}</h1>
          {game === 'memory' && <MemoryGame words={words} seed={seed} onFinish={finish} />}
          {game === 'whack' && <WhackGame words={words} seed={seed} onFinish={finish} />}
          {game === 'spell' && <SpellGame words={words} seed={seed} onFinish={finish} />}
          {game === 'sentence' && <SentenceGame words={words} seed={seed} onFinish={finish} />}
          {game === 'bingo' && <BingoGame words={words} seed={seed} onFinish={finish} />}
          {game === 'simon' && <SimonGame words={words} seed={seed} onFinish={finish} />}
          {game === 'hangman' && <HangmanGame words={words} seed={seed} onFinish={finish} />}
          {game === 'race' && <RaceGame words={words} seed={seed} onFinish={finish} />}
        </div>
      )}
    </section>
  );
}

// ---------- Lật thẻ nhớ ----------
function MemoryGame({ words, seed, onFinish }: GameProps) {
  const deck = useMemo(() => memoryDeck(words, seeded(seed)), [words, seed]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const pairs = deck.length / 2;

  function flip(card: MemoryCard) {
    if (open.length === 2 || open.includes(card.id) || matched.has(card.pair)) return;
    const next = [...open, card.id];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next.map((id) => deck[id]);
    if (a.pair === b.pair) {
      say(a.word);
      const done = new Set(matched).add(a.pair);
      setMatched(done);
      setOpen([]);
      if (done.size === pairs) setTimeout(() => onFinish(pairs, moves + 1), 500);
    } else {
      setTimeout(() => setOpen([]), 900);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">Đã ghép {matched.size}/{pairs} cặp · {moves} lượt lật</p>
      <ul className="grid grid-cols-4 gap-2" aria-label="Các thẻ">
        {deck.map((c) => {
          const shown = open.includes(c.id) || matched.has(c.pair);
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => flip(c)}
                data-pair={c.pair}
                aria-label={shown ? (c.face === 'word' ? c.word.word : `Tranh ${c.word.meaningVi || c.word.word}`) : `Thẻ úp ${c.id + 1}`}
                className={`flex aspect-square w-full items-center justify-center rounded-2xl border-2 p-1 text-lg font-extrabold transition-transform active:scale-95 ${
                  matched.has(c.pair) ? 'border-[var(--accent)] bg-mint' : shown ? 'border-line bg-surface' : 'border-primary-deep bg-primary text-on-primary'
                }`}
              >
                {shown ? c.face === 'word' ? <span className="break-all text-ink">{c.word.word}</span> : <Picture w={c.word} /> : <span className="text-3xl" aria-hidden>?</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Đập chuột: nghe từ rồi chạm đúng tranh ----------
function WhackGame({ words, seed, onFinish }: GameProps) {
  const rounds = useMemo(() => whackRounds(words, seeded(seed)), [words, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const round = rounds[i];

  useEffect(() => {
    if (round) say(round.target);
  }, [round]);

  function choose(w: GameWord) {
    if (picked) return;
    setPicked(w.word);
    const ok = w.word === round.target.word;
    const nextScore = score + (ok ? 1 : 0);
    setScore(nextScore);
    setTimeout(() => {
      setPicked(null);
      if (i + 1 >= rounds.length) onFinish(nextScore, rounds.length);
      else setI(i + 1);
    }, ok ? 500 : 1000);
  }

  return (
    <div className="flex flex-col items-center gap-4" data-target={round.target.word}>
      <p className="self-start text-sm text-ink-2">Lượt {i + 1}/{rounds.length} · Đúng {score}</p>
      <button type="button" onClick={() => say(round.target)} className={`${BIG} w-full`}>
        <Volume2 className="size-6" aria-hidden /> Nghe lại từ
      </button>
      <ul className="grid w-full grid-cols-2 gap-3" aria-label="Chạm đúng tranh">
        {round.choices.map((c) => {
          const state = picked === null ? '' : c.word === round.target.word ? 'border-[var(--accent)] bg-mint' : picked === c.word ? 'border-blush-ink bg-blush' : 'opacity-50';
          return (
            <li key={c.word}>
              <button type="button" onClick={() => choose(c)} data-word={c.word} aria-label={`Tranh ${c.meaningVi || c.word}`} className={`flex aspect-square w-full items-center justify-center rounded-full border-4 border-line bg-surface shadow-card transition-transform active:scale-90 ${state}`}>
                <Picture w={c} size="lg" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Xếp ô (dùng chung cho ghép chữ và xây câu) ----------
function ArrangeRound({
  prompt,
  tiles,
  target,
  joiner,
  label,
  onDone,
}: {
  prompt: React.ReactNode;
  tiles: string[];
  target: string[];
  joiner: string;
  label: string;
  onDone: (ok: boolean) => void;
}) {
  const [used, setUsed] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);
  const answer = used.map((k) => tiles[k]);

  function tap(k: number) {
    if (used.includes(k) || wrong) return;
    const next = [...used, k];
    setUsed(next);
    if (next.length === target.length) {
      const ok = sameSequence(next.map((x) => tiles[x]), target);
      if (ok) setTimeout(() => onDone(true), 400);
      else {
        setWrong(true);
        setTimeout(() => {
          setWrong(false);
          setUsed([]);
          onDone(false);
        }, 1200);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4" data-target={target.join(joiner)}>
      {prompt}
      <div className={`flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-3 ${wrong ? 'border-blush-ink bg-blush' : 'border-line bg-surface'}`} aria-label={label} aria-live="polite">
        {answer.length === 0 ? <span className="text-sm text-muted">Chạm các ô bên dưới theo đúng thứ tự</span> : answer.map((t, i) => <span key={i} className="rounded-xl bg-primary px-3 py-2 text-xl font-extrabold text-on-primary">{t}</span>)}
        {wrong && <span className="w-full text-sm font-bold text-blush-ink">Chưa đúng, thử từ tiếp theo nhé. Đáp án: {target.join(joiner)}</span>}
      </div>
      <ul className="flex flex-wrap justify-center gap-2" aria-label="Các ô để xếp">
        {tiles.map((t, k) => (
          <li key={k}>
            <button type="button" onClick={() => tap(k)} disabled={used.includes(k)} data-tile={t} className="min-h-14 min-w-14 rounded-2xl border-2 border-line bg-surface px-3 text-2xl font-extrabold text-ink shadow-card transition-transform active:scale-90 disabled:invisible">
              {t}
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setUsed((u) => u.slice(0, -1))} disabled={used.length === 0 || wrong} className={BIG}>
          <X className="size-5" aria-hidden /> Xoá ô cuối
        </button>
        <span className="flex items-center justify-center gap-1 text-sm text-muted">
          <Check className="size-4" aria-hidden /> Tự kiểm khi đủ ô
        </span>
      </div>
    </div>
  );
}

// ---------- Ghép chữ ----------
function SpellGame({ words, seed, onFinish }: GameProps) {
  const list = useMemo(() => shuffle(words.filter((w) => letters(w.word).length >= 2), seeded(seed)).slice(0, 5), [words, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const w = list[i];
  const tiles = useMemo(() => spellTiles(w.word, seeded(seed + i)), [w, seed, i]);

  function done(ok: boolean) {
    const s = score + (ok ? 1 : 0);
    setScore(s);
    if (ok) say(w);
    if (i + 1 >= list.length) onFinish(s, list.length);
    else setI(i + 1);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-2">Từ {i + 1}/{list.length} · Đúng {score}</p>
      <ArrangeRound
        key={i}
        tiles={tiles}
        target={letters(w.word)}
        joiner=""
        label="Từ đang ghép"
        onDone={done}
        prompt={
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            <Picture w={w} size="lg" />
            <div className="flex flex-col gap-1">
              {w.meaningVi && <b className="text-lg font-extrabold text-ink">{w.meaningVi}</b>}
              <button type="button" onClick={() => say(w)} className="inline-flex items-center gap-1 text-sm font-bold text-link underline underline-offset-2">
                <Volume2 className="size-4" aria-hidden /> Nghe từ
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}

// ---------- Xây câu ----------
function SentenceGame({ words, seed, onFinish }: GameProps) {
  const list = useMemo(() => shuffle(words.filter((w) => sentenceWords(w.sentence).length >= 3), seeded(seed)).slice(0, 5), [words, seed]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const w = list[i];
  const tiles = useMemo(() => sentenceTiles(w.sentence, seeded(seed + i)), [w, seed, i]);

  function done(ok: boolean) {
    const s = score + (ok ? 1 : 0);
    setScore(s);
    if (i + 1 >= list.length) onFinish(s, list.length);
    else setI(i + 1);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-2">Câu {i + 1}/{list.length} · Đúng {score}</p>
      <ArrangeRound
        key={i}
        tiles={tiles}
        target={sentenceWords(w.sentence)}
        joiner=" "
        label="Câu đang xếp"
        onDone={done}
        prompt={
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3">
            <Picture w={w} />
            <span className="text-base text-ink-2">Xếp câu có từ <b className="text-ink">{w.word}</b></span>
          </div>
        }
      />
    </div>
  );
}
