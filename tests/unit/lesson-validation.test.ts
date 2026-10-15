import { describe, expect, it } from 'vitest';
import { isHttpUrl, lessonFormSchema, materialFormSchema } from '@/lib/validation/lesson';

describe('bài giảng', () => {
  it('cần tiêu đề và ít nhất một cơ sở', () => {
    expect(lessonFormSchema.safeParse({ title: 'A', campusIds: [1] }).success).toBe(false);
    expect(lessonFormSchema.safeParse({ title: 'Unit 3', campusIds: [] }).success).toBe(false);
    expect(lessonFormSchema.safeParse({ title: 'Unit 3', campusIds: [1, 2] }).success).toBe(true);
  });
});

describe('tài liệu của bài giảng', () => {
  it('liên kết chỉ nhận http và https', () => {
    expect(isHttpUrl('https://example.com/slide')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://example.com')).toBe(false);
    expect(isHttpUrl('không phải liên kết')).toBe(false);
  });

  it('tệp cần mã tệp đã tải lên, liên kết cần địa chỉ http hoặc https', () => {
    expect(materialFormSchema.safeParse({ kind: 'file', title: 'Slide', url: '', fileId: null }).success).toBe(false);
    expect(materialFormSchema.safeParse({ kind: 'file', title: 'Slide', url: '', fileId: 5 }).success).toBe(true);
    expect(materialFormSchema.safeParse({ kind: 'link', title: 'Slide', url: 'javascript:x', fileId: null }).success).toBe(false);
    expect(materialFormSchema.safeParse({ kind: 'link', title: 'Slide', url: 'https://a.vn', fileId: null }).success).toBe(true);
  });
});
