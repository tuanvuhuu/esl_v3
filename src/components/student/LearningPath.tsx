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
            {i < steps.length - 1 && <span className={`absolute left-5 top-11 bottom-0 w-1 -translate-x-1/2 rounded-full ${done ? 'bg-primary' : 'bg-stone'}`} aria-hidden />}
            <span
              className={`relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-extrabold ${done ? 'border-primary-deep bg-primary text-on-primary' : 'border-line bg-surface text-ink-2'}`}
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-[var(--radius-panel)] bg-surface p-4 shadow-card max-[767px]:p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/cua-toi/${r.id}`} className="min-w-0 text-base font-normal text-ink [overflow-wrap:anywhere] hover:underline">
                  {r.title}
                </Link>
                <SubmissionPill status={r.status} />
              </div>
              <small className="text-sm text-muted">
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
