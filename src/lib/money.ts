// Định dạng tiền VND. Tiền lưu bằng số nguyên đồng, không làm tròn trên máy.

export function formatVND(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} ₫`;
}

// Dạng rút gọn cho thẻ thống kê: 12.000.000 ₫ thành "12 triệu ₫"
export function formatVNDShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${millions.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu ₫`;
  }
  return formatVND(amount);
}

// Số tiền còn thiếu của một học sinh: không bao giờ âm
export function remainingDebt(fee: number, paid: number): number {
  return Math.max(0, fee - paid);
}

// Trạng thái học phí theo số đã đóng so với học phí khoá
export type TuitionState = 'paid' | 'partial' | 'unpaid';

export function tuitionState(fee: number, paid: number): TuitionState {
  if (paid >= fee) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}
