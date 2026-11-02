// Bảng theo dõi lớp (35.20): em nào chưa làm bài, câu và từ cả lớp hay sai, bài nói chờ chấm (bấm mở thẳng màn chấm em đó).
// Máy tính ba cột, điện thoại xếp dọc. Dữ liệu bấm được tô xanh gạch chân.
import Link from 'next/link';
import { Pill } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { SPEAKING_WAIT_DAYS } from '@/lib/class-tracking';
import { vnDateTimeLabel } from '@/lib/datetime';
import type { ClassTracking } from '@/lib/queries/class-tracking';

const LINK = 'text-[var(--fgColor-link)] underline underline-offset-2 [overflow-wrap:anywhere]';
const H3 = 'mb-2 text-sm font-bold text-[var(--fgColor-default)]';

export function ClassTrackingPanel({ data }: { data: ClassTracking }) {
  const { missing, hard, forgotten, speaking } = data;
  return (
    <Panel title="Theo dõi lớp">
      <p className="mb-3 text-xs text-[var(--fgColor-muted)]">Tính các bài có hạn trong 30 ngày qua và bài chưa tới hạn.</p>
      <div className="grid grid-cols-1 gap-5 min-[1200px]:grid-cols-3">
        <section aria-labelledby="track-missing">
          <h3 id="track-missing" className={H3}>
            Chưa làm bài <span className="font-normal text-[var(--fgColor-muted)]">({missing.length}/{data.activeStudents} em)</span>
          </h3>
          {missing.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-muted)]">Cả lớp đã nộp đủ bài.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]" aria-label="Em chưa làm bài">
              {missing.map((s) => (
                <li key={s.studentId} className="flex flex-col gap-1 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/hoc-sinh/${s.studentId}`} className={`text-sm font-semibold ${LINK}`}>
                      {s.fullName}
                    </Link>
                    <small className="shrink-0 text-xs text-[var(--fgColor-muted)]">{s.assignments.length} bài</small>
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {s.assignments.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-x-2 text-xs">
                        <Link href={`/bai-tap/${a.id}`} className={LINK}>{a.title}</Link>
                        <span className="text-[var(--fgColor-muted)]">hạn {vnDateTimeLabel(a.dueAt)}</span>
                        {a.overdue && <Pill tone="blush">Quá hạn</Pill>}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="track-hard">
          <h3 id="track-hard" className={H3}>Cả lớp hay sai</h3>
          {hard.length === 0 && forgotten.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-muted)]">Chưa có câu hay từ nào nhiều bạn sai.</p>
          ) : (
            <>
              {hard.length > 0 && (
                <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]" aria-label="Câu hay sai">
                  {hard.map((q) => (
                    <li key={q.itemId} className="flex flex-col gap-0.5 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <b className="text-sm font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{q.prompt || 'Câu không có đề'}</b>
                        <Pill tone="blush">{q.wrong}/{q.answered} em sai</Pill>
                      </div>
                      {q.answer && (
                        <small className="text-xs text-[var(--fgColor-muted)]">
                          Đáp án: <b className="font-semibold text-[var(--fgColor-default)]">{q.answer}</b>
                        </small>
                      )}
                      <Link href={`/bai-tap/${q.assignmentId}`} className={`text-xs ${LINK}`}>{q.assignmentTitle}</Link>
                    </li>
                  ))}
                </ul>
              )}
              {forgotten.length > 0 && (
                <div className="mt-3">
                  <small className="mb-1.5 block text-xs font-semibold text-[var(--fgColor-muted)]">Từ hay quên khi ôn</small>
                  <ul className="flex flex-wrap gap-1.5" aria-label="Từ hay quên">
                    {forgotten.map((w) => (
                      <li key={w.word} className="rounded-full border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-2.5 py-0.5 text-xs text-[var(--fgColor-default)]">
                        <b>{w.word}</b> <span className="text-[var(--fgColor-muted)]">· {w.students} em</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        <section aria-labelledby="track-speaking">
          <h3 id="track-speaking" className={H3}>
            Bài nói chờ chấm <span className="font-normal text-[var(--fgColor-muted)]">({speaking.length})</span>
          </h3>
          {speaking.length === 0 ? (
            <p className="text-sm text-[var(--fgColor-muted)]">Không có bài nói nào đang chờ.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]" aria-label="Bài nói chờ chấm">
              {speaking.map((w) => (
                <li key={w.submissionId} className="flex flex-col gap-0.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/bai-tap/${w.assignmentId}?hs=${w.studentId}`} className={`text-sm font-semibold ${LINK}`}>
                      Chấm bài {w.fullName}
                    </Link>
                    {w.days > SPEAKING_WAIT_DAYS ? (
                      <Pill tone="blush">Chờ {w.days} ngày</Pill>
                    ) : (
                      <Pill tone="stone">{w.days === 0 ? 'Hôm nay' : `Chờ ${w.days} ngày`}</Pill>
                    )}
                  </div>
                  <small className="text-xs text-[var(--fgColor-muted)]">
                    {w.title} · {w.speakCount} câu nói · nộp {vnDateTimeLabel(w.submittedAt)}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Panel>
  );
}
