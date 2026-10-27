// Đường dẫn mở chat Zalo với một số điện thoại (zalo.me/<số>). Đổi +84 hoặc 84 đầu số thành 0.
// Trả về null nếu không phải số di động Việt Nam 10 số, để không tạo đường dẫn hỏng.
export function zaloUrl(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('84')) digits = `0${digits.slice(2)}`;
  if (!/^0\d{9}$/.test(digits)) return null;
  return `https://zalo.me/${digits}`;
}
