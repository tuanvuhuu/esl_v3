'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveLevelAction } from '@/app/(app)/cai-dat/level-actions';
import { SKILL_LABELS, SKILLS, type Skill } from '@/lib/assignment-scoring';
import type { LevelRow } from '@/lib/level-rule';
import { Btn } from '@/components/ui/Btn';
import { Field, inputClass } from '@/components/ui/Field';
import { Toast, useToast } from '@/components/ui/Toast';
import { Alert } from '@/components/ui/primitives';
import { Panel } from '@/components/ui/surfaces';

type Draft = { name: string; thresholds: Record<Skill, string> };

const toDraft = (l: LevelRow): Draft => ({
  name: l.name,
  thresholds: Object.fromEntries(SKILLS.map((s) => [s, l.thresholds[s] === undefined ? '' : String(l.thresholds[s])])) as Record<Skill, string>,
});

// Trình độ và ngưỡng lên lớp trong Cài đặt. Mỗi trình độ lưu riêng. Ngưỡng để trống là không có ngưỡng lên.
export function LevelSettings({ levels, canManage }: { levels: LevelRow[]; canManage: boolean }) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => Object.fromEntries(levels.map((l) => [l.id, toDraft(l)])));
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function patch(levelId: number, next: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [levelId]: { ...prev[levelId], ...next } }));
  }

  function save(levelId: number) {
    const d = drafts[levelId];
    const thresholds = Object.fromEntries(SKILLS.map((s) => [s, d.thresholds[s].trim() === '' ? null : Number(d.thresholds[s])])) as Record<Skill, number | null>;
    setPendingId(levelId);
    startTransition(async () => {
      const r = await saveLevelAction(levelId, { name: d.name, thresholds });
      setPendingId(null);
      if (!r.ok) return setErrors((prev) => ({ ...prev, [levelId]: r.message ?? 'Không lưu được' }));
      setErrors((prev) => ({ ...prev, [levelId]: '' }));
      notify(r.message ?? 'Đã lưu trình độ');
      router.refresh();
    });
  }

  return (
    <Panel title="Trình độ và ngưỡng lên lớp" className="flex flex-col gap-3 min-[1200px]:col-span-2">
      <p className="text-sm text-ink-2">Ngưỡng là điểm trung bình tối thiểu (%) của ba bài đã chấm gần nhất để được gợi ý lên trình độ kế tiếp.</p>

      {levels.map((l) => {
        const d = drafts[l.id];
        const err = errors[l.id];
        return (
          <div key={l.id} className="flex flex-col gap-3 rounded-[var(--radius-ctl)] border border-line p-3.5">
            <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-[120px_minmax(0,1fr)]">
              <Field label={`Tên trình độ ${l.code}`}>
                <input value={d.name} onChange={(e) => patch(l.id, { name: e.target.value })} disabled={!canManage} aria-label={`Tên trình độ ${l.code}`} className={inputClass()} />
              </Field>
              <div className="grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4">
                {SKILLS.map((s) => (
                  <Field key={s} label={`Ngưỡng ${SKILL_LABELS[s]} (%)`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      step={1}
                      value={d.thresholds[s]}
                      onChange={(e) => patch(l.id, { thresholds: { ...d.thresholds, [s]: e.target.value } })}
                      disabled={!canManage}
                      aria-label={`Ngưỡng ${SKILL_LABELS[s]} của trình độ ${l.code}`}
                      className={inputClass()}
                    />
                  </Field>
                ))}
              </div>
            </div>
            {err && (
              <Alert inline>
                {err}
              </Alert>
            )}
            <div className="flex justify-end">
              <Btn variant="ghost" onClick={() => save(l.id)} disabled={!canManage || pendingId === l.id}>
                {pendingId === l.id ? 'Đang lưu…' : `Lưu ${l.code}`}
              </Btn>
            </div>
          </div>
        );
      })}

      <Toast message={message} />
    </Panel>
  );
}
