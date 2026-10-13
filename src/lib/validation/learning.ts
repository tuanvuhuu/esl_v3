// Validate sự kiện học tập do người dùng ghi. Sự kiện đổi lớp do hệ thống ghi khi chuyển lớp, không nhập tay.
import { z } from 'zod';
import { isRealIsoDate } from './student';

export const LEARNING_EVENT_TYPES = ['note', 'level_up', 'exam', 'status_change'] as const;

export const LEARNING_EVENT_LABELS: Record<(typeof LEARNING_EVENT_TYPES)[number], string> = {
  note: 'Ghi chú của giáo viên',
  level_up: 'Thăng cấp',
  exam: 'Kiểm tra',
  status_change: 'Đổi trạng thái',
};

export const learningEventSchema = z.object({
  eventType: z.enum(LEARNING_EVENT_TYPES, { error: 'Chọn loại sự kiện' }),
  title: z.string({ error: 'Vui lòng nhập tiêu đề' }).trim().min(2, 'Tiêu đề cần ít nhất 2 ký tự').max(160, 'Tiêu đề tối đa 160 ký tự'),
  detail: z.string().trim().max(1000, 'Chi tiết tối đa 1000 ký tự').default(''),
  occurredDate: z
    .string({ error: 'Vui lòng chọn ngày' })
    .min(1, 'Vui lòng chọn ngày')
    .refine(isRealIsoDate, 'Ngày không hợp lệ'),
});

export type LearningEventInput = z.infer<typeof learningEventSchema>;
