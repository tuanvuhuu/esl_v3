'use client';

import { useTransition } from 'react';
import { remindTuitionAction } from '@/app/(app)/hoc-phi/actions';
import { Btn } from '@/components/ui/Btn';
import { Toast, useToast } from '@/components/ui/Toast';

// Chân hồ sơ: nhắc học phí. Có ghi nhận vào nhật ký. Chưa gửi tin nhắn (xem Cài đặt, mục thông báo).
export function TuitionRemindButton({ studentId, debt }: { studentId: number; debt: number }) {
  const [pending, start] = useTransition();
  const { message, notify } = useToast();
  return (
    <div className="flex flex-col gap-2">
      <Btn
        block
        variant="primary"
        loading={pending}
        disabled={pending || debt <= 0}
        onClick={() =>
          start(async () => {
            const r = await remindTuitionAction(studentId);
            notify(r.message ?? (r.ok ? 'Đã ghi nhắc' : 'Không ghi được'));
          })
        }
      >
        {pending ? 'Đang ghi…' : debt > 0 ? 'Nhắc học phí' : 'Đã đóng đủ học phí'}
      </Btn>
      <Toast message={message} />
    </div>
  );
}
