// Validate form tài khoản (thêm, mời, sửa). Server action dùng lại schema này.
import { z } from 'zod';
import { ROLE_CODES } from '@/lib/permissions';

export const ACCOUNT_STATUSES = ['active', 'locked'] as const;

export const accountFormSchema = z
  .object({
    fullName: z
      .string({ error: 'Vui lòng nhập họ và tên' })
      .trim()
      .min(2, 'Họ và tên cần ít nhất 2 ký tự')
      .max(120, 'Họ và tên tối đa 120 ký tự'),
    email: z
      .string({ error: 'Vui lòng nhập email' })
      .trim()
      .toLowerCase()
      .min(1, 'Vui lòng nhập email')
      .max(160, 'Email tối đa 160 ký tự')
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email chưa đúng định dạng'),
    role: z.enum(ROLE_CODES, { error: 'Vui lòng chọn vai trò' }),
    status: z.enum(ACCOUNT_STATUSES, { error: 'Trạng thái không hợp lệ' }),
    teacherId: z.string().default(''),
  })
  .superRefine((v, ctx) => {
    // Vai trò Giáo viên phải gắn với một giáo viên trong danh sách
    if (v.role === 'teacher' && !/^\d+$/.test(v.teacherId)) {
      ctx.addIssue({ code: 'custom', path: ['teacherId'], message: 'Chọn giáo viên tương ứng' });
    }
  });

export type AccountFormInput = z.infer<typeof accountFormSchema>;
