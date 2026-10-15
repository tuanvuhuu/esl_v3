import { describe, expect, it } from 'vitest';
import { generateStudentPassword, studentLoginEmail } from '@/lib/student-account';
import { parseStudentCode, studentCode } from '@/lib/student-code';

describe('tài khoản học sinh', () => {
  it('email nội bộ đi theo mã học sinh và không trùng giữa hai học sinh', () => {
    expect(studentLoginEmail(7)).toBe('hs-0007@hoc-sinh.local');
    expect(studentLoginEmail(7)).not.toBe(studentLoginEmail(8));
  });

  it('mã học sinh đọc ngược lại được thành id', () => {
    expect(parseStudentCode(studentCode(42))).toBe(42);
    expect(parseStudentCode('hs-0042')).toBe(42);
    expect(parseStudentCode('giao-vien@esl.vn')).toBeNull();
  });

  it('mật khẩu tạm có độ dài đúng, không có ký tự dễ nhầm, và mỗi lần khác nhau', () => {
    const a = generateStudentPassword();
    const b = generateStudentPassword();
    expect(a).toHaveLength(10);
    expect(a).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]+$/);
    expect(a).not.toBe(b);
  });
});
