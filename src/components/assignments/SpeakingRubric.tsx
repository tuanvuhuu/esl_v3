'use client';

// Chấm bài nói theo tiêu chí (35.9): trẻ đến 8 tuổi chấm sao (1–3), từ 9 tuổi chấm điểm 0–5 thêm từ vựng, ngữ pháp.
// "Điều con làm tốt" bắt buộc. Điểm câu tự quy đổi; giáo viên vẫn sửa được ô điểm nếu cần.
import { Star } from 'lucide-react';
import type { SpeakingRubric as Rubric } from '@/app/(app)/bai-tap/speaking-actions';
import { rubricToPoints, SCALE_CRITERIA, SCALE_RANGE, SPEAKING_CRITERIA, type SpeakingScale } from '@/lib/speaking';
import { Field, textareaClass } from '@/components/ui/Field';

export function SpeakingRubric({
  scale,
  rubric,
  itemPoints,
  position,
  canManage,
  onChange,
}: {
  scale: SpeakingScale;
  rubric: Rubric;
  itemPoints: number;
  position: number;
  canManage: boolean;
  onChange: (next: Rubric) => void;
}) {
  const { min, max } = SCALE_RANGE[scale];
  const points = rubricToPoints(scale, rubric.scores, itemPoints);
  const setScore = (k: keyof Rubric['scores'], v: number) => onChange({ ...rubric, scores: { ...rubric.scores, [k]: v } });

  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius-ctl)] border border-line bg-bg px-3 py-2.5" role="group" aria-label={`Tiêu chí câu ${position}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-sm font-semibold text-ink">{scale === 'stars' ? 'Chấm sao (học sinh đến 8 tuổi)' : 'Chấm điểm 0–5 (học sinh từ 9 tuổi)'}</b>
        <small className="text-sm text-ink-2">{points === null ? 'Chấm đủ các tiêu chí để tính điểm câu' : `Quy ra ${points}/${itemPoints} điểm`}</small>
      </div>
      <ul className="flex flex-col gap-2">
        {SCALE_CRITERIA[scale].map((k) => {
          const value = rubric.scores[k];
          const levels = Array.from({ length: max - min + 1 }, (_, i) => min + i);
          return (
            <li key={k} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-ink">{SPEAKING_CRITERIA[k]}</span>
              <div className="flex gap-1" role="group" aria-label={`${SPEAKING_CRITERIA[k]} câu ${position}`}>
                {levels.map((n) =>
                  scale === 'stars' ? (
                    <button
                      key={n}
                      type="button"
                      disabled={!canManage}
                      aria-pressed={value === n}
                      aria-label={`${SPEAKING_CRITERIA[k]} ${n} sao`}
                      onClick={() => setScore(k, n)}
                      className="grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] max-[767px]:size-[var(--icon-h-touch)] disabled:opacity-40"
                    >
                      <Star className={`size-6 ${value !== undefined && n <= value ? 'fill-[var(--primary)] text-primary-deep' : 'text-line'}`} aria-hidden />
                    </button>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      disabled={!canManage}
                      aria-pressed={value === n}
                      aria-label={`${SPEAKING_CRITERIA[k]} ${n} điểm`}
                      onClick={() => setScore(k, n)}
                      className={`grid size-[var(--icon-h)] place-items-center rounded-[var(--radius-ctl)] border text-sm font-bold tabular-nums max-[767px]:size-[var(--icon-h-touch)] disabled:opacity-40 ${
                        value === n ? 'border-primary-deep bg-primary text-on-primary' : 'border-line bg-surface text-ink-2'
                      }`}
                    >
                      {n}
                    </button>
                  ),
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Field label="Điều con làm tốt *" hint="Bắt buộc. Khen một điều cụ thể trước khi nêu lỗi.">
        <textarea
          value={rubric.praise}
          onChange={(e) => onChange({ ...rubric, praise: e.target.value })}
          rows={2}
          maxLength={300}
          disabled={!canManage}
          placeholder="VD: Con nói to, rõ và đủ câu."
          aria-label={`Điều con làm tốt câu ${position}`}
          className={textareaClass()}
        />
      </Field>
    </div>
  );
}
