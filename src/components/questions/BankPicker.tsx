'use client';

import { useState } from 'react';
import { ITEM_TYPE_LABELS, SKILL_LABELS, SKILLS, type Skill } from '@/lib/assignment-scoring';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Pill } from '@/components/ui/primitives';
import { snippet } from '@/components/assignments/item-draft';
import { FormFooter } from '@/components/ui/Field';
import { Notice } from '@/components/ui/surfaces';

// Chọn nhiều câu từ ngân hàng để chép vào bài. Lọc theo kỹ năng; câu được chọn giữ thứ tự trong ngân hàng.
export function BankPicker({
  open,
  bank,
  onClose,
  onAdd,
}: {
  open: boolean;
  bank: BankQuestion[];
  onClose: () => void;
  onAdd: (picked: BankQuestion[]) => void;
}) {
  const [skill, setSkill] = useState<'all' | Skill>('all');
  const [chosen, setChosen] = useState<number[]>([]);

  const shown = bank.filter((q) => skill === 'all' || q.skill === skill);
  const picked = bank.filter((q) => chosen.includes(q.id));

  function toggle(id: number) {
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function close() {
    setChosen([]);
    onClose();
  }

  return (
    <Modal
      open={open}
      title="Thêm từ ngân hàng"
      subtitle="Câu được chép vào bài. Sửa ngân hàng sau này không đổi bài đã giao."
      onClose={close}
      labelledBy="bank-picker-title"
    >
      <div className="flex flex-col gap-3">
        <SelectPanel
          label="Lọc theo kỹ năng"
          auto
          value={skill}
          onChange={(v) => setSkill(v as 'all' | Skill)}
          options={[{ value: 'all', label: 'Tất cả kỹ năng' }, ...SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))]}
        />

        {shown.length === 0 ? (
          <Notice>
            {bank.length === 0 ? 'Ngân hàng chưa có câu hỏi. Thêm câu ở trang Ngân hàng câu hỏi.' : 'Không có câu nào thuộc kỹ năng này.'}
          </Notice>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pr-1">
            {shown.map((q) => (
              <li key={q.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-ctl)] border border-line px-3 py-2.5 hover:bg-stone">
                  <input
                    type="checkbox"
                    checked={chosen.includes(q.id)}
                    onChange={() => toggle(q.id)}
                    aria-label={`Chọn câu: ${snippet(q.prompt, q.audioName)}`}
                    className="mt-1 size-4 shrink-0 accent-[var(--primary-deep)]"
                  />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-base text-ink [overflow-wrap:anywhere]">{snippet(q.prompt, q.audioName)}</span>
                    <span className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                      <Pill tone="lav">{SKILL_LABELS[q.skill]}</Pill>
                      <span>
                        {ITEM_TYPE_LABELS[q.itemType]} · {q.points} điểm
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <FormFooter>
          <Btn variant="ghost" onClick={close}>
            Huỷ
          </Btn>
          <Btn
            variant="primary"
            disabled={picked.length === 0}
            onClick={() => {
              onAdd(picked);
              setChosen([]);
            }}
          >
            Chép vào bài ({picked.length})
          </Btn>
        </FormFooter>
      </div>
    </Modal>
  );
}
