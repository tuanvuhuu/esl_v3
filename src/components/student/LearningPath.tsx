// Đường học theo bài (35.17): bậc thang lộ trình kiểu LoTrinh.module.css (.thang) của 01. TSUKUBA —
// bài đã làm hiện huy hiệu ngọc lục bảo, bài hiện tại viền vermilion nổi bật, bài sắp tới viền nét đứt.
import { CheckIcon, StarFillIcon, StarIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { SubmissionPill } from '@/components/assignments/SubmissionPill';
import { vnDateTimeLabel } from '@/lib/datetime';
import type { PathStep } from '@/lib/queries/motivation';

export function LearningPath({ steps }: { steps: PathStep[] }) {
  const currentIdx = steps.findIndex((s) => s.status === 'not_submitted');

  return (
    <ol className="flex flex-col" aria-label="Đường học">
      {steps.map((r, i) => {
        const done = r.status !== 'not_submitted';
        const isCurrent = i === currentIdx;

        return (
          <li key={r.id} className="relative flex gap-3.5 pb-3.5 last:pb-0">
            {/* Đoạn đường nối sang chặng sau */}
            {i < steps.length - 1 && (
              <span
                className={`absolute left-5 top-11 bottom-0 w-0.5 -translate-x-1/2 ${
                  done ? 'bg-[var(--accent)]' : 'bg-[var(--borderColor-default)]'
                }`}
                aria-hidden
              />
            )}

            <span
              className={`relative z-[1] mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold tabular-nums transition-colors ${
                done
                  ? 'border-2 border-[var(--accent)] bg-[var(--accent)] text-white'
                  : isCurrent
                  ? 'border-2 border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary,#fff)] shadow-xs'
                  : 'border-2 border-dashed border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)]'
              }`}
              aria-hidden
            >
              {done ? <CheckIcon size={16} aria-hidden /> : i + 1}
            </span>

            <div
              className={`tsukuba-rise flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl p-4 max-[767px]:p-3.5 ${
                done
                  ? 'border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]'
                  : isCurrent
                  ? 'border-2 border-[var(--primary)] bg-[var(--primary-soft)]'
                  : 'border-2 border-dashed border-[var(--borderColor-default)] bg-[var(--bgColor-default)]/80'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-[var(--fgColor-muted)]">
                    Chặng {i + 1}
                  </span>
                  <Link
                    href={`/cua-toi/${r.id}`}
                    data-link="true"
                    className="min-w-0 text-base font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere] hover:text-[var(--fgColor-link)] hover:underline"
                  >
                    {r.title}
                  </Link>
                </div>
                <SubmissionPill status={r.status} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <small className="text-xs tabular-nums text-[var(--fgColor-muted)]">
                  Hạn {vnDateTimeLabel(r.dueAt)} · tối đa {r.maxScore} điểm
                  {r.status === 'graded' && r.score !== null ? ` · Điểm ${r.score}/${r.maxScore}` : ''}
                </small>

                <span
                  className="inline-flex items-center gap-1"
                  role="img"
                  aria-label={`${r.stars} trên 3 sao`}
                >
                  {[1, 2, 3].map((n) =>
                    n <= r.stars ? (
                      <StarFillIcon
                        key={n}
                        size={15}
                        className="text-[var(--fgColor-attention,var(--primary))]"
                        aria-hidden
                      />
                    ) : (
                      <StarIcon
                        key={n}
                        size={15}
                        className="text-[var(--fgColor-muted)] opacity-35"
                        aria-hidden
                      />
                    ),
                  )}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
