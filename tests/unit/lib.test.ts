import { describe, expect, it } from 'vitest';
import { formatVND, formatVNDShort, remainingDebt, tuitionState } from '@/lib/money';
import { parseStudentCode, studentCode } from '@/lib/student-code';
import { studentsHref } from '@/lib/student-url';
import { normalizeSearch } from '@/lib/text';

describe('formatVND', () => {
  it('định dạng số nguyên đồng kèm ký hiệu ₫', () => {
    expect(formatVND(12_000_000)).toBe('12.000.000 ₫');
  });

  it('làm tròn số thập phân về đồng nguyên', () => {
    expect(formatVND(1234.6)).toBe('1.235 ₫');
  });
});

describe('formatVNDShort', () => {
  it('dùng đơn vị triệu khi từ một triệu trở lên', () => {
    expect(formatVNDShort(12_000_000)).toBe('12 triệu ₫');
    expect(formatVNDShort(7_500_000)).toBe('7,5 triệu ₫');
  });

  it('giữ nguyên dạng đầy đủ dưới một triệu', () => {
    expect(formatVNDShort(450_000)).toBe('450.000 ₫');
  });
});

describe('học phí', () => {
  it('còn thiếu không bao giờ âm', () => {
    expect(remainingDebt(12_000_000, 15_000_000)).toBe(0);
    expect(remainingDebt(12_000_000, 6_000_000)).toBe(6_000_000);
  });

  it('phân loại trạng thái theo số đã đóng', () => {
    expect(tuitionState(12_000_000, 12_000_000)).toBe('paid');
    expect(tuitionState(12_000_000, 6_000_000)).toBe('partial');
    expect(tuitionState(12_000_000, 0)).toBe('unpaid');
  });
});

describe('mã học sinh', () => {
  it('tạo mã HS-00001 từ id', () => {
    expect(studentCode(1)).toBe('HS-00001');
    expect(studentCode(24)).toBe('HS-00024');
    expect(studentCode(12345)).toBe('HS-12345');
  });

  it('từ chối id không hợp lệ', () => {
    expect(() => studentCode(0)).toThrow(RangeError);
    expect(() => studentCode(1.5)).toThrow(RangeError);
  });

  it('đọc ngược mã về id, không phân biệt hoa thường', () => {
    expect(parseStudentCode('HS-0007')).toBe(7);
    expect(parseStudentCode(' hs-0007 ')).toBe(7);
  });

  it('trả về null cho mã sai dạng', () => {
    expect(parseStudentCode('HS-7')).toBeNull();
    expect(parseStudentCode('HS-0000')).toBeNull();
    expect(parseStudentCode('ABC-0001')).toBeNull();
  });
});

describe('normalizeSearch', () => {
  it('bỏ dấu tiếng Việt và đổi đ thành d', () => {
    expect(normalizeSearch('Nguyễn Minh Anh')).toBe('nguyen minh anh');
    expect(normalizeSearch('Đặng Ngọc Diệp')).toBe('dang ngoc diep');
  });

  it('gọn khoảng trắng và chữ thường', () => {
    expect(normalizeSearch('  Trần   GIA  Bảo ')).toBe('tran gia bao');
  });

  it('tìm được khi gõ không dấu', () => {
    const name = normalizeSearch('Phạm Thu Hương');
    expect(name.includes(normalizeSearch('thu huong'))).toBe(true);
  });
});

describe('studentsHref', () => {
  it('tạo đường dẫn có sort và order', () => {
    expect(studentsHref({ sort: 'name', order: 'asc' })).toBe('/hoc-sinh?sort=name&order=asc');
    expect(studentsHref({ sort: 'tuition', order: 'desc', p: 2 })).toBe('/hoc-sinh?p=2&sort=tuition&order=desc');
  });

  it('giữ bộ lọc kèm sort', () => {
    expect(studentsHref({ q: 'Anh', status: 'active', sort: 'attendance', order: 'asc' })).toBe('/hoc-sinh?q=Anh&status=active&sort=attendance&order=asc');
  });
});
