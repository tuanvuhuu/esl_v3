// Học phí theo buổi: "phải nộp" là giá trị các buổi đã học trừ giảm trừ cố định của học sinh (VND).
// Có thể âm khi giảm trừ lớn hơn giá trị đã học: phần âm là tiền trước, quy ra buổi được học thêm.
import { sql } from 'drizzle-orm';
import { TUITION_PER_SESSION } from '@/lib/tuition';

export function netFee(sessionsDone: number, discount: number): number {
  return sessionsDone * TUITION_PER_SESSION - Math.max(0, discount);
}

// Biểu thức SQL cho "phải nộp". Dùng trong truy vấn có bảng students là s.
export const NET_FEE_SQL = sql`(s.sessions_done * ${sql.raw(String(TUITION_PER_SESSION))} - COALESCE(s.tuition_discount, 0))`;

// Tổng đã nộp quy đổi của một học sinh: tiền thu cộng giảm trừ ghi cùng khoản thu (dòng hoàn, huỷ là số âm).
export function paidSql(studentId: ReturnType<typeof sql>) {
  return sql`COALESCE((SELECT SUM(tp.amount + tp.discount) FROM tuition_payments tp WHERE tp.student_id = ${studentId}), 0)`;
}
