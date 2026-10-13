import { describe, expect, it } from 'vitest';
import { fieldErrorsFrom, isRealIsoDate, studentFormSchema, todayIsoVN } from '@/lib/validation/student';

const valid = {
  fullName: 'Nguyễn Minh Anh',
  gender: 'female',
  dob: '2001-05-14',
  classId: '3',
  status: 'trial',
  startDate: '2026-09-10',
  note: '',
  parentName: 'Nguyễn Văn Hùng',
  parentPhone: '0910 000 000',
  parentRelation: 'father',
};

describe('isRealIsoDate', () => {
  it('nhận ngày thật và từ chối ngày không tồn tại', () => {
    expect(isRealIsoDate('2026-02-28')).toBe(true);
    expect(isRealIsoDate('2026-02-31')).toBe(false);
    expect(isRealIsoDate('14/05/2001')).toBe(false);
  });
});

describe('studentFormSchema', () => {
  it('chấp nhận dữ liệu hợp lệ, chuyển classId sang số và bỏ khoảng trắng trong SĐT', () => {
    const parsed = studentFormSchema.parse(valid);
    expect(parsed.classId).toBe(3);
    expect(parsed.parentPhone).toBe('0910000000');
    expect(parsed.fullName).toBe('Nguyễn Minh Anh');
  });

  it('từ chối họ tên quá ngắn và báo đúng ô', () => {
    const result = studentFormSchema.safeParse({ ...valid, fullName: ' A ' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrorsFrom(result.error).fullName).toBe('Họ và tên cần ít nhất 2 ký tự');
  });

  it('từ chối số điện thoại không đủ 10 số', () => {
    const result = studentFormSchema.safeParse({ ...valid, parentPhone: '0910' });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrorsFrom(result.error).parentPhone).toBe('Số điện thoại gồm 10 số, bắt đầu bằng 0');
  });

  it('từ chối ngày sinh ở tương lai và ngày không tồn tại', () => {
    expect(studentFormSchema.safeParse({ ...valid, dob: '2999-01-01' }).success).toBe(false);
    expect(studentFormSchema.safeParse({ ...valid, dob: '2001-02-31' }).success).toBe(false);
  });

  it('từ chối trạng thái và giới tính ngoài danh sách', () => {
    expect(studentFormSchema.safeParse({ ...valid, status: 'deleted' }).success).toBe(false);
    expect(studentFormSchema.safeParse({ ...valid, gender: 'other' }).success).toBe(false);
  });

  it('từ chối lớp không phải số dương', () => {
    expect(studentFormSchema.safeParse({ ...valid, classId: '0' }).success).toBe(false);
    expect(studentFormSchema.safeParse({ ...valid, classId: 'abc' }).success).toBe(false);
  });

  it('ghi chú tối đa 1000 ký tự', () => {
    expect(studentFormSchema.safeParse({ ...valid, note: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('todayIsoVN', () => {
  it('lấy ngày theo múi giờ Việt Nam', () => {
    // 23:30 UTC ngày 12/10 là 06:30 ngày 13/10 theo giờ Việt Nam
    expect(todayIsoVN(new Date('2026-10-12T23:30:00Z'))).toBe('2026-10-13');
  });
});
