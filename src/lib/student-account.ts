// Tài khoản học sinh (P28): email nội bộ. Hàm thuần, không đụng cơ sở dữ liệu, có unit test.
import { studentCode } from '@/lib/student-code';

// Email nội bộ không gửi thư. Học sinh đăng nhập bằng mã học sinh, nên email chỉ để tài khoản có định danh duy nhất.
export function studentLoginEmail(studentId: number): string {
  return `${studentCode(studentId).toLowerCase()}@hoc-sinh.local`;
}
