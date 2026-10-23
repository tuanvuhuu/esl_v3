'use client';

// Khung khảo sát cuối khoá trên trang lớp (37.14): kết quả và nút gửi khảo sát qua Telegram (có xác nhận vì tin tới phụ huynh thật)
import { Send } from 'lucide-react';
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

export function SurveyPanel({ classId, className, summary, canManage }: { classId: number; className: string; summary: SurveySummary; canManage: boolean }) {
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
          <Btn onClick={() => setAsking(true)} disabled={pending}>
            <Send className="size-4" aria-hidden />
            Gửi khảo sát
          </Btn>
        ) : undefined
      }
    >
      {s.sent === 0 ? (
        <EmptyState title="Chưa gửi khảo sát" hint="Bot tự gửi khi lớp học xong buổi cuối. Muốn hỏi sớm thì bấm Gửi khảo sát." />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-bg px-2 py-2.5">
              <b className="block text-xl font-extrabold text-ink">{s.average === null ? '' : `${s.average.toLocaleString('vi-VN')}/5`}</b>
              <small className="text-xs text-muted">Điểm trung bình</small>
            </div>
            <div className="rounded-xl bg-bg px-2 py-2.5">
              <b className="block text-xl font-extrabold text-ink">{s.answered}/{s.sent}</b>
              <small className="text-xs text-muted">Phụ huynh đã chấm</small>
            </div>
            <div className="rounded-xl bg-bg px-2 py-2.5">
              <b className="block text-xl font-extrabold text-ink">{continued ? `${Math.round((s.continueYes / continued) * 100)}%` : ''}</b>
              <small className="text-xs text-muted">Học tiếp khoá sau</small>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5" aria-label="Số lượt theo số sao">
            {[5, 4, 3, 2, 1].map((n) => (
              <li key={n} className="grid grid-cols-[3.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
                <span className="text-ink-2">{n} sao</span>
                <ProgressBar value={s.byScore[n - 1]} max={Math.max(1, s.answered)} />
                <span className="text-right tabular-nums text-ink">{s.byScore[n - 1]}</span>
              </li>
            ))}
          </ul>
          {continued > 0 && (
            <p className="text-sm text-ink-2">
              Học tiếp: {s.continueYes} có · {s.continueMaybe} chưa chắc · {s.continueNo} không
            </p>
          )}
          {s.lowScores.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-line pt-2.5">
              <h3 className="text-xs font-normal uppercase tracking-wider text-muted">Cần liên hệ (từ 3 sao trở xuống)</h3>
              {s.lowScores.map((l) => (
                <div key={`${l.studentId}-${l.parentName}`} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <Link href={`/hoc-sinh/${l.studentId}`} className="text-link underline underline-offset-2">{l.studentName}</Link>
                    <span className="text-muted"> · {l.parentName}</span>
                  </span>
                  <Pill tone="blush">{l.score} sao</Pill>
                </div>
              ))}
            </div>
          )}
          {s.lastSentAt && <small className="text-xs text-muted">Gửi lần gần nhất {vnDateTimeLabel(s.lastSentAt)}</small>}
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
