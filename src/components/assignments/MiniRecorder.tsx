'use client';

// Ghi âm gọn cho giáo viên (giọng mẫu của một lỗi bài nói): bấm ghi, bấm dừng (tự dừng sau maxSec), tự tải lên.
// Dùng chung cách chọn định dạng với bộ ghi âm của học sinh (src/lib/recording.ts).
import { Mic, Square, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { clock, pickRecordingFormat, recordedFormat } from '@/lib/recording';
import { uploadAsStaff } from '@/lib/upload-client';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';

export function MiniRecorder({ fileId, label, maxSec = 10, disabled, onChange }: { fileId: number | null; label: string; maxSec?: number; disabled?: boolean; onChange: (fileId: number | null) => void }) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (phase !== 'recording') return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);
  useEffect(() => {
    if (phase === 'recording' && seconds >= maxSec && recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, [phase, seconds, maxSec]);

  async function start() {
    setError(null);
    const format = typeof MediaRecorder !== 'undefined' ? pickRecordingFormat((t) => MediaRecorder.isTypeSupported(t)) : null;
    if (!format || !navigator.mediaDevices?.getUserMedia) return setError('Trình duyệt này chưa ghi âm được.');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setError('Chưa được phép dùng micro. Cho phép Micro ở biểu tượng ổ khoá cạnh địa chỉ trang.');
    }
    const rec = new MediaRecorder(stream, { mimeType: format.mimeType });
    recorderRef.current = rec;
    chunks.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const real = recordedFormat(rec.mimeType, format);
      const blob = new Blob(chunks.current, { type: real.baseType });
      if (blob.size === 0) {
        setPhase('idle');
        return setError('Chưa ghi được tiếng, thử lại.');
      }
      setPhase('uploading');
      const r = await uploadAsStaff(new File([blob], `giong-mau.${real.ext}`, { type: real.baseType }));
      setPhase('idle');
      if (!r.ok) return setError(r.message);
      onChange(r.fileId);
    };
    rec.start();
    setSeconds(0);
    setPhase('recording');
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {phase === 'recording' ? (
          <Btn onClick={() => recorderRef.current?.stop()} aria-label="Dừng ghi giọng mẫu">
            <Square className="size-4 text-blush-ink" aria-hidden />
            Dừng {clock(seconds)}
          </Btn>
        ) : (
          <Btn onClick={start} disabled={disabled || phase === 'uploading'}>
            <Mic className="size-4" aria-hidden />
            {phase === 'uploading' ? 'Đang lưu…' : fileId ? 'Ghi lại giọng mẫu' : label}
          </Btn>
        )}
        {fileId !== null && phase === 'idle' && (
          <>
            <audio controls preload="none" src={`/api/files/${fileId}`} aria-label="Giọng mẫu đã ghi" className="h-[var(--ctl-h)] max-w-full" />
            <ActIcon label="Bỏ giọng mẫu" danger onClick={() => onChange(null)} disabled={disabled}>
              <Trash2 className="size-4" aria-hidden />
            </ActIcon>
          </>
        )}
      </div>
      {error && <small className="text-sm text-blush-ink">{error}</small>}
    </div>
  );
}
