'use client';

import { Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteLessonAction } from '@/app/(app)/bai-giang/actions';
import type { CampusOption, CampusScope } from '@/lib/campus';
import type { LessonRow } from '@/lib/queries/lessons';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { LessonForm } from './LessonForm';
import { MaterialsPanel } from './MaterialsPanel';

const COLUMNS: GridColumn[] = [
  { key: 'title', label: 'Bài giảng', width: 'minmax(220px,2fr)' },
  { key: 'campus', label: 'Cơ sở', width: 'minmax(160px,1.2fr)' },
  { key: 'materials', label: 'Tài liệu', width: '110px' },
  { key: 'assignments', label: 'Bài tập', width: '110px' },
  { key: 'action', label: 'Thao tác', width: '64px', align: 'end', srOnly: true },
];

// Bài giảng dùng chung cho các cơ sở đã chọn. Bấm Tài liệu để thêm liên kết hoặc tệp.
export function LessonsView({
  lessons,
  campuses,
  scope,
  canManage,
}: {
  lessons: LessonRow[];
  campuses: CampusOption[];
  scope: CampusScope;
  canManage: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [editing, setEditing] = useState<LessonRow | 'new' | null>(null);
  const [materialsId, setMaterialsId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<LessonRow | null>(null);
  const [pending, startTransition] = useTransition();

  // Mở tài liệu theo mã bài để luôn thấy danh sách mới sau khi làm mới trang
  const materialsLesson = lessons.find((l) => l.id === materialsId) ?? null;
  const campusText = (l: LessonRow) => l.campusNames.join(', ');

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteLessonAction(id);
      setToDelete(null);
      notify(r.message ?? (r.ok ? 'Đã xoá bài giảng' : 'Không xoá được'));
      router.refresh();
    });
  }

  const menuItems = (l: LessonRow): RowMenuItem[] => [
    { kind: 'action', label: 'Tài liệu', icon: Paperclip, onSelect: () => setMaterialsId(l.id) },
    { kind: 'action', label: 'Sửa', icon: Pencil, onSelect: () => setEditing(l), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài giảng' },
    { kind: 'action', label: 'Xoá', icon: Trash2, danger: true, onSelect: () => setToDelete(l), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài giảng' },
  ];

  const cell = (l: LessonRow, key: string) => {
    switch (key) {
      case 'title':
        return <span className="min-w-0 text-base font-bold text-ink [overflow-wrap:anywhere]">{l.title}</span>;
      case 'campus':
        return <span className="text-sm text-ink-2">{campusText(l)}</span>;
      case 'materials':
        return <span className="text-base text-ink">{l.materials.length} tài liệu</span>;
      case 'assignments':
        return <span className="text-base text-ink">{l.assignmentCount} bài</span>;
      case 'action':
        return <RowMenu label={`Thao tác với bài giảng ${l.title}`} items={menuItems(l)} />;
      default:
        return null;
    }
  };

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Bài giảng']}
        title="Bài giảng"
        subtitle="Bài giảng dùng chung cho các cơ sở đã chọn. Bài tập có thể gắn một bài giảng."
        actions={
          canManage && (
            <Btn variant="primary" onClick={() => setEditing('new')}>
              <Plus className="size-4" aria-hidden />
              Thêm bài giảng
            </Btn>
          )
        }
      />

      {lessons.length === 0 ? (
        <EmptyPanel
          title={scope === null ? 'Chưa có bài giảng' : 'Cơ sở này chưa có bài giảng'}
          hint={canManage ? 'Bấm Thêm bài giảng để soạn bài đầu tiên.' : 'Bài giảng do giáo viên và học vụ soạn.'}
        />
      ) : (
        // Điện thoại: thẻ của DataGrid, mỗi bài một thẻ với các nút có chữ
        <DataGrid
          label="Danh sách bài giảng"
          columns={COLUMNS}
          rows={lessons}
          rowKey={(l) => l.id}
          cell={cell}
          from="md"
          stickyEnd
          card={(l) => (
            <Card>
              <b className="text-base font-normal text-ink [overflow-wrap:anywhere]">{l.title}</b>
              <small className="block text-sm text-ink-2">
                {campusText(l)} · {l.materials.length} tài liệu · {l.assignmentCount} bài tập
              </small>
              <div className="grid grid-cols-3 gap-2">
                <Btn block onClick={() => setMaterialsId(l.id)}>
                  <Paperclip className="size-4" aria-hidden />
                  Tài liệu
                </Btn>
                <Btn block onClick={() => setEditing(l)} disabled={!canManage}>
                  <Pencil className="size-4" aria-hidden />
                  Sửa
                </Btn>
                <Btn block variant="danger" onClick={() => setToDelete(l)} disabled={!canManage}>
                  <Trash2 className="size-4" aria-hidden />
                  Xoá
                </Btn>
              </div>
            </Card>
          )}
        />
      )}

      <Toast message={message} />

      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Thêm bài giảng' : 'Sửa bài giảng'}
        subtitle="Các trường có dấu * là bắt buộc."
        onClose={() => setEditing(null)}
        labelledBy="lesson-form-title"
      >
        {editing !== null && (
          <LessonForm
            lesson={editing === 'new' ? null : editing}
            campuses={campuses}
            defaultCampusIds={scope === null ? [] : [scope]}
            onDone={(text) => {
              setEditing(null);
              notify(text);
              router.refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={materialsLesson !== null}
        title={materialsLesson ? `Tài liệu: ${materialsLesson.title}` : 'Tài liệu'}
        subtitle={materialsLesson ? `Cơ sở: ${campusText(materialsLesson)}` : undefined}
        onClose={() => setMaterialsId(null)}
        labelledBy="lesson-materials-title"
      >
        {materialsLesson && (
          <MaterialsPanel
            lesson={materialsLesson}
            canManage={canManage}
            onChanged={(text) => {
              notify(text);
              router.refresh();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá bài giảng này?"
        text={
          toDelete
            ? toDelete.assignmentCount > 0
              ? `Bài giảng "${toDelete.title}" đang có ${toDelete.assignmentCount} bài tập gắn nên chưa xoá được. Gỡ bài giảng khỏi các bài tập đó trước.`
              : `Bài giảng "${toDelete.title}" và ${toDelete.materials.length} tài liệu sẽ bị xoá. Không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xoá bài giảng"
        blocked={!!toDelete && toDelete.assignmentCount > 0}
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </section>
  );
}
