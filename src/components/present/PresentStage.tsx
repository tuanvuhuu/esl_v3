'use client';

// Màn chiếu cho cả lớp (35.19): chữ và tranh thật to, điều khiển bằng bàn phím, bút trình chiếu (PageUp/PageDown),
// chuột, hoặc điện thoại quét mã QR. Trang chưa hiện đáp án thì bấm Tiếp là hiện đáp án, bấm nữa mới sang trang.
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DeviceMobileIcon,
  EyeClosedIcon,
  EyeIcon,
  ScreenFullIcon,
  UnmuteIcon,
  XIcon,
} from '@primer/octicons-react';
import Link from 'next/link';
import { useEffect, useEffectEvent, useState } from 'react';
import { setPresentModeAction, type PresentSnapshot } from '@/app/(present)/trinh-chieu/actions';
import { QrImage } from '@/components/tuition/QrImage';
import { Btn } from '@/components/ui/Btn';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { Pill } from '@/components/ui/primitives';
import { PRESENT_MODES, type PresentMode, type Slide } from '@/lib/presentation';
import { usePresentSync } from './usePresentSync';

const STAGE_BTN =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 px-5 text-stage-sm font-extrabold transition-all active:scale-95 disabled:opacity-40';

export function speakSlide(s: Slide) {
  if (s.audioFileId) {
    void new Audio(`/api/files/${s.audioFileId}`).play().catch(() => undefined);
    return;
  }
  if (!s.speakText || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(s.speakText);
  u.lang = 'en-US';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function StagePicture({ s }: { s: Slide }) {
  if (s.imageFileId) {
    // eslint-disable-next-line @next/next/no-img-element -- ảnh do giáo viên tải lên, phục vụ qua /api/files
    return <img src={`/api/files/${s.imageFileId}`} alt="Tranh của câu" className="max-h-[42dvh] max-w-full rounded-3xl object-contain" />;
  }
  if (s.emoji) return <span className="text-stage-xl leading-none" aria-label="Tranh">{s.emoji}</span>;
  return null;
}

export function PresentStage({
  token,
  title,
  slides,
  initial,
  backHref,
  canSwitchMode,
}: {
  token: string;
  title: string;
  slides: Slide[];
  initial: PresentSnapshot;
  backHref: string;
  canSwitchMode: boolean;
}) {
  const { state, step, offline, accept } = usePresentSync(token, initial, slides.length);
  const [showQr, setShowQr] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const index = Math.min(state.slide, slides.length - 1);
  const s = slides[index];

  useEffect(() => {
    // Đường dẫn tuyệt đối cho mã QR chỉ biết được trên trình duyệt
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc window.location một lần sau khi gắn vào trang
    setRemoteUrl(`${window.location.origin}/trinh-chieu/${token}/dieu-khien`);
  }, [token]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') step({ op: 'next' });
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') step({ op: 'prev' });
    else if (k === 'ArrowDown' || k === 'r' || k === 'R') step({ op: state.revealed ? 'hide' : 'reveal' });
    else if (k === 'Home') step({ op: 'goto', to: 0 });
    else if (k === 'End') step({ op: 'goto', to: slides.length - 1 });
    else if (k === 's' || k === 'S') speakSlide(s);
    else if (k === 'f' || k === 'F') void document.documentElement.requestFullscreen?.().catch(() => undefined);
    else return;
    e.preventDefault();
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  async function switchMode(mode: PresentMode) {
    const r = await setPresentModeAction(token, mode);
    if (r.ok) accept(r.state);
  }

  return (
    <div
      className="flex h-dvh flex-col bg-[var(--bgColor-inset,var(--bgColor-default))] text-[var(--fgColor-default)]"
      data-slide={index}
      data-revealed={state.revealed}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] px-4 py-2 text-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={backHref}
            data-link="true"
            className="inline-flex items-center gap-1 font-bold text-[var(--fgColor-default)] underline underline-offset-4 hover:text-[var(--fgColor-link)]"
          >
            <XIcon size={16} aria-hidden /> Thoát
          </Link>
          <b className="truncate text-[var(--fgColor-default)]">{title}</b>
          {offline && <Pill tone="blush">Mất kết nối, đang thử lại</Pill>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canSwitchMode && (
            <ChipGroup label="Kiểu chiếu">
              {(Object.keys(PRESENT_MODES) as PresentMode[]).map((m) => (
                <Chip key={m} selected={state.mode === m} onClick={() => void switchMode(m)}>
                  {PRESENT_MODES[m]}
                </Chip>
              ))}
            </ChipGroup>
          )}
          <Btn onClick={() => setShowQr((v) => !v)} aria-expanded={showQr} leadingVisual={DeviceMobileIcon}>
            Điều khiển bằng điện thoại
          </Btn>
          <Btn onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)} leadingVisual={ScreenFullIcon}>
            Toàn màn hình
          </Btn>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-[2.5vh] overflow-hidden px-[4vw] text-center">
        <p className="text-stage-sm font-bold text-[var(--fgColor-muted)]" aria-label="Số trang">
          {index + 1} / {slides.length}
        </p>
        {s.prompt && <h1 className="max-w-[90vw] text-stage font-extrabold leading-tight [overflow-wrap:anywhere]">{s.prompt}</h1>}
        {s.promptVi && <p className="text-stage-sm text-[var(--fgColor-muted)]">{s.promptVi}</p>}
        {s.passage && <p className="max-w-[80vw] whitespace-pre-line text-stage-sm text-[var(--fgColor-muted)]">{s.passage}</p>}
        <StagePicture s={s} />

        {s.options.length > 0 && (
          <ul
            className="grid w-full max-w-[1400px] gap-[1.5vw]"
            style={{ gridTemplateColumns: `repeat(${Math.min(s.options.length, 4)}, minmax(0, 1fr))` }}
            aria-label="Các đáp án"
          >
            {s.options.map((o, k) => (
              <li
                key={k}
                data-correct={o.correct}
                className={`flex min-h-[12dvh] flex-col items-center justify-center gap-2 rounded-3xl border-4 p-[1vw] text-stage font-extrabold [overflow-wrap:anywhere] ${
                  state.revealed
                    ? o.correct
                      ? 'border-[var(--bgColor-success-emphasis)] bg-mint text-mint-ink'
                      : 'border-[var(--borderColor-default)] opacity-40'
                    : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)]'
                }`}
              >
                {o.imageFileId && (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh đáp án do giáo viên tải lên
                  <img src={`/api/files/${o.imageFileId}`} alt={o.label || `Đáp án ${k + 1}`} className="max-h-[18dvh] rounded-2xl object-contain" />
                )}
                {o.label}
              </li>
            ))}
          </ul>
        )}

        <div className="min-h-[14dvh]" aria-live="polite" aria-label="Đáp án">
          {state.revealed && (s.answer || s.answerVi) && s.kind !== 'quiz' && (
            <>
              {s.answer && <p className="text-stage font-extrabold text-[var(--fgColor-default)]">{s.answer}</p>}
              {s.answerVi && <p className="text-stage-sm text-[var(--fgColor-muted)]">{s.answerVi}</p>}
            </>
          )}
          {state.revealed && s.kind === 'quiz' && s.answerVi && <p className="text-stage-sm text-[var(--fgColor-muted)]">{s.answerVi}</p>}
        </div>

        {showQr && remoteUrl && (
          <div
            className="absolute top-4 right-4 flex flex-col items-center gap-2 rounded-2xl border border-[var(--borderColor-default)] bg-[var(--overlay-bgColor)] p-4 shadow-[var(--shadow-floating-large,0_12px_28px_rgba(0,0,0,0.2))]"
            role="dialog"
            aria-label="Mã điều khiển"
          >
            <QrImage payload={remoteUrl} size={200} label="Mã QR mở trang điều khiển trên điện thoại" />
            <small className="max-w-[220px] text-sm text-[var(--fgColor-muted)]">Quét bằng điện thoại đã đăng nhập cùng tài khoản này</small>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-center gap-3 px-4 pb-4">
        <button
          type="button"
          data-card="true"
          onClick={() => step({ op: 'prev' })}
          disabled={index === 0 && !state.revealed}
          className={`${STAGE_BTN} border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]`}
        >
          <ChevronLeftIcon size={24} aria-hidden /> Trước
        </button>
        {(s.audioFileId || s.speakText) && (
          <button
            type="button"
            data-card="true"
            onClick={() => speakSlide(s)}
            className={`${STAGE_BTN} border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]`}
          >
            <UnmuteIcon size={24} aria-hidden /> Nghe
          </button>
        )}
        <button
          type="button"
          data-card="true"
          onClick={() => step({ op: state.revealed ? 'hide' : 'reveal' })}
          className={`${STAGE_BTN} border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]`}
        >
          {state.revealed ? <EyeClosedIcon size={24} aria-hidden /> : <EyeIcon size={24} aria-hidden />}
          {state.revealed ? 'Ẩn đáp án' : 'Hiện đáp án'}
        </button>
        <button
          type="button"
          data-card="true"
          onClick={() => step({ op: 'next' })}
          disabled={index === slides.length - 1 && state.revealed}
          className={`${STAGE_BTN} border-[var(--button-primary-borderColor-rest)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)] hover:bg-[var(--button-primary-bgColor-hover)]`}
        >
          Tiếp <ChevronRightIcon size={24} aria-hidden />
        </button>
      </footer>
    </div>
  );
}
