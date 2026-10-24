'use client';

// Ôn từ hôm nay (35.18): mỗi từ đến hạn một câu, nhìn tranh chọn đúng từ trong 3 từ. Đúng là nhớ, sai là quên (ôn lại ngày mai).
// Không đọc từ trước khi chọn (đọc là lộ đáp án); chọn xong mới đọc và báo lần ôn tới.
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { reviewWordAction } from '@/app/(student)/cua-toi/game-actions';
import { gameStars, seeded, shuffle } from '@/lib/games';
import type { BoxWord } from '@/lib/queries/word-box';
import { BIG_BASE, Picture, say } from './shared';

export function ReviewSession({ due, others }: { due: BoxWord[]; others: BoxWord[] }) {
  // Chốt bộ câu lúc mở màn: mỗi lần ghi ôn, máy chủ làm mới dữ liệu (từ vừa ôn không còn đến hạn), không được đổi câu đang làm
  const [questions] = useState(() => {
    const rand = seeded(Date.now() % 100000);
    const pool = [...due, ...others];
    return shuffle(due, rand).map((target) => ({
      target,
      options: shuffle([target, ...shuffle(pool.filter((w) => w.key !== target.key), rand).slice(0, 2)], rand),
    }));
  });
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [nextLabel, setNextLabel] = useState('');
  const [done, setDone] = useState(false);
  const q = questions[i];

  function choose(key: string) {
    if (picked) return;
    setPicked(key);
    const ok = key === q.target.key;
    const s = score + (ok ? 1 : 0);
    setScore(s);
    say(q.target);
    void reviewWordAction({ word: q.target.word, correct: ok }).then((r) => setNextLabel(r.ok ? `Ôn lại từ này ${r.next}` : ''));
    setTimeout(() => {
      setPicked(null);
      setNextLabel('');
      if (i + 1 >= questions.length) setDone(true);
      else setI(i + 1);
    }, ok ? 1200 : 1800);
  }

  return (
    <section className="mx-auto flex w-full max-w-[480px] flex-col gap-4 py-2">
      <Link href="/cua-toi" className="inline-flex items-center gap-1 self-start text-sm font-bold text-ink underline underline-offset-4">
        <ArrowLeft className="size-4" aria-hidden /> Bài của tôi
      </Link>
      <h1 className="text-2xl font-extrabold text-ink">Ôn từ hôm nay</h1>

      {done ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center shadow-card" role="status" aria-label="Kết quả ôn">
          <span className="text-5xl" aria-label={`${gameStars(score, questions.length)} sao`}>{'⭐'.repeat(gameStars(score, questions.length))}</span>
          <b className="text-2xl font-extrabold text-ink">Con nhớ {score}/{questions.length} từ</b>
          <p className="text-base text-ink-2">Từ nhớ rồi sẽ hẹn ôn lại sau vài ngày, từ chưa nhớ thì ngày mai ôn tiếp. Hẹn con ngày mai nhé!</p>
          <Link href="/cua-toi" className={`${BIG_BASE} w-full border-primary-deep bg-primary text-on-primary`}>
            Về trang của con
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4" data-target={q.target.word}>
          <p className="text-sm text-ink-2">Từ {i + 1}/{questions.length} · Nhớ {score}</p>
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl bg-surface p-4 shadow-card">
            <Picture w={q.target} size="lg" />
            {(q.target.imageFileId || q.target.emoji) && q.target.meaningVi && <span className="text-base font-bold text-ink-2">{q.target.meaningVi}</span>}
          </div>
          <ul className="flex flex-col gap-2" aria-label="Chọn từ đúng">
            {q.options.map((o) => {
              const state = picked === null ? 'border-line bg-surface' : o.key === q.target.key ? 'border-[var(--accent)] bg-mint' : picked === o.key ? 'border-blush-ink bg-blush' : 'border-line bg-surface opacity-50';
              return (
                <li key={o.key}>
                  <button type="button" onClick={() => choose(o.key)} data-word={o.word} className={`flex min-h-14 w-full items-center justify-center rounded-2xl border-2 px-4 text-xl font-extrabold text-ink transition-transform active:scale-95 ${state}`}>
                    {o.word}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="min-h-6 text-center text-sm font-bold text-ink-2" aria-live="polite">{nextLabel}</p>
        </div>
      )}
    </section>
  );
}
