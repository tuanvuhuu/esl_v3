'use client';

import { PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteQuestionAction, saveQuestionAction } from '@/app/(app)/ngan-hang-cau-hoi/actions';
import { ItemDraftCard } from '@/components/assignments/ItemDraftCard';
import { blankDraft, draftToInput, snippet, toDraft, type Draft } from '@/components/assignments/item-draft';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { ComboBox, SelectBox } from '@/components-ui';
import { Pill, Alert } from '@/components/ui/primitives';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { ITEM_TYPE_LABELS, SKILL_LABELS, type ItemType, type Skill } from '@/lib/assignment-scoring';
import { topicLabel } from '@/lib/vocab-topics';
import { EMPTY_FILTER, filterBank, LEVEL_FIELD_OPTIONS, LEVEL_OPTIONS, levelLabel, SKILL_OPTIONS, topicFieldOptions, topicOptions, TYPE_OPTIONS, type BankFilter } from './bank-filters';
import type { BankQuestion } from '@/lib/queries/question-bank';

const COLUMNS: GridColumn[] = [
  { key: 'prompt', label: 'Nội dung', width: 'minmax(220px,2.4fr)' },
  { key: 'skill', label: 'Kỹ năng', width: 'minmax(100px,0.8fr)' },
  { key: 'level', label: 'Trình độ', width: 'minmax(100px,0.8fr)' },
  { key: 'type', label: 'Loại', width: 'minmax(110px,1fr)' },
  { key: 'points', label: 'Điểm', width: 'minmax(64px,0.5fr)' },
  { key: 'usage', label: 'Dùng ở', width: 'minmax(100px,0.8fr)' },
  { key: 'action', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
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
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => openEdit(q) },
    { kind: 'action', label: 'Xoá', icon: TrashIcon, danger: true, onSelect: () => setToDelete(q) },
  ];

  const cell = (q: BankQuestion, key: string) => {
    switch (key) {
      case 'prompt':
        return (
          <span className="flex min-w-0 flex-col">
            <span className="text-base text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{snippet(q.prompt, q.audioName)}</span>
            {q.topic && <span className="text-sm text-[var(--fgColor-muted)]">{topicLabel(q.topic)}</span>}
          </span>
        );
      case 'level':
        return <span className={`text-sm ${q.level ? 'text-[var(--fgColor-default)]' : 'text-[var(--fgColor-muted)]'}`}>{q.level ? levelLabel(q.level) : ''}</span>;
      case 'skill':
        return <Pill tone="lav">{SKILL_LABELS[q.skill]}</Pill>;
      case 'type':
        return <span className="text-sm text-[var(--fgColor-muted)]">{ITEM_TYPE_LABELS[q.itemType]}</span>;
      case 'points':
        return <span className="font-mono text-sm tabular-nums text-[var(--fgColor-default)]">{q.points}</span>;
      case 'usage':
        return (
          <span className={`text-sm tabular-nums ${q.usageCount > 0 ? 'font-medium text-[var(--fgColor-default)]' : 'text-[var(--fgColor-muted)]'}`}>
            {usageText(q)}
          </span>
        );
      case 'action':
        return <RowMenu label={`Thao tác với câu ${q.id}`} items={menuItems(q)} />;
      default:
        return null;
    }
  };

  return (
    <section className="flex flex-col">
      <PageCrumbs crumbs={['Đào tạo', 'Bài tập', 'Ngân hàng câu hỏi']} />

      <DataGrid
        label="Ngân hàng câu hỏi"
        columns={COLUMNS}
        rows={shown}
        rowKey={(q) => q.id}
        cell={cell}
        from="md"
        stickyEnd
        title={
          <div className="flex items-baseline gap-2">
            <h1 className="m-0 text-base font-semibold text-[var(--fgColor-default)]">Ngân hàng câu hỏi</h1>
            <span className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-2 py-0.5 text-xs tabular-nums text-[var(--fgColor-muted)]">
              {shown.length} câu
            </span>
          </div>
        }
        actionComponent={
          <>
            {questions.length > 0 && (
              <>
                <SelectBox label="Lọc theo trình độ" auto variant="bar" value={filter.level} onChange={(v) => setFilter((f) => ({ ...f, level: v }))} options={LEVEL_OPTIONS} />
                <ComboBox label="Lọc theo chủ đề" auto variant="bar" value={filter.topic} onChange={(v) => setFilter((f) => ({ ...f, topic: v }))} options={topicOptions(questions)} />
                <SelectBox label="Lọc theo kỹ năng" auto variant="bar" value={filter.skill} onChange={(v) => setFilter((f) => ({ ...f, skill: v as 'all' | Skill }))} options={SKILL_OPTIONS} />
                <SelectBox label="Lọc theo dạng câu" auto variant="bar" value={filter.type} onChange={(v) => setFilter((f) => ({ ...f, type: v as 'all' | ItemType }))} options={TYPE_OPTIONS} />
              </>
            )}
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={openNew}>
              Thêm câu hỏi
            </Btn>
          </>
        }
        empty={
          questions.length === 0 ? (
            <EmptyPanel title="Chưa có câu hỏi trong ngân hàng" hint="Bấm Thêm câu hỏi để soạn câu đầu tiên. Câu đó sẽ dùng được ở mọi bài tập." />
          ) : (
            <EmptyPanel title="Không có câu nào khớp bộ lọc" hint="Đổi trình độ, chủ đề, kỹ năng hoặc dạng câu." />
          )
        }
        card={(q) => (
          <Card className="tsukuba-rise">
            <b className="text-base font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{snippet(q.prompt, q.audioName)}</b>
            <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums text-[var(--fgColor-muted)]">
              <Pill tone="lav">{SKILL_LABELS[q.skill]}</Pill>
              <span>
                {ITEM_TYPE_LABELS[q.itemType]} · {q.points} điểm · {usageText(q).toLowerCase()}
                {q.level ? ` · ${levelLabel(q.level)}` : ''}
                {q.topic ? ` · ${topicLabel(q.topic)}` : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Btn block leadingVisual={PencilIcon} onClick={() => openEdit(q)}>
                Sửa
              </Btn>
              <Btn block variant="danger" leadingVisual={TrashIcon} onClick={() => setToDelete(q)}>
                Xoá
              </Btn>
            </div>
          </Card>
        )}
      />

      <Modal
        open={editor !== null}
        size="xl"
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
            <FormSection
              title="Phân loại ngân hàng"
              description="Gắn trình độ và chủ đề để lọc nhanh khi tạo đề"
              grid
            >
              <Field label="Trình độ">
                <SelectBox label="Trình độ của câu" block value={meta.level} onChange={(v) => setMeta((m) => ({ ...m, level: v }))} options={LEVEL_FIELD_OPTIONS} />
              </Field>
              <Field label="Chủ đề">
                <ComboBox label="Chủ đề của câu" block value={meta.topic} onChange={(v) => setMeta((m) => ({ ...m, topic: v }))} options={topicFieldOptions(questions)} />
              </Field>
            </FormSection>
            <ItemDraftCard
              draft={editor}
              index={0}
              pending={pending}
              onChange={(update) => setEditor((prev) => (prev ? update(prev) : prev))}
              onError={setError}
            />
            <FormFooter>
              <Btn onClick={() => setEditor(null)}>
                Huỷ
              </Btn>
              <Btn variant="primary" loading={pending} disabled={pending} onClick={save}>
                {pending ? 'Đang lưu…' : 'Lưu câu hỏi'}
              </Btn>
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
