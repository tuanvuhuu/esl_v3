// Mã học sinh hiển thị dạng HS-00001 (5 chữ số), sinh từ id số của bảng students.
// Mã cũ 4 chữ số (HS-0001) vẫn đọc được: cùng chỉ tới id 1.

const PREFIX = 'HS-';
export const STUDENT_CODE_DIGITS = 5;
const CODE_PATTERN = /^HS-(\d{4,})$/;

export function studentCode(id: number): string {
  if (!Number.isInteger(id) || id < 1) {
    throw new RangeError(`id học sinh không hợp lệ: ${id}`);
  }
  return `${PREFIX}${String(id).padStart(STUDENT_CODE_DIGITS, '0')}`;
}

// Trả về id số, hoặc null nếu chuỗi không đúng dạng mã. Nhận cả mã mới HS-00012 và mã cũ HS-0012, không phân biệt hoa thường.
export function parseStudentCode(code: string): number | null {
  const match = CODE_PATTERN.exec(code.trim().toUpperCase());
  if (!match) return null;
  const id = Number(match[1]);
  return id >= 1 ? id : null;
}
