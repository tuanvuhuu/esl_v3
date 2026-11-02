// Bảng theo dõi lớp (35.20): em nào chưa làm bài, câu và từ cả lớp hay sai, bài nói chờ chấm (bấm mở thẳng màn chấm em đó).
// Máy tính ba cột chuẩn 01. TSUKUBA, điện thoại xếp dọc. Dữ liệu bấm được tô xanh gạch chân.
import { AlertIcon, TasklistIcon, UnmuteIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { Pill } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { SPEAKING_WAIT_DAYS } from '@/lib/class-tracking';
import { vnDateTimeLabel } from '@/lib/datetime';
import type { ClassTracking } from '@/lib/queries/class-tracking';

const LINK = 'text-[var(--fgColor-link)] underline underline-offset-2 [overflow-wrap:anywhere]';

export function ClassTrackingPanel({ data }: { data: ClassTracking }) {
  const { missing, hard, forgotten, speaking } = data;
  return (
    <Panel
      title="Theo dõi lớp"
      action={
        <span className="text-xs text-[var(--fgColor-muted)]">
          Tính các bài có hạn trong 30 ngày qua và bài chưa tới hạn
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-3.5 min-[1200px]:grid-cols-3">
        {/* Cột 1: Chưa làm bài */}
        <section
          aria-labelledby="track-missing"
          className="flex flex-col overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2">
            <h3 id="track-missing" className="m-0 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">
              <TasklistIcon size={13} className="shrink-0" aria-hidden />
              <span>
                Chưa làm bài{' '}
                <span className="font-mono font-normal normal-case tabular-nums text-[var(--fgColor-default)]">
                  ({missing.length}/{data.activeStudents} em)
                </span>
              </span>
            </h3>
          </header>
          <div className="p-3.5">
            {missing.length === 0 ? (
              <p className="m-0 text-sm text-[var(--fgColor-muted)]">Cả lớp đã nộp đủ bài.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[var(--borderColor-muted)] p-0" aria-label="Em chưa làm bài">
                {missing.map((s) => (
                  <li key={s.studentId} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/hoc-sinh/${s.studentId}`} data-link="true" className={`text-sm font-semibold ${LINK}`}>
                        {s.fullName}
                      </Link>
                      <small className="shrink-0 font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
                        {s.assignments.length} bài
                      </small>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {s.assignments.map((a) => (
                        <li key={a.id} className="flex flex-wrap items-center gap-x-2 text-xs">
                          <Link href={`/bai-tap/${a.id}`} data-link="true" className={LINK}>
                            {a.title}
                          </Link>
                          <span className="tabular-nums text-[var(--fgColor-muted)]">hạn {vnDateTimeLabel(a.dueAt)}</span>
                          {a.overdue && <Pill tone="blush">Quá hạn</Pill>}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Cột 2: Cả lớp hay sai */}
        <section
          aria-labelledby="track-hard"
          className="flex flex-col overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2">
            <h3 id="track-hard" className="m-0 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">
              <AlertIcon size={13} className="shrink-0" aria-hidden />
              <span>Cả lớp hay sai</span>
            </h3>
          </header>
          <div className="p-3.5">
            {hard.length === 0 && forgotten.length === 0 ? (
              <p className="m-0 text-sm text-[var(--fgColor-muted)]">Chưa có câu hay từ nào nhiều bạn sai.</p>
            ) : (
              <>
                {hard.length > 0 && (
                  <ul className="m-0 flex list-none flex-col divide-y divide-[var(--borderColor-muted)] p-0" aria-label="Câu hay sai">
                    {hard.map((q) => (
                      <li key={q.itemId} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <b className="text-sm font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">
                            {q.prompt || 'Câu không có đề'}
                          </b>
                          <Pill tone="blush">
                            {q.wrong}/{q.answered} em sai
                          </Pill>
                        </div>
                        {q.answer && (
                          <small className="text-xs text-[var(--fgColor-muted)]">
                            Đáp án: <b className="font-semibold text-[var(--fgColor-default)]">{q.answer}</b>
                          </small>
                        )}
                        <Link href={`/bai-tap/${q.assignmentId}`} data-link="true" className={`text-xs ${LINK}`}>
                          {q.assignmentTitle}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {forgotten.length > 0 && (
                  <div className={hard.length > 0 ? 'mt-3 border-t border-[var(--borderColor-muted)] pt-2.5' : ''}>
                    <small className="mb-1.5 block text-xs font-semibold text-[var(--fgColor-muted)]">Từ hay quên khi ôn</small>
                    <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Từ hay quên">
                      {forgotten.map((w) => (
                        <li
                          key={w.word}
                          className="rounded-[var(--borderRadius-small)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2 py-0.5 text-xs text-[var(--fgColor-default)]"
                        >
                          <b className="font-mono font-semibold">{w.word}</b>{' '}
                          <span className="tabular-nums text-[var(--fgColor-muted)]">· {w.students} em</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Cột 3: Bài nói chờ chấm */}
        <section
          aria-labelledby="track-speaking"
          className="flex flex-col overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2">
            <h3 id="track-speaking" className="m-0 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">
              <UnmuteIcon size={13} className="shrink-0" aria-hidden />
              <span>
                Bài nói chờ chấm{' '}
                <span className="font-mono font-normal normal-case tabular-nums text-[var(--fgColor-default)]">
                  ({speaking.length})
                </span>
              </span>
            </h3>
          </header>
          <div className="p-3.5">
            {speaking.length === 0 ? (
              <p className="m-0 text-sm text-[var(--fgColor-muted)]">Không có bài nói nào đang chờ.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col divide-y divide-[var(--borderColor-muted)] p-0" aria-label="Bài nói chờ chấm">
                {speaking.map((w) => (
                  <li key={w.submissionId} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/bai-tap/${w.assignmentId}?hs=${w.studentId}`}
                        data-link="true"
                        className={`text-sm font-semibold ${LINK}`}
                      >
                        Chấm bài {w.fullName}
                      </Link>
                      {w.days > SPEAKING_WAIT_DAYS ? (
                        <Pill tone="blush">Chờ {w.days} ngày</Pill>
                      ) : (
                        <Pill tone="stone">{w.days === 0 ? 'Hôm nay' : `Chờ ${w.days} ngày`}</Pill>
                      )}
                    </div>
                    <small className="tabular-nums text-xs text-[var(--fgColor-muted)]">
                      {w.title} · {w.speakCount} câu nói · nộp {vnDateTimeLabel(w.submittedAt)}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </Panel>
  );
}
