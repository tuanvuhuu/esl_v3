'use client';

// Điện thoại điều khiển màn chiếu (35.19): ba nút lớn, thấy trước đáp án của trang đang chiếu (chỉ giáo viên thấy).
// Bấm trên điện thoại thì máy chiếu đổi theo trong khoảng một giây (máy chiếu hỏi lại mỗi giây).
import { ChevronLeft, ChevronRight, Eye, EyeOff, Volume2 } from 'lucide-react';
import type { PresentSnapshot } from '@/app/(present)/trinh-chieu/actions';
import type { Slide } from '@/lib/presentation';
import { speakSlide } from './PresentStage';
import { usePresentSync } from './usePresentSync';

const REMOTE_BTN = 'flex min-h-20 items-center justify-center gap-2 rounded-3xl border-2 px-4 text-xl font-extrabold transition-transform active:scale-95 disabled:opacity-40';

export function PresentRemote({ token, title, slides, initial }: { token: string; title: string; slides: Slide[]; initial: PresentSnapshot }) {
  const { state, step, offline } = usePresentSync(token, initial, slides.length);
  const index = Math.min(state.slide, slides.length - 1);
  const s = slides[index];
  const answer = s.kind === 'quiz' ? s.options.filter((o) => o.correct).map((o) => o.label).join(', ') : s.answer;

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-4 p-4" data-slide={index} data-revealed={state.revealed}>
      <header className="flex flex-col gap-1">
        <small className="text-sm text-muted">Điều khiển trình chiếu</small>
        <h1 className="text-xl font-extrabold text-ink [overflow-wrap:anywhere]">{title}</h1>
        {offline && <span className="self-start rounded-full bg-blush px-2 py-0.5 text-xs font-bold text-blush-ink">Mất kết nối, đang thử lại</span>}
      </header>

      <div className="flex flex-col gap-2 rounded-[var(--radius-panel)] bg-surface p-4 shadow-card">
        <b className="text-sm text-muted" aria-label="Trang đang chiếu">
          Trang {index + 1}/{slides.length} · {state.revealed ? 'đang hiện đáp án' : 'chưa hiện đáp án'}
        </b>
        {s.prompt && <p className="text-lg font-bold text-ink [overflow-wrap:anywhere]">{s.prompt}</p>}
        {s.emoji && <span className="text-4xl" aria-hidden>{s.emoji}</span>}
        {answer && (
          <p className="text-base text-ink-2">
            Đáp án: <b className="text-ink">{answer}</b>
            {s.answerVi ? ` (${s.answerVi})` : ''}
          </p>
        )}
      </div>

      <button type="button" onClick={() => step({ op: state.revealed ? 'hide' : 'reveal' })} className={`${REMOTE_BTN} border-line bg-surface text-ink`}>
        {state.revealed ? <EyeOff className="size-6" aria-hidden /> : <Eye className="size-6" aria-hidden />}
        {state.revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
      </button>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => step({ op: 'prev' })} disabled={index === 0 && !state.revealed} className={`${REMOTE_BTN} border-line bg-surface text-ink`}>
          <ChevronLeft className="size-7" aria-hidden /> Trước
        </button>
        <button type="button" onClick={() => step({ op: 'next' })} disabled={index === slides.length - 1 && state.revealed} className={`${REMOTE_BTN} border-primary-deep bg-primary text-on-primary`}>
          Tiếp <ChevronRight className="size-7" aria-hidden />
        </button>
      </div>
      {(s.audioFileId || s.speakText) && (
        <button type="button" onClick={() => speakSlide(s)} className={`${REMOTE_BTN} min-h-14 border-line bg-surface text-base text-ink`}>
          <Volume2 className="size-5" aria-hidden /> Nghe trên điện thoại
        </button>
      )}
      <p className="text-sm text-muted">Máy chiếu đổi theo trong khoảng một giây. Âm thanh phát ở máy nào bấm Nghe.</p>
    </section>
  );
}
