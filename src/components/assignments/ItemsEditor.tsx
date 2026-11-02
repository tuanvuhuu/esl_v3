'use client';

import { LibraryIcon, PlusIcon, ZapIcon } from '@primer/octicons-react';
import { useState, useTransition } from 'react';
import { saveAssignmentItemsAction } from '@/app/(app)/bai-tap/question-actions';
import type { AssignmentItem } from '@/lib/queries/assignment-items';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { Btn } from '@/components/ui/Btn';
import { FormFooter } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { BankPicker } from '@/components/questions/BankPicker';
import { blankDraft, criteriaTotal, draftFromBank, draftFromInput, draftToInput, toDraft, type Draft } from './item-draft';
import { QuickCompose } from './QuickCompose';
import { ItemDraftCard } from './ItemDraftCard';
import { Alert, Pill } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';

// Hộp thoại soạn câu hỏi của bài tập: thêm, sửa, sắp xếp, xoá câu, chép câu từ ngân hàng, Soạn nhanh (P36).
// Khi mở Soạn nhanh thì tạm ẩn hộp này (không lồng hai hộp thoại); bản nháp vẫn giữ vì state nằm ở component này.
export function ItemsEditor({
  assignmentId,
  initial,
  bank,
  levelCode,
  open,
  onClose,
  onDone,
}: {
  assignmentId: number;
  levelCode: string | null; // trình độ của lớp, để Soạn nhanh chỉnh độ khó
  initial: AssignmentItem[];
  bank: BankQuestion[];
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => initial.map((i) => toDraft(i, i.bankQuestionId)));
  const [picking, setPicking] = useState(false);
  const [quick, setQuick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateDraft(key: string, update: (d: Draft) => Draft) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? update(d) : d)));
  }

  function move(index: number, dir: -1 | 1) {
    setDrafts((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function save() {
    const payload = drafts.map(draftToInput);
    startTransition(async () => {
      const r = await saveAssignmentItemsAction(assignmentId, payload);
      if (!r.ok) return setError(r.message ?? 'Không lưu được');
      setError(null);
      onDone(r.message ?? 'Đã lưu câu hỏi');
    });
  }

  const totalPoints = drafts.reduce((sum, d) => sum + (d.criteria.length > 0 ? criteriaTotal(d) : Number(d.points) || 0), 0);

  return (
    <>
      <Modal
        size="xl"
        open={open && !quick}
        title="Câu hỏi của bài tập"
        subtitle="Mỗi câu có kỹ năng, loại và điểm. Điểm tối đa của bài là tổng điểm các câu."
        onClose={onClose}
        labelledBy="items-editor-title"
      >
        <div className="flex flex-col gap-3.5">
          {error && <Alert>{error}</Alert>}

          {drafts.length === 0 ? (
            <Notice>Bài chưa có câu hỏi. Thêm câu đầu tiên bên dưới.</Notice>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-4 border-l-[var(--primary)] bg-[var(--bgColor-muted)] px-3.5 py-2.5 text-xs text-[var(--fgColor-muted)]">
              <div className="flex flex-wrap items-center gap-3 tabular-nums">
                <span>
                  Tổng số câu <b className="font-semibold text-[var(--fgColor-default)]">{drafts.length}</b>
                </span>
                <span>·</span>
                <span>
                  Tổng điểm <b className="font-semibold text-[var(--primary-deep)]">{totalPoints}</b>
                </span>
              </div>
              {levelCode && <Pill tone="lav">Trình độ {levelCode}</Pill>}
            </div>
          )}

          {drafts.map((d, index) => (
            <ItemDraftCard
              key={d.key}
              draft={d}
              index={index}
              pending={pending}
              onChange={(update) => updateDraft(d.key, update)}
              onError={setError}
              onMove={(dir) => move(index, dir)}
              onRemove={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
              canMoveUp={index > 0}
              canMoveDown={index < drafts.length - 1}
            />
          ))}

          <div className="flex flex-wrap items-center gap-2 rounded-[var(--borderRadius-large)] border border-dashed border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/50 p-3">
            <Btn variant="primary" leadingVisual={ZapIcon} onClick={() => setQuick(true)}>
              Soạn nhanh
            </Btn>
            <Btn variant="ghost" leadingVisual={PlusIcon} onClick={() => setDrafts((prev) => [...prev, blankDraft()])}>
              Thêm câu
            </Btn>
            <Btn variant="ghost" leadingVisual={LibraryIcon} onClick={() => setPicking(true)} disabled={bank.length === 0}>
              Thêm từ ngân hàng
            </Btn>
          </div>

          <FormFooter>
            <Btn onClick={onClose}>Huỷ</Btn>
            <Btn variant="primary" onClick={save} disabled={pending}>
              {pending ? 'Đang lưu…' : 'Lưu câu hỏi'}
            </Btn>
          </FormFooter>
        </div>

        <BankPicker
          open={picking}
          bank={bank}
          levelCode={levelCode}
          onClose={() => setPicking(false)}
          onAdd={(picked) => {
            setDrafts((prev) => [...prev, ...picked.map(draftFromBank)]);
            setPicking(false);
          }}
        />
      </Modal>
      {open && quick && (
        <QuickCompose
          open
          levelCode={levelCode}
          onClose={() => setQuick(false)}
          onAdd={(items) => {
            setDrafts((prev) => [...prev, ...items.map(draftFromInput)]);
            setQuick(false);
          }}
        />
      )}
    </>
  );
}
