import { describe, expect, it } from 'vitest';
import { describeSchedule, joinWeekdays } from '@/lib/schedule';

describe('describeSchedule', () => {
  it('ghép ngày học và giờ theo thứ tự tuần, thứ Hai đứng đầu', () => {
    expect(describeSchedule('T6,T2,T4', '18:30', '20:30')).toBe('T2 · T4 · T6 · 18:30–20:30');
  });
  it('Chủ nhật đứng cuối tuần', () => {
    expect(describeSchedule('CN,T7', '09:00', '11:00')).toBe('T7 · CN · 09:00–11:00');
  });
});

describe('joinWeekdays', () => {
  it('ghép mã ngày thành chuỗi lưu DB', () => {
    expect(joinWeekdays(['T2', 'T4'])).toBe('T2,T4');
  });
});
