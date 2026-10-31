// Học phí theo buổi: "phải nộp" là giá trị các buổi đã học (VND). Giảm trừ chỉ ghi ở khoản thu:
// học phí của số buổi đăng ký = tiền thu + giảm trừ, nên số buổi đã mua đã tính cả giảm trừ.
// Giảm trừ cố định cũ của học sinh (students.tuition_discount) không còn tính.
import { sql } from 'drizzle-orm';
import { TUITION_PER_SESSION } from '@/lib/tuition';

export function netFee(sessionsDone: number): number {
  return sessionsDone * TUITION_PER_SESSION;
}

// Biểu thức SQL cho "phải nộp". Dùng trong truy vấn có bảng students là s.
export const NET_FEE_SQL = sql`(s.sessions_done * ${sql.raw(String(TUITION_PER_SESSION))})`;

