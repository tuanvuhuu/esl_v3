// Validate form học sinh (thêm và sửa). Dùng ở server action, không tin dữ liệu từ trình duyệt.
import { z } from 'zod';

export const GENDERS = ['male', 'female'] as const;
export const STUDENT_STATUSES = ['active', 'trial', 'paused', 'finished'] as const;
export const PARENT_RELATIONS = ['father', 'mother', 'guardian', 'other'] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Ngày YYYY-MM-DD có tồn tại thật (không chấp nhận 2026-02-31)
export function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function todayIsoVN(now: Date = new Date()): string {
  // Lấy ngày theo múi giờ Việt Nam (UTC+7)
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

const isoDate = z
  .string({ error: 'Vui lòng chọn ngày' })
  .min(1, 'Vui lòng chọn ngày')
  .refine(isRealIsoDate, 'Ngày không hợp lệ');

export const studentFormSchema = z.object({
  fullName: z
    .string({ error: 'Vui lòng nhập họ và tên' })
    .trim()
    .min(2, 'Họ và tên cần ít nhất 2 ký tự')
    .max(120, 'Họ và tên tối đa 120 ký tự'),
  gender: z.enum(GENDERS, { error: 'Vui lòng chọn giới tính' }),
  // Ngày sinh không bắt buộc (P40): ô trống lưu null
  dob: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    isoDate.refine((v) => v <= todayIsoVN(), 'Ngày sinh không thể ở tương lai').nullable(),
  ),
  classId: z.coerce.number({ error: 'Vui lòng chọn lớp học' }).int('Lớp học không hợp lệ').positive('Vui lòng chọn lớp học'),
  status: z.enum(STUDENT_STATUSES, { error: 'Trạng thái không hợp lệ' }),
  startDate: isoDate,
  // Học phí riêng của học sinh (VND). Ô trống: đóng theo học phí của lớp.
  tuitionFee: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? null : typeof v === 'string' ? Number(v.replace(/[.\s]/g, '')) : v),
    z
      .number({ error: 'Học phí phải là số' })
      .int('Học phí phải là số nguyên VND')
      .min(0, 'Học phí không âm')
      .max(1_000_000_000, 'Học phí quá lớn')
      .nullable(),
  ),
  note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự').default(''),
  // Phụ huynh: chọn người có sẵn (parentId), hoặc nhập người mới (tên và SĐT)
  parentId: z
    .string()
    .default('')
    .transform((v) => (/^\d+$/.test(v) ? Number(v) : null)),
  parentName: z.string().trim().max(120, 'Tên phụ huynh tối đa 120 ký tự').default(''),
  parentPhone: z
    .string()
    .default('')
    .transform((v) => v.replace(/\s/g, '')),
  parentRelation: z.enum(PARENT_RELATIONS).default('other'),
  parentPrimary: z
    .string()
    .optional()
    .transform((v) => v !== undefined && v !== ''),
}).superRefine((v, ctx) => {
  if (v.parentId !== null) return;
  if (v.parentName.length < 2) {
    ctx.addIssue({ code: 'custom', path: ['parentName'], message: 'Tên phụ huynh cần ít nhất 2 ký tự' });
  }
  if (!/^0\d{9}$/.test(v.parentPhone)) {
    ctx.addIssue({ code: 'custom', path: ['parentPhone'], message: 'Số điện thoại gồm 10 số, bắt đầu bằng 0' });
  }
});

export type StudentFormInput = z.infer<typeof studentFormSchema>;

// Kết quả chuẩn của server action: thành công, hoặc lỗi theo từng ô
export type ActionResult = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

// Chuyển lỗi zod thành lỗi theo ô, lấy thông báo đầu tiên của mỗi ô
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
