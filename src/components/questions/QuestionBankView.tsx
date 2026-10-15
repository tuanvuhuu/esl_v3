'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteQuestionAction, saveQuestionAction } from '@/app/(app)/ngan-hang-cau-hoi/actions';
import { ItemDraftCard } from '@/components/assignments/ItemDraftCard';
import { blankDraft, draftToInput, snippet, toDraft, type Draft } from '@/components/assignments/item-draft';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { FORM_BTN_CANCEL, FORM_BTN_SUBMIT, FormFooter } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Pill, Alert } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { ITEM_TYPE_LABELS, SKILL_LABELS, SKILLS, type Skill } from '@/lib/assignment-scoring';
import type { BankQuestion } from '@/lib/queries/question-bank';

const COLUMNS: GridColumn[] = [
  { key: 'prompt', label: 'Nội dung', width: 'minmax(220px,2.4fr)' },
  { key: 'skill', label: 'Kỹ năng', width: 'minmax(110px,0.8fr)' },
  { key: 'type', label: 'Loại', width: 'minmax(120px,1fr)' },
  { key: 'points', label: 'Điểm', width: '80px' },
  { key: 'usage', label: 'Dùng ở', width: 'minmax(110px,1fr)' },
  { key: 'action', label: 'Thao tác', width: '64px', align: 'end', srOnly: true },
];

// Ngân hàng câu hỏi: danh sách có lọc theo kỹ năng, thêm, sửa, xoá. Bảng trên web, thẻ trên điện thoại.
export function QuestionBankView({ questions }: { questions: BankQuestion[] }) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [skill, setSkill] = useState<'all' | Skill>('all');
  const [editor, setEditor] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BankQuestion | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = skill === 'all' ? questions : questions.filter((q) => q.skill === skill);
  const usageText = (q: BankQuestion) => (q.usageCount > 0 ? `${q.usageCount} bài` : 'Chưa dùng');

  function openNew() {
    setError(null);
    setEditor(blankDraft());
  }

  function openEdit(q: BankQuestion) {
    setError(null);
    setEditor(toDraft(q, null));
  }

  function save() {
    if (!editor) return;
    const payload = draftToInput(editor);
    startTransition(async () => {
      const r = await saveQuestionAction(payload);
      if (!r.ok) return setError(r.message ?? 'Không lưu được');
      setEditor(null);
      notify(r.message ?? 'Đã lưu câu hỏi');
      router.refresh();
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteQuestionAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá câu hỏi' : 'Không xoá được'));
      router.refresh();
    });
  }

  const menuItems = (q: BankQuestion): RowMenuItem[] => [
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => openEdit(q) },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(q) },
  ];

  const cell = (q: BankQuestion, key: string) => {
    switch (key) {
      case 'prompt':
        return <span className="min-w-0 text-base text-ink [overflow-wrap:anywhere]">{snippet(q.prompt, q.audioName)}</span>;
      case 'skill':
        return <Pill tone="lav">{SKILL_LABELS[q.skill]}</Pill>;
      case 'type':
        return <span className="text-sm text-ink-2">{ITEM_TYPE_LABELS[q.itemType]}</span>;
      case 'points':
        return <span className="text-base text-ink">{q.points}</span>;
      case 'usage':
        return <span className={`text-sm ${q.usageCount > 0 ? 'text-ink' : 'text-muted'}`}>{usageText(q)}</span>;
      case 'action':
        return <RowMenu label={`Thao tác với câu ${q.id}`} items={menuItems(q)} />;
      default:
        return null;
    }
  };

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Bài tập', 'Ngân hàng câu hỏi']}
        title="Ngân hàng câu hỏi"
        subtitle="Câu hỏi dùng chung toàn trung tâm. Thêm vào bài thì chép nội dung, nên sửa ở đây không đổi bài đã giao."
        actions={
          <Btn variant="primary" onClick={openNew}>
            <Plus className="size-4" aria-hidden />
            Thêm câu hỏi
          </Btn>
        }
      />

      {questions.length === 0 ? (
        <EmptyPanel title="Chưa có câu hỏi trong ngân hàng" hint="Bấm Thêm câu hỏi để soạn câu đầu tiên. Câu đó sẽ dùng được ở mọi bài tập." />
      ) : (
        <>
          <div className="mb-4">
            <SelectPanel
              label="Lọc theo kỹ năng"
              auto
              value={skill}
              onChange={(v) => setSkill(v as 'all' | Skill)}
              options={[{ value: 'all', label: 'Tất cả kỹ năng' }, ...SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))]}
            />
          </div>

          {shown.length === 0 ? (
            <EmptyPanel title="Không có câu nào thuộc kỹ năng này" />
          ) : (
            // Điện thoại: thẻ của DataGrid, mỗi câu một thẻ với hai nút có chữ
            <DataGrid
              label="Ngân hàng câu hỏi"
              columns={COLUMNS}
              rows={shown}
              rowKey={(q) => q.id}
              cell={cell}
              from="md"
              stickyEnd
              card={(q) => (
                <Card>
                  <b className="text-base font-normal text-ink [overflow-wrap:anywhere]">{snippet(q.prompt, q.audioName)}</b>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                    <Pill tone="lav">{SKILL_LABELS[q.skill]}</Pill>
                    <span>
                      {ITEM_TYPE_LABELS[q.itemType]} · {q.points} điểm · {usageText(q).toLowerCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Btn block onClick={() => openEdit(q)}>
                      <Pencil className="size-4" aria-hidden />
                      Sửa
                    </Btn>
                    <Btn block variant="danger" onClick={() => setToDelete(q)}>
                      <Trash2 className="size-4" aria-hidden />
                      Xoá
                    </Btn>
                  </div>
                </Card>
              )}
            />
          )}
        </>
      )}

      <Modal
        open={editor !== null}
        title={editor?.id ? 'Sửa câu hỏi trong ngân hàng' : 'Thêm câu hỏi vào ngân hàng'}
        subtitle="Câu dùng chung toàn trung tâm. Bài đã chép câu này không đổi."
        onClose={() => setEditor(null)}
        labelledBy="question-editor-title"
      >
        {editor && (
          <div className="flex flex-col gap-4">
            {error && (
              <Alert>
                {error}
              </Alert>
            )}
            <ItemDraftCard
              draft={editor}
              index={0}
              pending={pending}
              onChange={(update) => setEditor((prev) => (prev ? update(prev) : prev))}
              onError={setError}
            />
            <FormFooter>
              <button type="button" onClick={() => setEditor(null)} className={FORM_BTN_CANCEL}>
                Huỷ
              </button>
              <button type="button" onClick={save} disabled={pending} className={FORM_BTN_SUBMIT}>
                {pending ? 'Đang lưu…' : 'Lưu câu hỏi'}
              </button>
            </FormFooter>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá câu hỏi khỏi ngân hàng?"
        text={
          toDelete
            ? toDelete.usageCount > 0
              ? `Câu này đang dùng ở ${toDelete.usageCount} bài. Các bài đó giữ nội dung đã chép nên không bị ảnh hưởng. Không thể hoàn tác.`
              : 'Câu này chưa dùng ở bài nào. Không thể hoàn tác.'
            : ''
        }
        confirmLabel="Xoá câu hỏi"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <Toast message={message} />
    </section>
  );
}
