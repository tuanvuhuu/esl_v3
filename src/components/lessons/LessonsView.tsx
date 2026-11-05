'use client';

import { BookIcon, PaperclipIcon, PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteLessonAction } from '@/app/(app)/bai-giang/actions';
import type { CampusOption, CampusScope } from '@/lib/campus';
import type { LessonRow } from '@/lib/queries/lessons';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { Modal } from '@/components/ui/Modal';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { Pill } from '@/components/ui/primitives';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Card, EmptyPanel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { LessonForm } from './LessonForm';
import { MaterialsPanel } from './MaterialsPanel';

type LessonSegment = 'all' | 'with-materials' | 'assigned';

const COLUMNS: GridColumn<LessonRow>[] = [
  { key: 'title', label: 'Bài giảng & mục tiêu', width: 'minmax(280px,2.5fr)', sortValue: (l) => l.title },
  { key: 'campus', label: 'Cơ sở áp dụng', width: 'minmax(180px,1.4fr)', sortValue: (l) => l.campusNames.join(', ') },
  { key: 'resources', label: 'Tài liệu & bài tập', width: '232px', sortValue: (l) => l.materials.length + l.assignmentCount },
  { key: 'action', label: 'Thao tác', width: '44px', align: 'end', srOnly: true },
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
  const [segment, setSegment] = useState<LessonSegment>('all');
  const [editing, setEditing] = useState<LessonRow | 'new' | null>(null);
  const [materialsId, setMaterialsId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<LessonRow | null>(null);
  const [pending, startTransition] = useTransition();

  const shownLessons = lessons.filter((l) => {
    if (segment === 'with-materials') return l.materials.length > 0;
    if (segment === 'assigned') return l.assignmentCount > 0;
    return true;
  });

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
    { kind: 'action', label: 'Tài liệu', icon: PaperclipIcon, onSelect: () => setMaterialsId(l.id) },
    { kind: 'action', label: 'Sửa', icon: PencilIcon, onSelect: () => setEditing(l), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài giảng' },
    { kind: 'action', label: 'Xoá', icon: TrashIcon, danger: true, onSelect: () => setToDelete(l), disabled: !canManage, disabledHint: 'Không có quyền quản lý bài giảng' },
  ];

  const cell = (l: LessonRow, key: string) => {
    switch (key) {
      case 'title':
        return (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-[6px] border border-[var(--borderColor-accent-muted)] bg-[var(--primary-soft)] text-[var(--primary-deep)]"
            >
              <BookIcon size={13} />
            </span>
            <div className="min-w-0">
              <span className="block min-w-0 text-[13.5px] font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">
                {l.title}
              </span>
              {l.objectives && (
                <span className="mt-0.5 block truncate text-xs text-[var(--fgColor-muted)]">{l.objectives}</span>
              )}
            </div>
          </div>
        );
      case 'campus':
        return (
          <div className="flex flex-wrap gap-1">
            {l.campusNames.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded-[5px] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-1.5 py-0.5 text-[11.5px] font-medium text-[var(--ink-2)]"
              >
                {name}
              </span>
            ))}
          </div>
        );
      case 'resources':
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-link="true"
              onClick={() => setMaterialsId(l.id)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-[5px] border border-[var(--borderColor-default)] bg-[#f8fafc] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--ink-2)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-deep)] dark:bg-[var(--bgColor-muted)]"
            >
              <PaperclipIcon size={12} aria-hidden />
              <span>{l.materials.length} tài liệu</span>
            </button>
            <Pill tone={l.assignmentCount > 0 ? 'mint' : 'stone'}>{l.assignmentCount} bài tập</Pill>
          </div>
        );
      case 'action':
        return <RowMenu label={`Thao tác với bài giảng ${l.title}`} items={menuItems(l)} />;
      default:
        return null;
    }
  };

  return (
    <section className="flex flex-col">
      <PageCrumbs crumbs={['Đào tạo', 'Bài giảng']} />

      <DataGrid
        label="Danh sách bài giảng"
        columns={COLUMNS}
        rows={shownLessons}
        rowKey={(l) => l.id}
        cell={cell}
        from="md"
        fill
        stickyEnd
        searchEnable
        title={
          <ChipGroup label="Lọc bài giảng">
            <Chip selected={segment === 'all'} count={lessons.length} onClick={() => setSegment('all')}>
              Tất cả
            </Chip>
            <Chip
              selected={segment === 'with-materials'}
              count={lessons.filter((l) => l.materials.length > 0).length}
              onClick={() => setSegment('with-materials')}
            >
              Có tài liệu
            </Chip>
            <Chip
              selected={segment === 'assigned'}
              count={lessons.filter((l) => l.assignmentCount > 0).length}
              onClick={() => setSegment('assigned')}
            >
              Đã gắn bài tập
            </Chip>
          </ChipGroup>
        }
        actionComponent={
          canManage && (
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setEditing('new')}>
              Thêm bài giảng
            </Btn>
          )
        }
        empty={
          <EmptyPanel
            title={scope === null ? 'Chưa có bài giảng' : 'Cơ sở này chưa có bài giảng'}
            hint={canManage ? 'Bấm Thêm bài giảng để soạn bài đầu tiên.' : 'Bài giảng do giáo viên và học vụ soạn.'}
          />
        }
        card={(l) => (
          <Card className="tsukuba-rise">
            <div className="min-w-0">
              <b className="block text-base font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{l.title}</b>
              <small className="mt-0.5 block text-xs tabular-nums text-[var(--fgColor-muted)]">
                {campusText(l)} · {l.materials.length} tài liệu · {l.assignmentCount} bài tập
              </small>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Btn block leadingVisual={PaperclipIcon} onClick={() => setMaterialsId(l.id)}>
                Tài liệu
              </Btn>
              <Btn block leadingVisual={PencilIcon} onClick={() => setEditing(l)} disabled={!canManage}>
                Sửa
              </Btn>
              <Btn block variant="danger" leadingVisual={TrashIcon} onClick={() => setToDelete(l)} disabled={!canManage}>
                Xoá
              </Btn>
            </div>
          </Card>
        )}
      />

      <Toast message={message} />

      <Modal
        open={editing !== null}
        size="lg"
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
        size="lg"
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
