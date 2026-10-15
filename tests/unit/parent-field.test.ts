import { describe, expect, it } from 'vitest';
import { parentFieldValue, parentRelationSchema } from '@/lib/validation/parent';

describe('sửa tại ô của phụ huynh', () => {
  it('số điện thoại được chuẩn hoá: bỏ khoảng trắng, gồm 10 số bắt đầu bằng 0', () => {
    expect(parentFieldValue('phone', '0920 000 111')).toEqual({ ok: true, value: '0920000111' });
    expect(parentFieldValue('phone', '1920000111').ok).toBe(false);
  });

  it('tên ít nhất 2 ký tự; email được để trống nhưng nhập sai định dạng thì báo lỗi', () => {
    expect(parentFieldValue('fullName', 'A').ok).toBe(false);
    expect(parentFieldValue('fullName', 'Lê An')).toEqual({ ok: true, value: 'Lê An' });
    expect(parentFieldValue('email', '').ok).toBe(true);
    expect(parentFieldValue('email', 'abc').ok).toBe(false);
  });

  it('ghi chú tối đa 1000 ký tự, và được để trống', () => {
    expect(parentFieldValue('note', 'x'.repeat(1001)).ok).toBe(false);
    expect(parentFieldValue('note', '').ok).toBe(true);
  });

  it('quan hệ chỉ nhận các giá trị cho phép', () => {
    expect(parentRelationSchema.safeParse('mother').success).toBe(true);
    expect(parentRelationSchema.safeParse('uncle').success).toBe(false);
  });
});
