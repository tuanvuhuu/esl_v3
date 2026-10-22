'use client';

import { CalendarClock, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Btn } from '@/components/ui/Btn';
import { useClassDialogs } from './useClassDialogs';
import type { CampusChoice, LevelChoice, TeacherChoice } from './ClassForm';

// Nút Sửa, Xếp lại lịch và Xoá ở đầu trang chi tiết lớp. Xoá xong thì về danh sách lớp.
export function ClassDetailActions({ classId, name, studentCount, teachers, campuses, levels, defaultCampusId, canManage }: {
  classId: number;
  name: string;
  studentCount: number;
  teachers: TeacherChoice[];
  campuses: CampusChoice[];
  levels?: LevelChoice[];
  defaultCampusId: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const dlg = useClassDialogs({ teachers, campuses, levels, defaultCampusId, onDeleted: () => router.push('/lop-hoc') });
  return (
    <>
      <Btn onClick={() => dlg.openEdit(classId)} disabled={!canManage}>
        <Pencil className="size-4" aria-hidden />
        Sửa lớp
      </Btn>
      <Btn onClick={() => dlg.openReschedule(classId)} disabled={!canManage}>
        <CalendarClock className="size-4" aria-hidden />
        Xếp lại lịch
      </Btn>
      <Btn variant="danger" onClick={() => dlg.askDelete({ id: classId, name, studentCount })} disabled={!canManage}>
        <Trash2 className="size-4" aria-hidden />
        Xoá lớp
      </Btn>
      {dlg.dialogs}
    </>
  );
}
