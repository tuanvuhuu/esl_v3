// Validate bài giảng và tài liệu (P25). Dùng ở server action và form.
import { z } from 'zod';

export const MATERIAL_KINDS = ['link', 'file'] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];
export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = { link: 'Liên kết', file: 'Tệp' };

// Chỉ cho phép liên kết http và https, để không có liên kết javascript: hay dữ liệu lạ
export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const lessonFormSchema = z.object({
  title: z.string({ error: 'Nhập tiêu đề bài giảng' }).trim().min(2, 'Tiêu đề cần ít nhất 2 ký tự').max(160, 'Tiêu đề tối đa 160 ký tự'),
  objectives: z.string().trim().max(1000, 'Mục tiêu tối đa 1000 ký tự').default(''),
  content: z.string().trim().max(4000, 'Nội dung tối đa 4000 ký tự').default(''),
  campusIds: z.array(z.number().int().positive()).min(1, 'Chọn ít nhất một cơ sở'),
});

export const materialFormSchema = z
  .object({
    kind: z.enum(MATERIAL_KINDS, { error: 'Chọn loại tài liệu' }),
    title: z.string().trim().min(1, 'Nhập tên tài liệu').max(160, 'Tên tài liệu tối đa 160 ký tự'),
    url: z.string().trim().max(500, 'Liên kết tối đa 500 ký tự').default(''),
    fileId: z.number().int().positive().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'link' && !isHttpUrl(v.url)) {
      ctx.addIssue({ code: 'custom', path: ['url'], message: 'Liên kết phải bắt đầu bằng http:// hoặc https://' });
    }
    if (v.kind === 'file' && v.fileId === null) {
      ctx.addIssue({ code: 'custom', path: ['fileId'], message: 'Tải tệp lên trước khi lưu' });
    }
  });
