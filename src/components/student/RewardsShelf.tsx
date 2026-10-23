'use client';

// Bộ sưu tập (35.17): sticker và truyện ngắn mở khoá bằng sao. Hình chưa mở hiện khoá và số sao cần.
import { Lock, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Panel } from '@/components/ui/surfaces';
import { STORIES, stickerBook, type Story } from '@/lib/motivation';

function readAloud(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export function RewardsShelf({ totalStars }: { totalStars: number }) {
  const [story, setStory] = useState<Story | null>(null);
  const book = stickerBook(totalStars);
  const unlocked = book.filter((s) => s.unlocked).length;

  return (
    <>
      <Panel title="Bộ sưu tập sticker" action={<small className="text-sm text-muted">{unlocked}/{book.length}</small>}>
        <ul className="grid grid-cols-4 gap-2 min-[600px]:grid-cols-6 min-[1024px]:grid-cols-12" aria-label="Sticker">
          {book.map((s) => (
            <li
              key={s.emoji}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl ${s.unlocked ? 'bg-mint' : 'bg-stone'}`}
              aria-label={s.unlocked ? `Sticker ${s.name}` : `Sticker khoá, cần ${s.need} sao`}
            >
              {s.unlocked ? (
                <span className="text-3xl" aria-hidden>{s.emoji}</span>
              ) : (
                <>
                  <Lock className="size-5 text-muted" aria-hidden />
                  <small className="text-xs font-bold text-muted" aria-hidden>{s.need}⭐</small>
                </>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Truyện của con">
        <ul className="grid grid-cols-1 gap-2 min-[600px]:grid-cols-2" aria-label="Truyện">
          {STORIES.map((st) => {
            const open = totalStars >= st.need;
            return (
              <li key={st.slug}>
                <button
                  type="button"
                  onClick={() => setStory(st)}
                  disabled={!open}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-transform active:scale-95 ${open ? 'border-line bg-surface' : 'border-transparent bg-stone'}`}
                >
                  <span className="text-3xl" aria-hidden>{open ? st.emoji : '🔒'}</span>
                  <span className="min-w-0">
                    <b className={`block text-base font-extrabold ${open ? 'text-link underline underline-offset-2' : 'text-ink-2'}`}>{st.title}</b>
                    <small className="text-sm text-muted">{open ? 'Đã mở, bấm để đọc' : `Cần ${st.need} sao (còn ${st.need - totalStars})`}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Modal open={!!story} title={story ? `${story.emoji} ${story.title}` : ''} onClose={() => setStory(null)} labelledBy="story-title">
        {story && (
          <ol className="flex flex-col gap-4 pb-2">
            {story.lines.map((l, k) => (
              <li key={k} className="flex items-start gap-3">
                <button type="button" onClick={() => readAloud(l.en)} aria-label={`Nghe câu ${k + 1}`} className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface text-ink">
                  <Volume2 className="size-5" aria-hidden />
                </button>
                <span className="min-w-0">
                  <b className="block text-lg font-extrabold text-ink">{l.en}</b>
                  <small className="text-sm text-ink-2">{l.vi}</small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </>
  );
}
