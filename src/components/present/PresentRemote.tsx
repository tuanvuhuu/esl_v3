'use client';

// Điện thoại điều khiển màn chiếu (35.19): ba nút lớn, thấy trước đáp án của trang đang chiếu (chỉ giáo viên thấy).
// Bấm trên điện thoại thì máy chiếu đổi theo trong khoảng một giây (máy chiếu hỏi lại mỗi giây).
import { ChevronLeftIcon, ChevronRightIcon, EyeClosedIcon, EyeIcon, UnmuteIcon } from '@primer/octicons-react';
import type { PresentSnapshot } from '@/app/(present)/trinh-chieu/actions';
import { Pill } from '@/components/ui/primitives';
import { Card } from '@/components/ui/surfaces';
import type { Slide } from '@/lib/presentation';
import { speakSlide } from './PresentStage';
import { usePresentSync } from './usePresentSync';

const REMOTE_BTN =
  'flex min-h-20 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-xl font-extrabold transition-all active:scale-95 disabled:opacity-40';

export function PresentRemote({
  token,
  title,
  slides,
  initial,
}: {
  token: string;
  title: string;
  slides: Slide[];
  initial: PresentSnapshot;
}) {
  const { state, step, offline } = usePresentSync(token, initial, slides.length);
  const index = Math.min(state.slide, slides.length - 1);
  const s = slides[index];
  const answer = s.kind === 'quiz' ? s.options.filter((o) => o.correct).map((o) => o.label).join(', ') : s.answer;

  return (
    <section
      className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 p-4"
      data-slide={index}
      data-revealed={state.revealed}
    >
      <header className="flex flex-col gap-1">
        <small className="text-sm text-[var(--fgColor-muted)]">Điều khiển trình chiếu</small>
        <h1 className="text-xl font-extrabold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{title}</h1>
        {offline && (
          <div className="self-start">
            <Pill tone="blush">Mất kết nối, đang thử lại</Pill>
          </div>
        )}
      </header>

      <Card className="gap-2">
        <b className="text-sm text-[var(--fgColor-muted)]" aria-label="Trang đang chiếu">
          Trang {index + 1}/{slides.length} · {state.revealed ? 'đang hiện đáp án' : 'chưa hiện đáp án'}
        </b>
        {s.prompt && <p className="text-lg font-bold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{s.prompt}</p>}
        {s.emoji && <span className="text-4xl" aria-hidden>{s.emoji}</span>}
        {answer && (
          <p className="text-base text-[var(--fgColor-muted)]">
            Đáp án: <b className="text-[var(--fgColor-default)]">{answer}</b>
            {s.answerVi ? ` (${s.answerVi})` : ''}
          </p>
        )}
      </Card>

      <button
        type="button"
        data-card="true"
        onClick={() => step({ op: state.revealed ? 'hide' : 'reveal' })}
        className={`${REMOTE_BTN} border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]`}
      >
        {state.revealed ? <EyeClosedIcon size={24} aria-hidden /> : <EyeIcon size={24} aria-hidden />}
        {state.revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          data-card="true"
          onClick={() => step({ op: 'prev' })}
          disabled={index === 0 && !state.revealed}
          className={`${REMOTE_BTN} border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]`}
        >
          <ChevronLeftIcon size={26} aria-hidden /> Trước
        </button>
        <button
          type="button"
          data-card="true"
          onClick={() => step({ op: 'next' })}
          disabled={index === slides.length - 1 && state.revealed}
          className={`${REMOTE_BTN} border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)] hover:bg-[var(--button-primary-bgColor-hover)]`}
        >
          Tiếp <ChevronRightIcon size={26} aria-hidden />
        </button>
      </div>
      {(s.audioFileId || s.speakText) && (
        <button
          type="button"
          data-card="true"
          onClick={() => speakSlide(s)}
          className={`${REMOTE_BTN} min-h-14 border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-base text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]`}
        >
          <UnmuteIcon size={20} aria-hidden /> Nghe trên điện thoại
        </button>
      )}
      <p className="text-sm text-[var(--fgColor-muted)]">Máy chiếu đổi theo trong khoảng một giây. Âm thanh phát ở máy nào bấm Nghe.</p>
    </section>
  );
}
