import { describe, expect, it } from 'vitest';
import {
  addDaysKey,
  daysBetweenKeys,
  dateKeyLabel,
  monthLabel,
  shiftMonth,
  vnDateKey,
  vnDateTimeLabel,
  vnDayBounds,
  vnTimeLabel,
  weekStartKey,
  weekdayOfKey,
} from '@/lib/datetime';

describe('vnDateKey', () => {
  it('lấy ngày theo giờ Việt Nam, không theo UTC', () => {
    // 2026-10-12 17:30 UTC là 2026-10-13 00:30 giờ Việt Nam
    expect(vnDateKey(new Date('2026-10-12T17:30:00Z'))).toBe('2026-10-13');
    expect(vnDateKey(new Date('2026-10-12T16:59:00Z'))).toBe('2026-10-12');
  });
});

describe('vnDateTimeLabel và vnTimeLabel', () => {
  it('định dạng theo giờ Việt Nam', () => {
    const at = new Date('2026-10-13T10:05:00Z'); // 17:05 giờ Việt Nam
    expect(vnDateTimeLabel(at)).toBe('13/10/2026 17:05');
    expect(vnTimeLabel(at)).toBe('17:05');
  });
});

describe('dateKeyLabel', () => {
  it('đổi YYYY-MM-DD thành DD/MM/YYYY', () => {
    expect(dateKeyLabel('2026-09-02')).toBe('02/09/2026');
  });
});

describe('addDaysKey và daysBetweenKeys', () => {
  it('qua tháng và qua năm', () => {
    expect(addDaysKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetweenKeys('2026-10-01', '2026-10-13')).toBe(12);
    expect(daysBetweenKeys('2026-10-13', '2026-10-01')).toBe(-12);
  });
});

describe('weekdayOfKey và weekStartKey', () => {
  it('2026-10-13 là thứ Ba, tuần bắt đầu thứ Hai 2026-10-12', () => {
    expect(weekdayOfKey('2026-10-13')).toBe(2);
    expect(weekStartKey('2026-10-13')).toBe('2026-10-12');
  });
  it('Chủ nhật thuộc tuần kết thúc ngày đó, bắt đầu thứ Hai trước đó 6 ngày', () => {
    expect(weekdayOfKey('2026-10-18')).toBe(0);
    expect(weekStartKey('2026-10-18')).toBe('2026-10-12');
  });
  it('thứ Hai là đầu tuần của chính nó', () => {
    expect(weekStartKey('2026-10-12')).toBe('2026-10-12');
  });
});

describe('vnDayBounds', () => {
  it('khoảng một ngày theo +07:00', () => {
    const { start, end } = vnDayBounds('2026-10-13');
    expect(start.toISOString()).toBe('2026-10-12T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-13T17:00:00.000Z');
  });
});

describe('tháng', () => {
  it('chuyển tháng qua năm', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftMonth('2026-10', -10)).toBe('2025-12');
  });
  it('nhãn tháng', () => {
    expect(monthLabel('2026-09')).toBe('09/2026');
  });
});
