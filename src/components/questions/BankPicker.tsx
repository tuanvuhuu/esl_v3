'use client';

import { useState } from 'react';
import { ITEM_TYPE_LABELS, SKILL_LABELS, type Skill } from '@/lib/assignment-scoring';
import { topicLabel } from '@/lib/vocab-topics';
import { ALL, EMPTY_FILTER, filterBank, LEVEL_OPTIONS, levelLabel, SKILL_OPTIONS, topicOptions, type BankFilter } from './bank-filters';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Pill } from '@/components/ui/primitives';
import { snippet } from '@/components/assignments/item-draft';
import { FormFooter } from '@/components/ui/Field';
import { Notice } from '@/components/ui/surfaces';

// Chọn nhiều câu từ ngân hàng để chép vào bài. Lọc theo trình độ (mặc định trình độ của lớp), chủ đề, kỹ năng (P36.6);
// câu được chọn giữ thứ tự trong ngân hàng.
export function BankPicker({
  open,
  bank,
  levelCode = null,
  onClose,
  onAdd,
}: {
  open: boolean;
  bank: BankQuestion[];
  levelCode?: string | null;
  onClose: () => void;
  onAdd: (picked: BankQuestion[]) => void;
}) {
  const [filter, setFilter] = useState<BankFilter>(() => ({ ...EMPTY_FILTER, level: levelCode && bank.some((q) => q.level === levelCode) ? levelCode : ALL }));
  const [chosen, setChosen] = useState<number[]>([]);

  const shown = filterBank(bank, filter);
  const allShownChosen = shown.length > 0 && shown.every((q) => chosen.includes(q.id));
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
        <div className="flex flex-wrap items-center gap-2">
          <SelectPanel label="Lọc theo trình độ" auto value={filter.level} onChange={(v) => setFilter((f) => ({ ...f, level: v }))} options={LEVEL_OPTIONS} />
          <SelectPanel label="Lọc theo chủ đề" auto value={filter.topic} onChange={(v) => setFilter((f) => ({ ...f, topic: v }))} options={topicOptions(bank)} />
          <SelectPanel label="Lọc theo kỹ năng" auto value={filter.skill} onChange={(v) => setFilter((f) => ({ ...f, skill: v as 'all' | Skill }))} options={SKILL_OPTIONS} />
          {shown.length > 0 && (
            <Btn
              onClick={() => setChosen((prev) => (allShownChosen ? prev.filter((id) => !shown.some((q) => q.id === id)) : [...new Set([...prev, ...shown.map((q) => q.id)])]))}
            >
              {allShownChosen ? 'Bỏ chọn tất cả' : `Chọn tất cả (${shown.length})`}
            </Btn>
          )}
        </div>

        {shown.length === 0 ? (
          <Notice>
            {bank.length === 0 ? 'Ngân hàng chưa có câu hỏi. Thêm câu ở trang Ngân hàng câu hỏi.' : 'Không có câu nào khớp bộ lọc.'}
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
                        {q.level ? ` · ${levelLabel(q.level)}` : ''}
                        {q.topic ? ` · ${topicLabel(q.topic)}` : ''}
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
