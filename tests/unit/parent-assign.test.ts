import { describe, expect, it } from 'vitest';
import { parentAssignSchema } from '@/lib/validation/parent';

describe('gán học sinh cho phụ huynh', () => {
  it('nhận nhiều học sinh, đổi mã sang số và bỏ mã trùng', () => {
    const v = parentAssignSchema.parse({ studentIds: ['3', '7', '3'], relation: 'mother', isPrimary: true });
    expect(v.studentIds).toEqual([3, 7, 3]);
    expect(v.relation).toBe('mother');
    expect(v.isPrimary).toBe(true);
  });

  it('bắt buộc chọn ít nhất một học sinh', () => {
    const r = parentAssignSchema.safeParse({ studentIds: [], relation: 'father', isPrimary: false });
    expect(r.success).toBe(false);
  });

  it('quan hệ phải thuộc danh sách cho phép', () => {
    expect(parentAssignSchema.safeParse({ studentIds: ['1'], relation: 'uncle', isPrimary: false }).success).toBe(false);
    expect(parentAssignSchema.safeParse({ studentIds: ['1'], relation: 'guardian', isPrimary: false }).success).toBe(true);
  });

  it('mã học sinh phải là số nguyên dương', () => {
    expect(parentAssignSchema.safeParse({ studentIds: ['abc'], relation: 'father', isPrimary: false }).success).toBe(false);
    expect(parentAssignSchema.safeParse({ studentIds: ['0'], relation: 'father', isPrimary: false }).success).toBe(false);
  });
});
