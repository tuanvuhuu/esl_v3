'use client';

// Khung khảo sát cuối khoá trên trang lớp (37.14): kết quả và nút gửi khảo sát qua Telegram (có xác nhận vì tin tới phụ huynh thật)
import { MortarBoardIcon, PaperAirplaneIcon, PeopleIcon, StarFillIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sendCourseSurveyAction } from '@/app/(app)/lop-hoc/actions';
import { vnDateTimeLabel } from '@/lib/datetime';
import type { SurveySummary } from '@/lib/queries/surveys';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, Pill, ProgressBar } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';
import { useToast } from '@/components/ui/Toast';

export function SurveyPanel({
  classId,
  className,
  summary,
  canManage,
}: {
  classId: number;
  className: string;
  summary: SurveySummary;
  canManage: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const r = await sendCourseSurveyAction(classId);
      setAsking(false);
      notify(r.message ?? (r.ok ? 'Đã gửi khảo sát' : 'Chưa gửi được'));
      router.refresh();
    });
  }

  const s = summary;
  const continued = s.continueYes + s.continueMaybe + s.continueNo;
  return (
    <Panel
      title="Khảo sát cuối khoá"
      action={
        canManage ? (
          <Btn leadingVisual={PaperAirplaneIcon} onClick={() => setAsking(true)} disabled={pending}>
            Gửi khảo sát
          </Btn>
        ) : undefined
      }
    >
      {s.sent === 0 ? (
        <EmptyState title="Chưa gửi khảo sát" hint="Bot tự gửi khi lớp học xong buổi cuối. Muốn hỏi sớm thì bấm Gửi khảo sát." />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/65 px-2.5 py-2.5">
              <b className="inline-flex items-center justify-center gap-1 text-xl font-semibold tabular-nums text-[var(--fgColor-default)]">
                <StarFillIcon size={14} className="shrink-0 text-butter-ink" aria-hidden />
                {s.average === null ? '—' : `${s.average.toLocaleString('vi-VN')}/5`}
              </b>
              <small className="mt-0.5 block text-xs text-[var(--fgColor-muted)]">Điểm trung bình</small>
            </div>
            <div className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/65 px-2.5 py-2.5">
              <b className="inline-flex items-center justify-center gap-1 text-xl font-semibold tabular-nums text-[var(--fgColor-default)]">
                <PeopleIcon size={14} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
                {s.answered}/{s.sent}
              </b>
              <small className="mt-0.5 block text-xs text-[var(--fgColor-muted)]">Phụ huynh đã chấm</small>
            </div>
            <div className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/65 px-2.5 py-2.5">
              <b className="inline-flex items-center justify-center gap-1 text-xl font-semibold tabular-nums text-[var(--fgColor-default)]">
                <MortarBoardIcon size={14} className="shrink-0 text-mint-ink" aria-hidden />
                {continued ? `${Math.round((s.continueYes / continued) * 100)}%` : '—'}
              </b>
              <small className="mt-0.5 block text-xs text-[var(--fgColor-muted)]">Học tiếp khoá sau</small>
            </div>
          </div>

          <ul className="m-0 flex list-none flex-col gap-1.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-default)] p-3" aria-label="Số lượt theo số sao">
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n} className="grid grid-cols-[4rem_minmax(0,1fr)_2rem] items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[var(--fgColor-muted)]">
                  <StarFillIcon size={11} className="shrink-0 text-butter-ink" aria-hidden />
                  {n} sao
                </span>
                <ProgressBar value={s.byScore[n - 1]} max={Math.max(1, s.answered)} />
                <span className="text-right font-mono tabular-nums text-[var(--fgColor-default)]">{s.byScore[n - 1]}</span>
              </li>
            ))}
          </ul>

          {continued > 0 && (
            <p className="m-0 rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]/60 px-3 py-2 text-xs tabular-nums text-[var(--fgColor-muted)]">
              Học tiếp: <b className="font-semibold text-[var(--fgColor-default)]">{s.continueYes}</b> có ·{' '}
              <b className="font-semibold text-[var(--fgColor-default)]">{s.continueMaybe}</b> chưa chắc ·{' '}
              <b className="font-semibold text-[var(--fgColor-default)]">{s.continueNo}</b> không
            </p>
          )}

          {s.lowScores.length > 0 && (
            <div className="flex flex-col gap-2 overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]">
              <div className="border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3 py-1.5">
                <h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">
                  Cần liên hệ (từ 3 sao trở xuống)
                </h3>
              </div>
              <div className="flex flex-col divide-y divide-[var(--borderColor-muted)] px-3 py-1">
                {s.lowScores.map((l) => (
                  <div key={`${l.studentId}-${l.parentName}`} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <span className="min-w-0 truncate">
                      <Link
                        href={`/hoc-sinh/${l.studentId}`}
                        data-link="true"
                        className="font-medium text-[var(--fgColor-link)] underline underline-offset-2"
                      >
                        {l.studentName}
                      </Link>
                      <span className="text-[var(--fgColor-muted)]"> · {l.parentName}</span>
                    </span>
                    <Pill tone="blush">{l.score} sao</Pill>
                  </div>
                ))}
              </div>
            </div>
          )}

          {s.lastSentAt && (
            <small className="tabular-nums text-xs text-[var(--fgColor-muted)]">
              Gửi lần gần nhất {vnDateTimeLabel(s.lastSentAt)}
            </small>
          )}
        </div>
      )}
      <ConfirmDialog
        open={asking}
        title="Gửi khảo sát cuối khoá?"
        text={`Bot gửi câu hỏi mức hài lòng cho phụ huynh đã kết nối Telegram của lớp ${className}. Phụ huynh đã được hỏi trước đó thì bỏ qua.`}
        confirmLabel="Gửi khảo sát"
        pending={pending}
        onConfirm={send}
        onCancel={() => setAsking(false)}
      />
    </Panel>
  );
}
