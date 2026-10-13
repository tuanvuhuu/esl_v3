// Validate phụ huynh và liên kết phụ huynh với học sinh. Dùng ở server action.
import { z } from 'zod';
import { PARENT_RELATIONS } from './student';

const PHONE = /^0\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parentFormSchema = z.object({
  fullName: z
    .string({ error: 'Vui lòng nhập họ và tên phụ huynh' })
    .trim()
    .min(2, 'Họ và tên cần ít nhất 2 ký tự')
    .max(120, 'Họ và tên tối đa 120 ký tự'),
  phone: z
    .string({ error: 'Vui lòng nhập số điện thoại' })
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(PHONE, 'Số điện thoại gồm 10 số, bắt đầu bằng 0')),
  email: z
    .string()
    .trim()
    .max(160, 'Email tối đa 160 ký tự')
    .refine((v) => v === '' || EMAIL.test(v), 'Email không đúng định dạng')
    .default(''),
  note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự').default(''),
});

// Thêm liên kết phụ huynh cho một học sinh: chọn người có sẵn, hoặc nhập người mới
export const parentLinkSchema = z
  .object({
    parentId: z.string().default('').transform((v) => (/^\d+$/.test(v) ? Number(v) : null)),
    fullName: z.string().trim().default(''),
    phone: z.string().default('').transform((v) => v.replace(/\s/g, '')),
    relation: z.enum(PARENT_RELATIONS, { error: 'Chọn quan hệ với học sinh' }).default('other'),
    isPrimary: z.string().optional().transform((v) => v !== undefined && v !== ''),
  })
  .superRefine((v, ctx) => {
    if (v.parentId !== null) return;
    if (v.fullName.length < 2) ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Họ và tên cần ít nhất 2 ký tự' });
    if (!PHONE.test(v.phone)) ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Số điện thoại gồm 10 số, bắt đầu bằng 0' });
  });

export type ParentLinkInput = z.infer<typeof parentLinkSchema>;
