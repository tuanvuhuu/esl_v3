// Mã học sinh hiển thị dạng HS-0001, sinh từ id số của bảng students.

const PREFIX = 'HS-';
const CODE_PATTERN = /^HS-(\d{4,})$/;

export function studentCode(id: number): string {
  if (!Number.isInteger(id) || id < 1) {
    throw new RangeError(`id học sinh không hợp lệ: ${id}`);
  }
  return `${PREFIX}${String(id).padStart(4, '0')}`;
}

// Trả về id số, hoặc null nếu chuỗi không đúng dạng mã
export function parseStudentCode(code: string): number | null {
  const match = CODE_PATTERN.exec(code.trim().toUpperCase());
  if (!match) return null;
  const id = Number(match[1]);
  return id >= 1 ? id : null;
}
