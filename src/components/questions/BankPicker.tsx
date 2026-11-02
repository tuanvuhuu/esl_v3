'use client';

import { useState } from 'react';
import { ITEM_TYPE_LABELS, SKILL_LABELS, type Skill } from '@/lib/assignment-scoring';
import { topicLabel } from '@/lib/vocab-topics';
import { ALL, EMPTY_FILTER, filterBank, LEVEL_OPTIONS, levelLabel, SKILL_OPTIONS, topicOptions, type BankFilter } from './bank-filters';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { ComboBox, SelectBox } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
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
      size="lg"
      title="Thêm từ ngân hàng"
      subtitle="Câu được chép vào bài. Sửa ngân hàng sau này không đổi bài đã giao."
      onClose={close}
      labelledBy="bank-picker-title"
    >
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <SelectBox label="Lọc theo trình độ" auto value={filter.level} onChange={(v) => setFilter((f) => ({ ...f, level: v }))} options={LEVEL_OPTIONS} />
            <ComboBox label="Lọc theo chủ đề" auto value={filter.topic} onChange={(v) => setFilter((f) => ({ ...f, topic: v }))} options={topicOptions(bank)} />
            <SelectBox label="Lọc theo kỹ năng" auto value={filter.skill} onChange={(v) => setFilter((f) => ({ ...f, skill: v as 'all' | Skill }))} options={SKILL_OPTIONS} />
          </div>
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
          <ul className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto pr-1">
            {shown.map((q) => {
              const isSelected = chosen.includes(q.id);
              return (
                <li key={q.id}>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)] shadow-[inset_3px_0_0_var(--primary)]'
                        : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] hover:border-[var(--borderColor-accent-emphasis)]/60 hover:bg-[var(--bgColor-muted)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(q.id)}
                      aria-label={`Chọn câu: ${snippet(q.prompt, q.audioName)}`}
                      className="mt-1 size-4 shrink-0 accent-[var(--control-checked-bgColor-rest)]"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="text-sm font-medium text-[var(--fgColor-default)] [overflow-wrap:anywhere]">
                        {snippet(q.prompt, q.audioName)}
                      </span>
                      <span className="flex flex-wrap items-center gap-2 text-xs tabular-nums text-[var(--fgColor-muted)]">
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
              );
            })}
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
