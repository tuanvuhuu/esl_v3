'use client';

// Học sinh xem nhận xét bài nói (35.10): danh sách lỗi theo mốc giây, bấm mốc để nghe lại đúng đoạn mình nói,
// cách nói đúng; câu bị đánh dấu "nói lại" thì ghi âm lại ngay ở đây (bản cũ được giữ để Thầy/Cô so sánh).
import { CheckCircleFillIcon, PlayIcon, StarFillIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { redoSpeakingAction } from '@/app/(student)/cua-toi/actions';
import type { StudentItem } from '@/lib/queries/student-portal';
import { formatMs, SCALE_CRITERIA, SPEAKING_CRITERIA, SPEAKING_ERRORS, topMarks, type SpeakingCriterion, type SpeakingMark, type SpeakingScale } from '@/lib/speaking';
import { Alert, Pill } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { SpeakQuestion } from './InteractiveExercisePlayer';

export function SpeakingFeedback({
  assignmentId,
  item,
  fileId,
  marks,
  redone,
  voiceAllowed,
  rubric,
}: {
  assignmentId: number;
  item: StudentItem;
  fileId: number | null;
  marks: SpeakingMark[];
  redone: boolean;
  voiceAllowed: boolean;
  rubric: { scale: SpeakingScale; scores: Partial<Record<SpeakingCriterion, number>>; praise: string } | null;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const audio = useRef<HTMLAudioElement>(null);
  const [error, setError] = useState<string | null>(null);
  const needRedo = marks.some((m) => m.redo);
  // Trẻ nhỏ (chấm sao) chỉ thấy 1–2 lỗi quan trọng nhất, ưu tiên câu cần nói lại (35.9)
  const young = rubric?.scale !== 'points';
  const shown = young ? topMarks(marks, 2).sort((a, b) => a.atMs - b.atMs) : marks;

  function seek(ms: number) {
    const el = audio.current;
    if (!el) return;
    // Lùi một giây để nghe cả đoạn trước chỗ sai
    el.currentTime = Math.max(0, ms / 1000 - 1);
    void el.play().catch(() => undefined);
  }

  async function saveRedo(newFileId: number) {
    const r = await redoSpeakingAction(assignmentId, item.id, newFileId);
    if (!r.ok) return setError(r.message ?? 'Chưa lưu được');
    setError(null);
    notify(r.message ?? 'Đã lưu bản nói lại');
    router.refresh();
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
      aria-label={`Nhận xét bài nói câu ${item.position}`}
      role="group"
    >
      <div className="border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2">
        <b className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--fgColor-muted)]">
          Thầy/Cô nhận xét bài nói
        </b>
      </div>
      <div className="flex flex-col gap-2.5 p-3.5">
        {rubric?.praise && (
          <p className="rounded-lg border border-[var(--borderColor-success-muted)] bg-mint px-3 py-2 text-sm text-mint-ink">
            <b className="font-semibold">Điều con làm tốt:</b> {rubric.praise}
          </p>
        )}
        {rubric && (
          <ul className="flex flex-wrap gap-2 text-xs text-[var(--fgColor-muted)]" aria-label="Kết quả theo tiêu chí">
            {SCALE_CRITERIA[rubric.scale].map((k) => {
              const sc = rubric.scores[k] ?? 0;
              return (
                <li
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-2.5 py-1"
                >
                  <span>{SPEAKING_CRITERIA[k]}:</span>
                  {rubric.scale === 'stars' ? (
                    <span className="inline-flex items-center gap-0.5" aria-label={`${sc} sao`}>
                      {Array.from({ length: sc }, (_, idx) => (
                        <StarFillIcon
                          key={idx}
                          size={12}
                          className="text-[var(--fgColor-attention,var(--primary))]"
                          aria-hidden
                        />
                      ))}
                    </span>
                  ) : (
                    <b className="font-mono font-semibold tabular-nums text-[var(--fgColor-default)]">{sc}/5</b>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {fileId !== null && (
          <audio
            ref={audio}
            controls
            preload="metadata"
            src={`/api/files/${fileId}`}
            aria-label={redone ? 'Bài nói mới của con' : 'Bài nói của con'}
            className="w-full"
          />
        )}
        {redone && <small className="text-xs text-[var(--fgColor-muted)]">Các mốc giây bên dưới là của bản nói lần trước.</small>}
        <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
          {shown.map((m) => (
            <li key={m.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <button
                type="button"
                data-link="true"
                onClick={() => seek(m.atMs)}
                disabled={redone}
                aria-label={`Nghe lại từ ${formatMs(m.atMs)}`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--fgColor-link)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] disabled:text-[var(--fgColor-muted)]"
              >
                <PlayIcon size={11} aria-hidden />
                {formatMs(m.atMs)}
              </button>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-semibold text-[var(--fgColor-default)]">{SPEAKING_ERRORS[m.errorType]}</span>
                {m.correctText && <span className="text-[var(--fgColor-muted)]"> · nói đúng: “{m.correctText}”</span>}
                {m.note && <span className="block text-[var(--fgColor-muted)]">{m.note}</span>}
                {m.modelFileId !== null && (
                  <span className="mt-1.5 flex flex-col gap-0.5">
                    <small className="text-xs text-[var(--fgColor-muted)]">Nghe Thầy/Cô nói mẫu:</small>
                    <audio
                      controls
                      preload="none"
                      src={`/api/files/${m.modelFileId}`}
                      aria-label={`Thầy/Cô nói mẫu lỗi tại ${formatMs(m.atMs)}`}
                      className="h-[var(--ctl-h)] w-full"
                    />
                  </span>
                )}
                {m.redo && (
                  <span className="mt-1 block">
                    <Pill tone="butter">Cần nói lại</Pill>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {shown.length < marks.length && (
          <small className="text-xs text-[var(--fgColor-muted)]">Thầy/Cô nêu {shown.length} điều quan trọng nhất để con sửa trước.</small>
        )}

        {needRedo && redone && (
          <p className="flex items-center gap-1.5 rounded-lg border border-[var(--borderColor-success-muted)] bg-mint px-3 py-2 text-sm font-semibold text-mint-ink">
            <CheckCircleFillIcon size={16} aria-hidden />
            Con đã nói lại câu này. Thầy/Cô sẽ nghe và nhận xét.
          </p>
        )}
        {needRedo && !redone && voiceAllowed && (
          <div className="flex flex-col gap-1 border-t border-[var(--borderColor-muted)] pt-3">
            <b className="text-sm font-semibold text-[var(--fgColor-default)]">Nói lại câu này</b>
            <small className="text-xs text-[var(--fgColor-muted)]">Nghe lại chỗ sai ở trên, rồi bấm micro để nói lại. Chỉ cần nói lại câu này.</small>
            <SpeakQuestion item={item} answer={undefined} onChange={(patch) => patch.fileId && saveRedo(patch.fileId)} />
          </div>
        )}
        {needRedo && !redone && !voiceAllowed && (
          <small className="text-xs text-[var(--fgColor-muted)]">Phụ huynh chưa đồng ý cho con ghi âm nên chưa nói lại được.</small>
        )}
        {error && <Alert inline>{error}</Alert>}
      </div>
    </div>
  );
}
