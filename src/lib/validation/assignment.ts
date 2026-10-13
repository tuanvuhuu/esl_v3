// Validate bài tập và chấm điểm. Dùng ở server action.
import { z } from 'zod';
import { isRealIsoDate } from './student';

export const SUBMISSION_STATUSES = ['not_submitted', 'submitted', 'graded'] as const;
export const SUBMISSION_LABELS: Record<(typeof SUBMISSION_STATUSES)[number], string> = {
  not_submitted: 'Chưa nộp',
  submitted: 'Đã nộp',
  graded: 'Đã chấm',
};

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const assignmentFormSchema = z.object({
  classId: z.coerce.number({ error: 'Vui lòng chọn lớp' }).int().positive('Vui lòng chọn lớp'),
  title: z.string({ error: 'Vui lòng nhập tiêu đề bài tập' }).trim().min(2, 'Tiêu đề cần ít nhất 2 ký tự').max(160, 'Tiêu đề tối đa 160 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').default(''),
  dueDate: z
    .string({ error: 'Vui lòng chọn hạn nộp' })
    .min(1, 'Vui lòng chọn hạn nộp')
    .refine(isRealIsoDate, 'Ngày không hợp lệ'),
  dueTime: z.string({ error: 'Vui lòng chọn giờ nộp' }).regex(TIME, 'Giờ theo dạng HH:MM'),
  maxScore: z.coerce
    .number({ error: 'Điểm tối đa phải là số' })
    .int('Điểm tối đa phải là số nguyên')
    .min(1, 'Điểm tối đa ít nhất là 1')
    .max(100, 'Điểm tối đa tối đa 100'),
});

export type AssignmentFormInput = z.infer<typeof assignmentFormSchema>;

// Một dòng chấm điểm: trạng thái nộp, điểm (chỉ khi đã chấm), nhận xét
export const gradingRowSchema = z
  .object({
    studentId: z.number().int().positive(),
    status: z.enum(SUBMISSION_STATUSES),
    score: z.number().int().min(0).max(100).nullable(),
    feedback: z.string().trim().max(500, 'Nhận xét tối đa 500 ký tự').default(''),
  })
  .refine((v) => v.status !== 'graded' || v.score !== null, { message: 'Chấm điểm thì phải có điểm', path: ['score'] });
