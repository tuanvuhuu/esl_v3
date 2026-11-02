'use client';

// Chỉnh mốc từng từ cho karaoke đọc theo (35.7): phát giọng mẫu, giáo viên chạm nút mỗi khi giọng mẫu đọc tới từ tiếp theo.
// Chưa chỉnh thì học sinh thấy chữ sáng chia đều theo độ dài giọng mẫu. Chưa có giọng mẫu thì chữ sáng theo máy đọc.
import { useRef, useState } from 'react';
import { Btn } from '@/components/ui/Btn';
import { formatTimings, karaokeWords, parseTimings } from '@/lib/karaoke';

export function KaraokeTimingEditor({ n, text, audioFileId, value, disabled, onChange }: { n: number; text: string; audioFileId: number | null; value: string; disabled?: boolean; onChange: (v: string) => void }) {
  const words = karaokeWords(text);
  const saved = parseTimings(value, words.length);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [taps, setTaps] = useState<number[] | null>(null);
  // Chỉ cho chạm khi giọng mẫu đã thật sự phát (tệp tải từ kho có thể mất vài giây), để mốc không dồn về 0
  const [playing, setPlaying] = useState(false);

  if (words.length === 0) return null;

  function start() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setPlaying(false);
    setTaps([]);
    void audio.play().catch(() => setTaps(null));
  }

  function tap() {
    const audio = audioRef.current;
    if (!audio || taps === null) return;
    const next = [...taps, Math.max(taps.at(-1) ?? 0, audio.currentTime * 1000)];
    if (next.length >= words.length) {
      audio.pause();
      setPlaying(false);
      setTaps(null);
      onChange(formatTimings(next));
    } else setTaps(next);
  }

  function cancel() {
    audioRef.current?.pause();
    setPlaying(false);
    setTaps(null);
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3"
      role="group"
      aria-label={`Mốc karaoke câu ${n}`}
    >
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">Karaoke đọc theo</span>
      <p className="flex flex-wrap gap-1.5">
        {words.map((w, i) => {
          const isCurrent = taps !== null && i === taps.length;
          return (
            <span
              key={i}
              className={`inline-flex items-baseline gap-1 rounded-[var(--borderRadius-medium)] border px-2 py-0.5 text-sm transition-colors ${
                isCurrent
                  ? 'border-[var(--primary)] bg-[var(--primary)] font-medium text-[var(--on-primary)]'
                  : 'border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] text-[var(--fgColor-default)]'
              }`}
            >
              {w}
              {saved && (
                <small className={`font-mono text-[11px] tabular-nums ${isCurrent ? 'text-[var(--on-primary)]/85' : 'text-[var(--fgColor-muted)]'}`}>
                  {(saved[i] / 1000).toFixed(1)}s
                </small>
              )}
            </span>
          );
        })}
      </p>
      <small className="text-xs text-[var(--fgColor-muted)]">
        {!audioFileId
          ? 'Chưa có giọng mẫu: học sinh nghe máy đọc, chữ sáng theo máy đọc.'
          : saved
            ? 'Đã chỉnh mốc từng từ theo giọng mẫu.'
            : 'Chữ đang sáng chia đều theo độ dài giọng mẫu. Bấm Chỉnh mốc để khớp hơn.'}
      </small>
      {audioFileId && (
        <>
          <audio ref={audioRef} src={`/api/files/${audioFileId}`} preload="auto" onPlaying={() => setPlaying(true)} onEnded={cancel} className="hidden" />
          {taps === null ? (
            <div className="flex flex-wrap gap-2">
              <Btn onClick={start} disabled={disabled}>
                Chỉnh mốc từng từ
              </Btn>
              {saved && (
                <Btn onClick={() => onChange('')} disabled={disabled}>
                  Chia đều
                </Btn>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="primary" onClick={tap} disabled={!playing} aria-label={`Chạm mốc từ ${taps.length + 1}`}>
                {playing ? `Chạm khi đọc tới “${words[taps.length]}” (${taps.length + 1}/${words.length})` : 'Đang tải giọng mẫu…'}
              </Btn>
              <Btn onClick={cancel}>Huỷ</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}
