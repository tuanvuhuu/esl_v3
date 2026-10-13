import { describe, expect, it } from 'vitest';
import { accountFormSchema } from '@/lib/validation/account';

const base = { fullName: 'Nguyễn Thu Trang', email: 'Trang.GiaoVu@ESL-Center.vn', role: 'academic', status: 'active', teacherId: '' };

describe('accountFormSchema', () => {
  it('chuẩn hoá email về chữ thường và cắt khoảng trắng', () => {
    const parsed = accountFormSchema.parse({ ...base, email: '  Trang.GiaoVu@ESL-Center.vn ' });
    expect(parsed.email).toBe('trang.giaovu@esl-center.vn');
  });

  it('từ chối email sai định dạng', () => {
    expect(accountFormSchema.safeParse({ ...base, email: 'trang.esl' }).success).toBe(false);
    expect(accountFormSchema.safeParse({ ...base, email: 'trang @esl.vn' }).success).toBe(false);
  });

  it('từ chối vai trò không có trong danh sách', () => {
    expect(accountFormSchema.safeParse({ ...base, role: 'superuser' }).success).toBe(false);
  });

  it('vai trò Giáo viên bắt buộc có giáo viên tương ứng', () => {
    const missing = accountFormSchema.safeParse({ ...base, role: 'teacher', teacherId: '' });
    expect(missing.success).toBe(false);
    if (!missing.success) expect(missing.error.issues[0].message).toBe('Chọn giáo viên tương ứng');
    expect(accountFormSchema.safeParse({ ...base, role: 'teacher', teacherId: '4' }).success).toBe(true);
  });

  it('các vai trò khác không cần giáo viên', () => {
    expect(accountFormSchema.safeParse({ ...base, role: 'accountant', teacherId: '' }).success).toBe(true);
  });
});
