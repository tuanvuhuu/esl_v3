'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setStudentLevelAction } from '@/app/(app)/hoc-sinh/level-actions';
import { SKILL_LABELS, type Skill } from '@/lib/assignment-scoring';
import type { LevelCheck, LevelRow } from '@/lib/level-rule';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Pill, Alert } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { FormFooter } from '@/components/ui/Field';
import { Panel } from '@/components/ui/surfaces';

// Trình độ của học sinh trong tab Kỹ năng: trình độ hiện tại, gợi ý lên (giáo viên xác nhận), và đổi tay
export function LevelPanel({
  studentId,
  current,
  levels,
  next,
  check,
  canManage,
}: {
  studentId: number;
  current: LevelRow | null;
  levels: LevelRow[];
  next: LevelRow | null;
  check: LevelCheck | null;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [changing, setChanging] = useState(false);
  const [choice, setChoice] = useState(current ? String(current.id) : '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply(levelId: number | null, source: 'suggestion' | 'manual') {
    startTransition(async () => {
      const r = await setStudentLevelAction(studentId, levelId, source);
      if (!r.ok) return setError(r.message ?? 'Không lưu được');
      setError(null);
      setChanging(false);
      notify(r.message ?? 'Đã lưu trình độ');
      router.refresh();
    });
  }

  const failing = check?.failing ?? [];

  return (
    <Panel title="Trình độ" action={canManage ? <Btn variant="ghost" onClick={() => setChanging(true)} disabled={pending}>Đổi trình độ</Btn> : null} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm text-ink-2">Trình độ hiện tại</span>
          {current ? <Pill tone="lav">{current.code} · {current.name}</Pill> : <Pill tone="stone">Chưa xếp</Pill>}
        </div>
        {canManage && (
          <Btn variant="ghost" onClick={() => setChanging(true)} disabled={pending}>
            Đổi trình độ
          </Btn>
        )}
      </div>

      {next && check?.ready && (
        <div className="flex flex-col gap-2.5 rounded-[var(--radius-ctl)] bg-mint px-3.5 py-3 text-mint-ink">
          <b className="text-base font-normal">Đủ điều kiện lên {next.code} ({next.name})</b>
          <span className="text-sm">Ba bài đã chấm gần nhất đạt ngưỡng ở cả bốn kỹ năng. Giáo viên xác nhận thì mới đổi trình độ.</span>
          <div>
            <Btn variant="primary" onClick={() => apply(next.id, 'suggestion')} disabled={!canManage || pending}>
              Xác nhận lên {next.code}
            </Btn>
          </div>
        </div>
      )}

      {next && check && !check.ready && (
        <div className="flex flex-col gap-1 text-sm text-ink-2">
          <span>
            Chưa đủ để lên {next.code}.{' '}
            {check.assignments < 3 ? `Mới có ${check.assignments}/3 bài đã chấm có câu hỏi.` : 'Cần ba bài gần nhất đạt ngưỡng ở cả bốn kỹ năng.'}
          </span>
          {failing.length > 0 && (
            <span>
              Còn thiếu:{' '}
              {failing.map((s: Skill, i) => (
                <span key={s}>
                  {i > 0 && ', '}
                  <b className="font-normal text-ink">
                    {SKILL_LABELS[s]}
                    {check.averages[s] === null ? ' (chưa có điểm)' : ` (trung bình ${check.averages[s]}%, cần ${current?.thresholds[s] ?? '—'}%)`}
                  </b>
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      {error && (
        <Alert inline>
          {error}
        </Alert>
      )}

      <Modal open={changing} title="Đổi trình độ" subtitle="Chọn trình độ mới. Mỗi lần đổi được ghi vào lịch sử học tập." onClose={() => setChanging(false)} labelledBy="level-change-title">
        <div className="flex flex-col gap-4">
          <SelectPanel
            label="Trình độ"
            value={choice}
            onChange={setChoice}
            options={[{ value: '', label: 'Chưa xếp trình độ' }, ...levels.map((l) => ({ value: String(l.id), label: `${l.code} · ${l.name}` }))]}
            block
          />
          <FormFooter>
            <Btn variant="ghost" onClick={() => setChanging(false)} disabled={pending}>
              Huỷ
            </Btn>
            <Btn variant="primary" onClick={() => apply(choice === '' ? null : Number(choice), 'manual')} disabled={pending}>
              {pending ? 'Đang lưu…' : 'Lưu trình độ'}
            </Btn>
          </FormFooter>
        </div>
      </Modal>

      <Toast message={message} />
    </Panel>
  );
}
