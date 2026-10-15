'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Btn } from '@/components/ui/Btn';
import { useClassDialogs } from './useClassDialogs';
import type { CampusChoice, TeacherChoice } from './ClassForm';

// Nút Sửa và Xoá ở đầu trang chi tiết lớp. Xoá xong thì về danh sách lớp.
export function ClassDetailActions({ classId, name, studentCount, teachers, campuses, defaultCampusId, canManage }: {
  classId: number;
  name: string;
  studentCount: number;
  teachers: TeacherChoice[];
  campuses: CampusChoice[];
  defaultCampusId: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const dlg = useClassDialogs({ teachers, campuses, defaultCampusId, onDeleted: () => router.push('/lop-hoc') });
  return (
    <>
      <Btn onClick={() => dlg.openEdit(classId)} disabled={!canManage}>
        <Pencil className="size-4" aria-hidden />
        Sửa lớp
      </Btn>
      <Btn variant="danger" onClick={() => dlg.askDelete({ id: classId, name, studentCount })} disabled={!canManage}>
        <Trash2 className="size-4" aria-hidden />
        Xoá lớp
      </Btn>
      {dlg.dialogs}
    </>
  );
}
