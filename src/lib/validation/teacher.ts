// Validate form giáo viên (thêm và sửa). Dùng ở server action.
import { z } from 'zod';

export const TEACHER_STATUSES = ['active', 'leave'] as const;

export const TEACHER_STATUS_LABELS: Record<(typeof TEACHER_STATUSES)[number], string> = {
  active: 'Đang dạy',
  leave: 'Nghỉ phép',
};

export const teacherFormSchema = z.object({
  name: z
    .string({ error: 'Vui lòng nhập họ và tên giáo viên' })
    .trim()
    .min(2, 'Họ và tên cần ít nhất 2 ký tự')
    .max(120, 'Họ và tên tối đa 120 ký tự'),
  subject: z
    .string({ error: 'Vui lòng nhập môn dạy' })
    .trim()
    .min(2, 'Vui lòng nhập môn dạy')
    .max(80, 'Môn dạy tối đa 80 ký tự'),
  phone: z
    .string({ error: 'Vui lòng nhập số điện thoại' })
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0')),
  years: z.coerce
    .number({ error: 'Số năm kinh nghiệm phải là số' })
    .int('Số năm kinh nghiệm phải là số nguyên')
    .min(0, 'Số năm kinh nghiệm không âm')
    .max(60, 'Số năm kinh nghiệm tối đa 60'),
  status: z.enum(TEACHER_STATUSES, { error: 'Trạng thái không hợp lệ' }),
});

export type TeacherFormInput = z.infer<typeof teacherFormSchema>;
