// Chuẩn hoá chuỗi để tìm kiếm: bỏ dấu tiếng Việt, đổi đ thành d, chữ thường, gọn khoảng trắng.

export function normalizeSearch(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Số điện thoại Việt Nam 10 số hiện theo nhóm 4-3-3 ("0901 000 103"); số khác dạng giữ nguyên
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return /^0\d{9}$/.test(digits) ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : phone;
}
