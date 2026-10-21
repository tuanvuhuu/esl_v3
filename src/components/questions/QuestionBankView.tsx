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
import { ITEM_TYPE_LABELS, SKILL_LABELS, type ItemType, type Skill } from '@/lib/assignment-scoring';
import { Field } from '@/components/ui/Field';
import { topicLabel } from '@/lib/vocab-topics';
import { EMPTY_FILTER, filterBank, LEVEL_FIELD_OPTIONS, LEVEL_OPTIONS, levelLabel, SKILL_OPTIONS, topicFieldOptions, topicOptions, TYPE_OPTIONS, type BankFilter } from './bank-filters';
import type { BankQuestion } from '@/lib/queries/question-bank';

const COLUMNS: GridColumn[] = [
  { key: 'prompt', label: 'Nội dung', width: 'minmax(220px,2.4fr)' },
  { key: 'skill', label: 'Kỹ năng', width: 'minmax(110px,0.8fr)' },
  { key: 'level', label: 'Trình độ', width: 'minmax(110px,0.8fr)' },
  { key: 'type', label: 'Loại', width: 'minmax(120px,1fr)' },
  { key: 'points', label: 'Điểm', width: '80px' },
  { key: 'usage', label: 'Dùng ở', width: 'minmax(110px,1fr)' },
  { key: 'action', label: 'Thao tác', width: '64px', align: 'end', srOnly: true },
];

// Ngân hàng câu hỏi: danh sách có lọc theo kỹ năng, trình độ, chủ đề, dạng câu (P36.6); thêm, sửa, xoá. Bảng trên web, thẻ trên điện thoại.
export function QuestionBankView({ questions }: { questions: BankQuestion[] }) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [filter, setFilter] = useState<BankFilter>(EMPTY_FILTER);
  const [editor, setEditor] = useState<Draft | null>(null);
  const [meta, setMeta] = useState({ level: '', topic: '' });
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<BankQuestion | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = filterBank(questions, filter);
  const usageText = (q: BankQuestion) => (q.usageCount > 0 ? `${q.usageCount} bài` : 'Chưa dùng');

  function openNew() {
    setError(null);
    setMeta({ level: filter.level === 'all' || filter.level === '__none__' ? '' : filter.level, topic: filter.topic === 'all' || filter.topic === '__none__' ? '' : filter.topic });
    setEditor(blankDraft());
  }

  function openEdit(q: BankQuestion) {
    setError(null);
    setMeta({ level: q.level, topic: q.topic });
    setEditor(toDraft(q, null));
  }

  function save() {
    if (!editor) return;
    const payload = draftToInput(editor);
    startTransition(async () => {
      const r = await saveQuestionAction(payload, meta);
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
        return (
          <span className="flex min-w-0 flex-col">
            <span className="text-base text-ink [overflow-wrap:anywhere]">{snippet(q.prompt, q.audioName)}</span>
            {q.topic && <span className="text-sm text-muted">{topicLabel(q.topic)}</span>}
          </span>
        );
      case 'level':
        return <span className={`text-sm ${q.level ? 'text-ink-2' : 'text-muted'}`}>{q.level ? levelLabel(q.level) : ''}</span>;
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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SelectPanel label="Lọc theo trình độ" auto value={filter.level} onChange={(v) => setFilter((f) => ({ ...f, level: v }))} options={LEVEL_OPTIONS} />
            <SelectPanel label="Lọc theo chủ đề" auto value={filter.topic} onChange={(v) => setFilter((f) => ({ ...f, topic: v }))} options={topicOptions(questions)} />
            <SelectPanel label="Lọc theo kỹ năng" auto value={filter.skill} onChange={(v) => setFilter((f) => ({ ...f, skill: v as 'all' | Skill }))} options={SKILL_OPTIONS} />
            <SelectPanel label="Lọc theo dạng câu" auto value={filter.type} onChange={(v) => setFilter((f) => ({ ...f, type: v as 'all' | ItemType }))} options={TYPE_OPTIONS} />
            <span className="text-sm text-muted">{shown.length} câu</span>
          </div>

          {shown.length === 0 ? (
            <EmptyPanel title="Không có câu nào khớp bộ lọc" hint="Đổi trình độ, chủ đề, kỹ năng hoặc dạng câu." />
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
                      {q.level ? ` · ${levelLabel(q.level)}` : ''}
                      {q.topic ? ` · ${topicLabel(q.topic)}` : ''}
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
            <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2">
              <Field label="Trình độ">
                <SelectPanel label="Trình độ của câu" block value={meta.level} onChange={(v) => setMeta((m) => ({ ...m, level: v }))} options={LEVEL_FIELD_OPTIONS} />
              </Field>
              <Field label="Chủ đề">
                <SelectPanel label="Chủ đề của câu" block value={meta.topic} onChange={(v) => setMeta((m) => ({ ...m, topic: v }))} options={topicFieldOptions(questions)} />
              </Field>
            </div>
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
