import { describe, expect, it } from 'vitest';
import { DEFAULT_PASSWORD } from '@/lib/auth/password';
import { studentLoginEmail } from '@/lib/student-account';
import { parseStudentCode, studentCode } from '@/lib/student-code';

describe('tài khoản học sinh', () => {
  it('email nội bộ đi theo mã học sinh và không trùng giữa hai học sinh', () => {
    expect(studentLoginEmail(7)).toBe('hs-00007@hoc-sinh.local');
    expect(studentLoginEmail(7)).not.toBe(studentLoginEmail(8));
  });

  it('mã học sinh đọc ngược lại được thành id', () => {
    expect(parseStudentCode(studentCode(42))).toBe(42);
    expect(parseStudentCode('hs-0042')).toBe(42);
    expect(parseStudentCode('giao-vien@esl.vn')).toBeNull();
  });

  it('mật khẩu ban đầu của tài khoản tạo từ ứng dụng là esl123', () => {
    expect(DEFAULT_PASSWORD).toBe('esl123');
  });
});
