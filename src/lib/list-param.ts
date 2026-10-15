// Tham số danh sách trên URL, dùng cho bộ lọc chọn nhiều. Viết "1,2" hoặc lặp lại (?cls=1&cls=2) đều đọc được.
// Hàm thuần, dùng được cả server và client.
export function listParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : [value ?? ''];
  const parts = raw.flatMap((v) => v.split(',')).map((v) => v.trim()).filter((v) => v !== '');
  return parts.filter((v, i) => parts.indexOf(v) === i);
}

// Danh sách id (số nguyên dương). Giá trị không phải số bị bỏ qua.
export function idListParam(value: string | string[] | undefined): number[] {
  return listParam(value)
    .filter((v) => /^\d+$/.test(v))
    .map(Number);
}
