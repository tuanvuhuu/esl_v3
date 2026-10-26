import { describe, expect, it } from 'vitest';
import { ageOn, isYoungLearner } from '@/lib/age';

describe('tuổi và nhóm trẻ nhỏ', () => {
  it('tuổi tròn: chưa đến sinh nhật thì chưa tính thêm tuổi', () => {
    expect(ageOn('2021-10-27', '2026-10-26')).toBe(4);
    expect(ageOn('2021-10-26', '2026-10-26')).toBe(5);
    expect(ageOn(null, '2026-10-26')).toBeNull();
  });

  it('trẻ 3–5 tuổi dùng cỡ nút lớn; không có ngày sinh thì không', () => {
    expect(isYoungLearner('2021-06-01', '2026-10-26')).toBe(true);
    expect(isYoungLearner('2019-06-01', '2026-10-26')).toBe(false);
    expect(isYoungLearner(null, '2026-10-26')).toBe(false);
  });
});
