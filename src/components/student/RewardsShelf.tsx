'use client';

// Bộ sưu tập (35.17): sticker và truyện ngắn mở khoá bằng sao. Hình chưa mở hiện khoá và số sao cần.
import {
  BookIcon,
  FlameIcon,
  GlobeIcon,
  HeartFillIcon,
  HomeFillIcon,
  LockIcon,
  RocketIcon,
  ShieldCheckIcon,
  SparkleFillIcon,
  SparklesFillIcon,
  StarFillIcon,
  SunIcon,
  TelescopeFillIcon,
  TrophyIcon,
  UnmuteIcon,
  ZapIcon,
  type Icon,
} from '@primer/octicons-react';
import { useLayoutEffect, useState } from 'react';
import { ActIcon } from '@/components/ui/ActIcon';
import { Modal } from '@/components/ui/Modal';
import { Panel } from '@/components/ui/surfaces';
import { STORIES, stickerBook, type Story } from '@/lib/motivation';

const STICKER_ICONS: Icon[] = [
  SparkleFillIcon,
  FlameIcon,
  HeartFillIcon,
  SunIcon,
  ZapIcon,
  SparklesFillIcon,
  RocketIcon,
  GlobeIcon,
  HomeFillIcon,
  ShieldCheckIcon,
  TelescopeFillIcon,
  TrophyIcon,
];

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

  useLayoutEffect(() => {
    if (!story) return;
    const el = document.getElementById('story-title');
    if (el) el.setAttribute('aria-label', `${story.emoji} ${story.title}`);
  }, [story]);

  return (
    <>
      <Panel
        title="Bộ sưu tập sticker"
        action={
          <span className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
            {unlocked}/{book.length}
          </span>
        }
      >
        <ul className="grid grid-cols-4 gap-2 min-[600px]:grid-cols-6 min-[1024px]:grid-cols-12" aria-label="Sticker">
          {book.map((s, idx) => {
            const StickerIcon = STICKER_ICONS[idx % STICKER_ICONS.length];
            return (
              <li
                key={s.name}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border p-1 text-center transition-colors ${
                  s.unlocked
                    ? 'border-[var(--borderColor-success-muted)] bg-mint text-mint-ink'
                    : 'border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]'
                }`}
                aria-label={s.unlocked ? `Sticker ${s.name}` : `Sticker khoá, cần ${s.need} sao`}
              >
                {s.unlocked ? (
                  <>
                    <StickerIcon size={22} aria-hidden />
                    <small className="max-w-full truncate text-[10px] font-medium leading-tight" aria-hidden>
                      {s.name}
                    </small>
                  </>
                ) : (
                  <>
                    <LockIcon size={16} className="text-[var(--fgColor-muted)]" aria-hidden />
                    <small className="inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums text-[var(--fgColor-muted)]" aria-hidden>
                      {s.need}
                      <StarFillIcon size={10} aria-hidden />
                    </small>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Truyện của con">
        <ul className="grid grid-cols-1 gap-2.5 min-[600px]:grid-cols-2" aria-label="Truyện">
          {STORIES.map((st) => {
            const open = totalStars >= st.need;
            return (
              <li key={st.slug}>
                <button
                  type="button"
                  data-card="true"
                  onClick={() => setStory(st)}
                  disabled={!open}
                  className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all active:scale-[0.99] ${
                    open
                      ? 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-xs'
                      : 'border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] disabled:cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                      open
                        ? 'border-[var(--primary)]/25 bg-[var(--primary-soft)] text-[var(--primary)]'
                        : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)]'
                    }`}
                  >
                    {open ? <BookIcon size={18} aria-hidden /> : <LockIcon size={18} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className={`block text-base font-semibold ${open ? 'text-[var(--fgColor-link)] underline underline-offset-2' : 'text-[var(--fgColor-muted)]'}`}>
                      {st.title}
                    </b>
                    <small className="mt-0.5 block text-xs tabular-nums text-[var(--fgColor-muted)]">
                      {open ? 'Đã mở, bấm để đọc' : `Cần ${st.need} sao (còn ${st.need - totalStars})`}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Modal
        open={!!story}
        size="md"
        title={story ? story.title : ''}
        subtitle="Bấm biểu tượng loa ở đầu mỗi câu để nghe phát âm tiếng Anh."
        onClose={() => setStory(null)}
        labelledBy="story-title"
      >
        {story && (
          <ol className="flex flex-col gap-2.5 pb-1">
            {story.lines.map((l, k) => (
              <li
                key={k}
                className="flex items-start gap-3 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3"
              >
                <ActIcon label={`Nghe câu ${k + 1}`} icon={UnmuteIcon} onClick={() => readAloud(l.en)} />
                <span className="min-w-0 flex-1">
                  <b className="block text-base font-semibold leading-snug text-[var(--fgColor-default)]">{l.en}</b>
                  <small className="mt-0.5 block text-sm text-[var(--fgColor-muted)]">{l.vi}</small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Modal>
    </>
  );
}
