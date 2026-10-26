// Học phí thực thu của học sinh: học phí gốc (riêng, hoặc của lớp) trừ khoản giảm trừ cố định (VND).
// Giảm trừ luôn là số tiền cụ thể, không có khái niệm phần trăm. Không âm.
import { sql } from 'drizzle-orm';

export function netFee(baseFee: number, discount: number): number {
  return Math.max(0, baseFee - Math.max(0, discount));
}

// Biểu thức SQL cho học phí thực thu. Dùng trong truy vấn có bảng students là s và bảng classes là c.
export const NET_FEE_SQL = sql`GREATEST(0, COALESCE(s.tuition_fee, c.fee) - COALESCE(s.tuition_discount, 0))`;
