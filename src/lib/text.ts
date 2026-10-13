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
