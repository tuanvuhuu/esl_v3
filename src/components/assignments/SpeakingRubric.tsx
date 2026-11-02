'use client';

// Chấm bài nói theo tiêu chí (35.9): trẻ đến 8 tuổi chấm sao (1–3), từ 9 tuổi chấm điểm 0–5 thêm từ vựng, ngữ pháp.
// "Điều con làm tốt" bắt buộc. Điểm câu tự quy đổi; giáo viên vẫn sửa được ô điểm nếu cần.
import { StarFillIcon, StarIcon } from '@primer/octicons-react';
import type { SpeakingRubric as Rubric } from '@/app/(app)/bai-tap/speaking-actions';
import { TextAreaAutoHeight } from '@/components-ui';
import { rubricToPoints, SCALE_CRITERIA, SCALE_RANGE, SPEAKING_CRITERIA, type SpeakingScale } from '@/lib/speaking';
import { Field } from '@/components/ui/Field';

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
    <div
      className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
      role="group"
      aria-label={`Tiêu chí câu ${position}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2">
        <b className="text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">
          {scale === 'stars' ? 'Chấm sao (học sinh đến 8 tuổi)' : 'Chấm điểm 0–5 (học sinh từ 9 tuổi)'}
        </b>
        <small className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--fgColor-default)]">
          {points === null ? 'Chấm đủ các tiêu chí để tính điểm câu' : `Quy ra ${points}/${itemPoints} điểm`}
        </small>
      </div>
      <div className="flex flex-col gap-3 p-3.5">
        <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]">
          {SCALE_CRITERIA[scale].map((k) => {
            const value = rubric.scores[k];
            const levels = Array.from({ length: max - min + 1 }, (_, i) => min + i);
            return (
              <li key={k} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                <span className="inline-flex items-center rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)] px-2.5 py-1 text-xs font-medium text-[var(--fgColor-default)]">
                  {SPEAKING_CRITERIA[k]}
                </span>
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
                        className="grid size-[var(--icon-h)] place-items-center rounded-[var(--borderRadius-medium)] transition-colors hover:bg-[var(--bgColor-muted)] max-[767px]:size-[var(--icon-h-touch)] disabled:opacity-40"
                      >
                        {value !== undefined && n <= value ? (
                          <StarFillIcon size={20} className="text-[var(--fgColor-attention,var(--color-primary-deep))]" aria-hidden />
                        ) : (
                          <StarIcon size={20} className="text-[var(--fgColor-muted)] opacity-50" aria-hidden />
                        )}
                      </button>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        disabled={!canManage}
                        aria-pressed={value === n}
                        aria-label={`${SPEAKING_CRITERIA[k]} ${n} điểm`}
                        onClick={() => setScore(k, n)}
                        className={`grid size-[var(--icon-h)] place-items-center rounded-[var(--borderRadius-medium)] border text-sm font-medium tabular-nums transition-colors max-[767px]:size-[var(--icon-h-touch)] disabled:opacity-40 ${
                          value === n
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]'
                            : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)]'
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
          <TextAreaAutoHeight
            value={rubric.praise}
            onChange={(e) => onChange({ ...rubric, praise: e.target.value })}
            rows={2}
            maxLength={300}
            disabled={!canManage}
            placeholder="VD: Con nói to, rõ và đủ câu."
            aria-label={`Điều con làm tốt câu ${position}`}
          />
        </Field>
      </div>
    </div>
  );
}
