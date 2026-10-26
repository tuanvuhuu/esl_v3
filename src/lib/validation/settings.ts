// Validate cài đặt trung tâm. Dùng ở server action.
import { z } from 'zod';

export const centerSettingsSchema = z.object({
  centerName: z.string({ error: 'Vui lòng nhập tên trung tâm' }).trim().min(2, 'Tên trung tâm cần ít nhất 2 ký tự').max(120, 'Tên trung tâm tối đa 120 ký tự'),
  address: z.string().trim().max(200, 'Địa chỉ tối đa 200 ký tự').default(''),
  hotline: z
    .string()
    .trim()
    .max(20, 'Hotline tối đa 20 ký tự')
    .refine((v) => v === '' || /^[0-9+\s.-]{6,20}$/.test(v), 'Hotline chỉ gồm số, dấu cách, +, -, .')
    .default(''),
  email: z
    .string()
    .trim()
    .max(160, 'Email tối đa 160 ký tự')
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email không đúng định dạng')
    .default(''),
  workingHours: z.string().trim().max(200, 'Giờ làm việc tối đa 200 ký tự').default(''),
  dueDay: z.coerce
    .number({ error: 'Ngày đến hạn phải là số' })
    .int('Ngày đến hạn phải là số nguyên')
    .min(1, 'Ngày đến hạn từ 1 đến 28')
    .max(28, 'Ngày đến hạn từ 1 đến 28'),
  notifySmsBeforeDue: z.boolean(),
  notifyWeeklyReport: z.boolean(),
  notifyAbsentAlert: z.boolean(),
  notifyNewClass: z.boolean(),
  // Tài khoản nhận học phí (mã VietQR). Để trống cả ba thì không kèm mã QR.
  bankBin: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{6}$/.test(v), 'Chọn ngân hàng')
    .default(''),
  bankAccount: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s.-]/g, ''))
    .refine((v) => v === '' || /^\d{6,19}$/.test(v), 'Số tài khoản gồm 6 đến 19 chữ số')
    .default(''),
  bankAccountName: z.string().trim().max(80, 'Tên chủ tài khoản tối đa 80 ký tự').default(''),
}).superRefine((v, ctx) => {
  if (v.bankAccount && !v.bankBin) ctx.addIssue({ code: 'custom', path: ['bankBin'], message: 'Chọn ngân hàng của tài khoản' });
  if (v.bankBin && !v.bankAccount) ctx.addIssue({ code: 'custom', path: ['bankAccount'], message: 'Nhập số tài khoản' });
});

export type CenterSettingsInput = z.infer<typeof centerSettingsSchema>;
