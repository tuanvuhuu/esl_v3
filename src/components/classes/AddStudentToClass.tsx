'use client';

// Nút "Thêm học sinh" trên trang lớp: mở form thêm học sinh với lớp này chọn sẵn, lưu xong ở lại trang lớp.
import { UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StudentForm, type CampusChoice, type ClassOption, type ParentChoice } from '@/components/students/StudentForm';
import { Btn } from '@/components/ui/Btn';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export function AddStudentToClass({ classId, campusId, classes, campuses, parents }: {
  classId: number;
  campusId: number;
  classes: ClassOption[];
  campuses: CampusChoice[];
  parents: ParentChoice[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Thông báo hiện qua Toast có sẵn của trang lớp (cùng một kho thông báo), không thêm Toast thứ hai
  const { notify } = useToast();
  return (
    <>
      <Btn onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        Thêm học sinh
      </Btn>
      <Modal open={open} title="Thêm học sinh vào lớp" subtitle="Các trường có dấu * là bắt buộc." onClose={() => setOpen(false)} labelledBy="class-add-student-title">
        {open && (
          <StudentForm
            mode="create"
            classes={classes}
            campuses={campuses}
            defaultCampusId={campusId}
            defaultClassId={classId}
            parents={parents}
            onDone={(text) => {
              setOpen(false);
              notify(text);
              router.refresh();
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}
