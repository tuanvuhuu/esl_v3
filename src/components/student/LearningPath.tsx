// Đường học theo bài (35.17): các bài của lớp theo hạn nộp, nối thành một con đường, mỗi chặng hiện sao đã đạt.
import Link from 'next/link';
import { SubmissionPill } from '@/components/assignments/SubmissionPill';
import { vnDateTimeLabel } from '@/lib/datetime';
import type { PathStep } from '@/lib/queries/motivation';

export function LearningPath({ steps }: { steps: PathStep[] }) {
  return (
    <ol className="flex flex-col" aria-label="Đường học">
      {steps.map((r, i) => {
        const done = r.status !== 'not_submitted';
        return (
          <li key={r.id} className="relative flex gap-3 pb-3 last:pb-0">
            {/* Đoạn đường nối sang chặng sau */}
            {i < steps.length - 1 && (
              <span
                className={`absolute left-5 top-11 bottom-0 w-1 -translate-x-1/2 rounded-full ${
                  done ? 'bg-[var(--button-primary-bgColor-rest)]' : 'bg-[var(--bgColor-muted)]'
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-extrabold ${
                done
                  ? 'border-[var(--borderColor-accent-emphasis)] bg-[var(--button-primary-bgColor-rest)] text-[var(--button-primary-fgColor-rest)]'
                  : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)]'
              }`}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-4 shadow-[var(--shadow-resting-small,0_1px_2px_rgba(0,0,0,0.04))] max-[767px]:p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link
                  href={`/cua-toi/${r.id}`}
                  data-link="true"
                  className="min-w-0 text-base font-normal text-[var(--fgColor-default)] [overflow-wrap:anywhere] hover:text-[var(--fgColor-link)] hover:underline"
                >
                  {r.title}
                </Link>
                <SubmissionPill status={r.status} />
              </div>
              <small className="text-sm text-[var(--fgColor-muted)]">
                Hạn {vnDateTimeLabel(r.dueAt)} · tối đa {r.maxScore} điểm
                {r.status === 'graded' && r.score !== null ? ` · Điểm ${r.score}/${r.maxScore}` : ''}
              </small>
              <span className="text-lg leading-none" aria-label={`${r.stars} trên 3 sao`}>
                {'⭐'.repeat(r.stars)}
                <span className="opacity-25">{'⭐'.repeat(3 - r.stars)}</span>
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
