// Quy tắc học phí theo buổi. Hàm thuần, có unit test.
// - Mỗi buổi giá TUITION_PER_SESSION. Không có học phí theo lớp hay theo khoá.
// - Mỗi lần thu nhập học phí của số buổi đăng ký và giảm trừ; phụ huynh trả = học phí − giảm trừ.
//   Số buổi đã mua = tổng học phí đã đăng ký ÷ giá một buổi. Nộp bao nhiêu lần cũng được, không giới hạn số tiền.
// - "Phải nộp" (fee) là giá trị các buổi đã học.
// - Đã đóng: không nợ. Còn nợ: đã nộp nhưng học quá số đã mua. Chưa đóng: chưa nộp khoản nào.
// - Hạn đóng: ngày dueDay của tháng sau tháng bắt đầu học. Quá hạn khi còn nợ và đã qua hạn.

// Học phí một buổi (VND)
export const TUITION_PER_SESSION = 250_000;

export type TuitionState = 'paid' | 'partial' | 'unpaid';

export function tuitionState(fee: number, paid: number): TuitionState {
  if (paid <= 0 && fee >= 0) return 'unpaid';
  if (paid >= fee) return 'paid';
  return 'partial';
}

export function debtOf(fee: number, paid: number): number {
  return Math.max(0, fee - paid);
}

// Số buổi đã mua: tổng học phí đã đăng ký (tiền thu + giảm trừ) chia giá một buổi, làm tròn xuống. Tiền lẻ chưa đủ một buổi được giữ lại.
export function sessionsBought(credit: number): number {
  return credit > 0 ? Math.floor(credit / TUITION_PER_SESSION) : 0;
}

// Hạn đóng học phí cho học sinh bắt đầu học ngày startDate (YYYY-MM-DD). Ngày được kẹp trong 1..28.
export function dueDateFor(startDate: string, dueDay: number): string {
  const [y, m] = startDate.split('-').map(Number);
  const total = y * 12 + m; // tháng sau: m (0-based index của tháng kế tiếp)
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const day = Math.min(28, Math.max(1, dueDay));
  return `${ny}-${String(nm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isOverdue(fee: number, paid: number, dueDate: string, todayKey: string): boolean {
  return debtOf(fee, paid) > 0 && dueDate < todayKey;
}

// Thừa hay thiếu: đã nộp trừ phải nộp. Dương là còn tiền trước (buổi chưa học), âm là nợ, 0 là vừa đủ.
export function balanceOf(fee: number, paid: number): number {
  return paid - fee;
}
