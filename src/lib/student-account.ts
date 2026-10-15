// Tài khoản học sinh (P28): email nội bộ và mật khẩu tạm. Hàm thuần, không đụng cơ sở dữ liệu, có unit test.
import { randomInt } from 'node:crypto';
import { studentCode } from '@/lib/student-code';

// Email nội bộ không gửi thư. Học sinh đăng nhập bằng mã học sinh, nên email chỉ để tài khoản có định danh duy nhất.
export function studentLoginEmail(studentId: number): string {
  return `${studentCode(studentId).toLowerCase()}@hoc-sinh.local`;
}

// Mật khẩu tạm: 10 ký tự, bỏ các ký tự dễ nhầm (0, O, 1, l, I). Đọc to được cho học sinh.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export function generateStudentPassword(length = 10): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}
