'use client';

import { CheckCircleIcon, PencilIcon } from '@primer/octicons-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setStudentLevelAction } from '@/app/(app)/hoc-sinh/level-actions';
import { SKILL_LABELS, type Skill } from '@/lib/assignment-scoring';
import type { LevelCheck, LevelRow } from '@/lib/level-rule';
import { SelectBox } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Pill, Alert } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { Callout, Panel } from '@/components/ui/surfaces';

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
    <Panel
      title="Trình độ"
      action={
        canManage ? (
          <Btn variant="ghost" leadingVisual={PencilIcon} onClick={() => setChanging(true)} disabled={pending}>
            Đổi trình độ
          </Btn>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/60 px-3.5 py-2.5">
          <span className="text-sm text-[var(--fgColor-muted)]">Trình độ hiện tại</span>
          {current ? <Pill tone="lav">{current.code} · {current.name}</Pill> : <Pill tone="stone">Chưa xếp</Pill>}
        </div>

        {next && check?.ready && (
          <div className="flex flex-col gap-2.5 rounded-[var(--borderRadius-medium)] border border-mint-ink/25 bg-mint px-3.5 py-3 text-mint-ink">
            <div className="flex items-center gap-1.5">
              <CheckCircleIcon size={16} className="shrink-0" aria-hidden />
              <b className="text-sm font-semibold">Đủ điều kiện lên {next.code} ({next.name})</b>
            </div>
            <span className="text-sm">Ba bài đã chấm gần nhất đạt ngưỡng ở cả bốn kỹ năng. Giáo viên xác nhận thì mới đổi trình độ.</span>
            <div>
              <Btn variant="primary" loading={pending} onClick={() => apply(next.id, 'suggestion')} disabled={!canManage || pending}>
                Xác nhận lên {next.code}
              </Btn>
            </div>
          </div>
        )}

        {next && check && !check.ready && (
          <div className="flex flex-col gap-1 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-3.5 py-2.5 text-sm text-[var(--fgColor-muted)]">
            <span>
              Chưa đủ để lên <b className="font-mono font-semibold text-[var(--fgColor-default)]">{next.code}</b>.{' '}
              {check.assignments < 3
                ? `Mới có ${check.assignments}/3 bài đã chấm có câu hỏi.`
                : 'Cần ba bài gần nhất đạt ngưỡng ở cả bốn kỹ năng.'}
            </span>
            {failing.length > 0 && (
              <span className="tabular-nums">
                Còn thiếu:{' '}
                {failing.map((s: Skill, i) => (
                  <span key={s}>
                    {i > 0 && ', '}
                    <b className="font-medium text-[var(--fgColor-default)]">
                      {SKILL_LABELS[s]}
                      {check.averages[s] === null ? ' (chưa có điểm)' : ` (trung bình ${check.averages[s]}%, cần ${current?.thresholds[s] ?? '—'}%)`}
                    </b>
                  </span>
                ))}
              </span>
            )}
          </div>
        )}

        {error && <Alert inline>{error}</Alert>}

        <Modal
          open={changing}
          size="md"
          title="Đổi trình độ"
          subtitle="Chọn trình độ CEFR mới cho học sinh. Lịch sử thay đổi được ghi nhận tự động."
          onClose={() => {
            setError(null);
            setChanging(false);
          }}
          labelledBy="level-change-title"
        >
          <div className="flex flex-col gap-3.5">
            {current && (
              <Callout tone="info">
                Đang xếp ở trình độ <b className="font-semibold">{current.code} · {current.name}</b>.
              </Callout>
            )}

            <FormSection title="Trình độ học tập" description="Áp dụng theo khung tham chiếu ngôn ngữ Châu Âu (CEFR)." grid={false}>
              <Field label="Trình độ CEFR">
                <SelectBox
                  label="Trình độ"
                  value={choice}
                  onChange={setChoice}
                  options={[
                    { value: '', label: 'Chưa xếp trình độ' },
                    ...levels.map((l) => ({ value: String(l.id), label: `${l.code} · ${l.name}` })),
                  ]}
                  block
                />
              </Field>
            </FormSection>

            {error && <Alert>{error}</Alert>}

            <FormFooter>
              <Btn
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setChanging(false);
                }}
                disabled={pending}
              >
                Huỷ
              </Btn>
              <Btn variant="primary" loading={pending} onClick={() => apply(choice === '' ? null : Number(choice), 'manual')} disabled={pending}>
                {pending ? 'Đang lưu…' : 'Lưu trình độ'}
              </Btn>
            </FormFooter>
          </div>
        </Modal>

        <Toast message={message} />
      </div>
    </Panel>
  );
}
