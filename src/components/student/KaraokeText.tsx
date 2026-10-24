'use client';

// Karaoke đọc theo cho câu đọc to (35.7): bấm nghe mẫu, chữ sáng dần theo giọng mẫu của giáo viên (mốc giáo viên chỉnh,
// hoặc chia đều theo độ dài). Chưa có giọng mẫu thì máy đọc, chữ sáng theo từng từ máy báo; máy không báo thì theo thời lượng
// ước lượng. Đọc xong thì nhắc con bấm micro đọc theo.
import { Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { activeWord, estimateDurationMs, evenTimings, karaokeWords, parseTimings, wordIndexAtChar } from '@/lib/karaoke';

export function KaraokeText({ text, audioFileId, wordTimings, disabled }: { text: string; audioFileId: number | null; wordTimings: string; disabled?: boolean }) {
  const words = karaokeWords(text);
  const [active, setActive] = useState(-1);
  const [state, setState] = useState<'idle' | 'playing' | 'done'>('idle');
  const stopRef = useRef<() => void>(() => undefined);

  useEffect(() => () => stopRef.current(), []);

  function play() {
    stopRef.current();
    setState('playing');
    setActive(-1);
    let raf = 0;
    let timer = 0;
    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      setActive(words.length);
      setState('done');
    };

    const speakWithMachine = () => {
      const total = estimateDurationMs(words);
      const est = evenTimings(words, total);
      const t0 = performance.now();
      let byBoundary = false;
      timer = window.setInterval(() => {
        const t = performance.now() - t0;
        if (t >= total * 2 || (!byBoundary && t >= total + 300)) return finish();
        if (!byBoundary) setActive(activeWord(est, t));
      }, 80);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 0.85;
        u.onboundary = (e) => {
          if (e.name !== 'word') return;
          byBoundary = true;
          setActive(wordIndexAtChar(text, e.charIndex));
        };
        u.onend = finish;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
      stopRef.current = () => {
        ended = true;
        window.clearInterval(timer);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      };
    };

    if (!audioFileId) return speakWithMachine();
    const audio = new Audio(`/api/files/${audioFileId}`);
    let timings: number[] | null = null;
    const ready = () => {
      const ms = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : estimateDurationMs(words);
      timings = parseTimings(wordTimings, words.length) ?? evenTimings(words, ms);
    };
    const tick = () => {
      if (!timings) ready();
      setActive(activeWord(timings!, audio.currentTime * 1000));
      raf = requestAnimationFrame(tick);
    };
    audio.onloadedmetadata = ready;
    audio.onended = finish;
    audio.onerror = () => speakWithMachine();
    stopRef.current = () => {
      ended = true;
      audio.pause();
      cancelAnimationFrame(raf);
    };
    void audio
      .play()
      .then(() => {
        raf = requestAnimationFrame(tick);
      })
      .catch(() => speakWithMachine());
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <p className="rounded-2xl border border-line bg-stone/40 p-3 text-center text-xl font-extrabold leading-relaxed text-ink" aria-label="Câu đọc theo">
        {words.map((w, i) => {
          const st = i < active ? 'read' : i === active ? 'active' : 'todo';
          return (
            <span key={i}>
              <span
                data-state={st}
                aria-current={st === 'active' ? 'true' : undefined}
                className={`rounded-lg px-0.5 transition-colors ${st === 'active' ? 'bg-primary text-on-primary' : st === 'read' ? 'text-[var(--accent)]' : ''}`}
              >
                {w}
              </span>{' '}
            </span>
          );
        })}
      </p>
      <button
        type="button"
        onClick={play}
        disabled={disabled || state === 'playing'}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-base font-extrabold text-ink active:scale-95 disabled:opacity-40"
      >
        <Volume2 className="size-5" aria-hidden /> {state === 'done' ? 'Nghe lại mẫu' : 'Nghe mẫu và đọc theo'}
      </button>
      {state === 'done' && <p className="text-base font-bold text-ink" role="status">Giờ con bấm micro để đọc theo nhé!</p>}
    </div>
  );
}
