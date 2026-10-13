'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useClassDialogs } from './useClassDialogs';
import type { TeacherChoice } from './ClassForm';

// Nút Sửa và Xoá ở đầu trang chi tiết lớp. Xoá xong thì về danh sách lớp.
export function ClassDetailActions({ classId, name, studentCount, teachers, canManage }: {
  classId: number;
  name: string;
  studentCount: number;
  teachers: TeacherChoice[];
  canManage: boolean;
}) {
  const router = useRouter();
  const dlg = useClassDialogs({ teachers, onDeleted: () => router.push('/lop-hoc') });
  return (
    <>
      <button type="button" onClick={() => dlg.openEdit(classId)} disabled={!canManage} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-base font-bold text-ink disabled:opacity-40 max-[767px]:h-11">
        <Pencil className="size-4" aria-hidden />
        Sửa lớp
      </button>
      <button type="button" onClick={() => dlg.askDelete({ id: classId, name, studentCount })} disabled={!canManage} className="inline-flex h-10 items-center gap-2 rounded-xl border border-blush-ink bg-surface px-4 text-base font-bold text-blush-ink disabled:opacity-40 max-[767px]:h-11">
        <Trash2 className="size-4" aria-hidden />
        Xoá lớp
      </button>
      {dlg.dialogs}
    </>
  );
}
