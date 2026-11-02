'use client';

// Bộ sưu tập (35.17): sticker và truyện ngắn mở khoá bằng sao. Hình chưa mở hiện khoá và số sao cần.
import { LockIcon, UnmuteIcon } from '@primer/octicons-react';
import { useState } from 'react';
import { ActIcon } from '@/components/ui/ActIcon';
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
      <Panel title="Bộ sưu tập sticker" action={<small className="text-sm text-[var(--fgColor-muted)]">{unlocked}/{book.length}</small>}>
        <ul className="grid grid-cols-4 gap-2 min-[600px]:grid-cols-6 min-[1024px]:grid-cols-12" aria-label="Sticker">
          {book.map((s) => (
            <li
              key={s.emoji}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border ${
                s.unlocked ? 'border-[var(--borderColor-success-muted)] bg-mint' : 'border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]'
              }`}
              aria-label={s.unlocked ? `Sticker ${s.name}` : `Sticker khoá, cần ${s.need} sao`}
            >
              {s.unlocked ? (
                <span className="text-3xl" aria-hidden>{s.emoji}</span>
              ) : (
                <>
                  <LockIcon size={18} className="text-[var(--fgColor-muted)]" aria-hidden />
                  <small className="text-xs font-bold text-[var(--fgColor-muted)]" aria-hidden>{s.need}⭐</small>
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
                  data-card="true"
                  onClick={() => setStory(st)}
                  disabled={!open}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-95 ${
                    open
                      ? 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] hover:border-[var(--borderColor-accent-emphasis)]'
                      : 'border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] disabled:cursor-not-allowed'
                  }`}
                >
                  <span className="text-3xl" aria-hidden>{open ? st.emoji : '🔒'}</span>
                  <span className="min-w-0">
                    <b className={`block text-base font-extrabold ${open ? 'text-[var(--fgColor-link)] underline underline-offset-2' : 'text-[var(--fgColor-muted)]'}`}>
                      {st.title}
                    </b>
                    <small className="text-sm text-[var(--fgColor-muted)]">
                      {open ? 'Đã mở, bấm để đọc' : `Cần ${st.need} sao (còn ${st.need - totalStars})`}
                    </small>
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
                <ActIcon label={`Nghe câu ${k + 1}`} icon={UnmuteIcon} onClick={() => readAloud(l.en)} className="mt-0.5 !rounded-full" />
                <span className="min-w-0">
                  <b className="block text-lg font-extrabold text-[var(--fgColor-default)]">{l.en}</b>
                  <small className="text-sm text-[var(--fgColor-muted)]">{l.vi}</small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </>
  );
}
