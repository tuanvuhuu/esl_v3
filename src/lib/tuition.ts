// Quy tắc học phí. Hàm thuần, có unit test.
// - Đã đóng: tổng thu bằng hoặc hơn học phí của lớp.
// - Còn nợ: đã thu một phần.
// - Chưa đóng: chưa thu khoản nào.
// - Hạn đóng: ngày dueDay của tháng sau tháng khai giảng. Quá hạn khi còn nợ và đã qua hạn.

export type TuitionState = 'paid' | 'partial' | 'unpaid';

export function tuitionState(fee: number, paid: number): TuitionState {
  if (paid >= fee) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

export function debtOf(fee: number, paid: number): number {
  return Math.max(0, fee - paid);
}

// Hạn đóng học phí cho học sinh khai giảng ngày startDate (YYYY-MM-DD). Ngày được kẹp trong 1..28.
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
