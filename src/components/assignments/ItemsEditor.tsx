'use client';

import { Library, Plus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveAssignmentItemsAction } from '@/app/(app)/bai-tap/question-actions';
import type { AssignmentItem } from '@/lib/queries/assignment-items';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { Btn } from '@/components/ui/Btn';
import { FORM_BTN_CANCEL, FORM_BTN_SUBMIT, FormFooter } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { BankPicker } from '@/components/questions/BankPicker';
import { blankDraft, draftFromBank, draftToInput, toDraft, type Draft } from './item-draft';
import { ItemDraftCard } from './ItemDraftCard';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';

// Hộp thoại soạn câu hỏi của bài tập: thêm, sửa, sắp xếp, xoá câu, chép câu từ ngân hàng.
export function ItemsEditor({
  assignmentId,
  initial,
  bank,
  open,
  onClose,
  onDone,
}: {
  assignmentId: number;
  initial: AssignmentItem[];
  bank: BankQuestion[];
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>(() => initial.map((i) => toDraft(i, i.bankQuestionId)));
  const [picking, setPicking] = useState(false);
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

  return (
    <Modal open={open} title="Câu hỏi của bài tập" subtitle="Mỗi câu có kỹ năng, loại và điểm. Điểm tối đa của bài là tổng điểm các câu." onClose={onClose} labelledBy="items-editor-title">
      <div className="flex flex-col gap-4">
        {error && (
          <Alert>
            {error}
          </Alert>
        )}

        {drafts.length === 0 && (
          <Notice>Bài chưa có câu hỏi. Thêm câu đầu tiên bên dưới.</Notice>
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

        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={() => setDrafts((prev) => [...prev, blankDraft()])}>
            <Plus className="size-4" aria-hidden />
            Thêm câu
          </Btn>
          <Btn variant="ghost" onClick={() => setPicking(true)} disabled={bank.length === 0}>
            <Library className="size-4" aria-hidden />
            Thêm từ ngân hàng
          </Btn>
        </div>

        <FormFooter>
          <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>
            Huỷ
          </button>
          <button type="button" onClick={save} disabled={pending} className={FORM_BTN_SUBMIT}>
            {pending ? 'Đang lưu…' : 'Lưu câu hỏi'}
          </button>
        </FormFooter>
      </div>

      <BankPicker
        open={picking}
        bank={bank}
        onClose={() => setPicking(false)}
        onAdd={(picked) => {
          setDrafts((prev) => [...prev, ...picked.map(draftFromBank)]);
          setPicking(false);
        }}
      />
    </Modal>
  );
}
