'use client';

import { CalendarIcon, PencilIcon, TrashIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { Btn } from '@/components/ui/Btn';
import { useClassDialogs } from './useClassDialogs';
import type { CampusChoice, LevelChoice, TeacherChoice } from './ClassForm';

// Nút Sửa, Xếp lại lịch và Xoá ở đầu trang chi tiết lớp. Xoá xong thì về danh sách lớp.
export function ClassDetailActions({
  classId,
  name,
  studentCount,
  teachers,
  campuses,
  levels,
  defaultCampusId,
  canManage,
}: {
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
      <Btn leadingVisual={PencilIcon} onClick={() => dlg.openEdit(classId)} disabled={!canManage}>
        Sửa lớp
      </Btn>
      <Btn leadingVisual={CalendarIcon} onClick={() => dlg.openReschedule(classId)} disabled={!canManage}>
        Xếp lại lịch
      </Btn>
      <Btn variant="danger" leadingVisual={TrashIcon} onClick={() => dlg.askDelete({ id: classId, name, studentCount })} disabled={!canManage}>
        Xoá lớp
      </Btn>
      {dlg.dialogs}
    </>
  );
}
