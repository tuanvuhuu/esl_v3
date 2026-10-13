'use client';

import { useTransition } from 'react';
import { remindTuitionAction } from '@/app/(app)/hoc-phi/actions';
import { Toast, useToast } from '@/components/ui/Toast';

// Chân hồ sơ: nhắc học phí. Có ghi nhận vào nhật ký. Chưa gửi tin nhắn (xem Cài đặt, mục thông báo).
export function TuitionRemindButton({ studentId, debt }: { studentId: number; debt: number }) {
  const [pending, start] = useTransition();
  const { message, notify } = useToast();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pending || debt <= 0}
        onClick={() =>
          start(async () => {
            const r = await remindTuitionAction(studentId);
            notify(r.message ?? (r.ok ? 'Đã ghi nhắc' : 'Không ghi được'));
          })
        }
        className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-bold text-on-primary disabled:opacity-40"
      >
        {pending ? 'Đang ghi…' : debt > 0 ? 'Nhắc học phí' : 'Đã đóng đủ học phí'}
      </button>
      <Toast message={message} />
    </div>
  );
}
