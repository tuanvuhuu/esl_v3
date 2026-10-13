import { describe, expect, it } from 'vitest';
import { generateSessions, parseWeekdays } from '@/lib/schedule';

const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

describe('parseWeekdays', () => {
  it('đổi mã ngày sang số thứ, đã sắp xếp và bỏ trùng', () => {
    expect(parseWeekdays('T6,T2,T4,T2')).toEqual([1, 3, 5]);
    expect(parseWeekdays('T7,CN')).toEqual([0, 6]);
  });

  it('từ chối mã ngày không hợp lệ hoặc danh sách rỗng', () => {
    expect(() => parseWeekdays('T9')).toThrow('Ngày học không hợp lệ');
    expect(() => parseWeekdays('')).toThrow('Chưa chọn ngày học');
  });
});

describe('generateSessions', () => {
  it('sinh đúng số buổi, đúng thứ, tăng dần và không trùng ngày', () => {
    const sessions = generateSessions({ weekdays: 'T2,T4,T6', startTime: '18:30', endTime: '20:30', sessionsTotal: 24, fromDate: '2026-09-07' });
    expect(sessions).toHaveLength(24);
    const allowed = new Set([1, 3, 5]);
    sessions.forEach((s, i) => {
      expect(allowed.has(weekdayOf(s.date))).toBe(true);
      expect(s.sessionNo).toBe(i + 1);
      if (i > 0) expect(s.date > sessions[i - 1].date).toBe(true);
    });
    expect(new Set(sessions.map((s) => s.date)).size).toBe(24);
  });

  it('buổi đầu tiên là đúng ngày bắt đầu khi ngày đó trùng thứ học', () => {
    // 07/09/2026 là thứ Hai
    expect(weekdayOf('2026-09-07')).toBe(1);
    const [first] = generateSessions({ weekdays: 'T2', startTime: '18:30', endTime: '20:30', sessionsTotal: 2, fromDate: '2026-09-07' });
    expect(first.date).toBe('2026-09-07');
  });

  it('giờ bắt đầu và kết thúc đúng múi giờ Việt Nam', () => {
    const [first] = generateSessions({ weekdays: 'T2', startTime: '18:30', endTime: '20:30', sessionsTotal: 1, fromDate: '2026-09-07' });
    expect(first.startsAt.toISOString()).toBe('2026-09-07T11:30:00.000Z');
    expect(first.endsAt.toISOString()).toBe('2026-09-07T13:30:00.000Z');
  });

  it('từ chối giờ sai dạng hoặc kết thúc trước khi bắt đầu', () => {
    expect(() => generateSessions({ weekdays: 'T2', startTime: '25:00', endTime: '20:30', sessionsTotal: 1, fromDate: '2026-09-07' })).toThrow('HH:MM');
    expect(() => generateSessions({ weekdays: 'T2', startTime: '20:30', endTime: '18:30', sessionsTotal: 1, fromDate: '2026-09-07' })).toThrow('phải sau');
  });

  it('từ chối số buổi và ngày bắt đầu sai', () => {
    expect(() => generateSessions({ weekdays: 'T2', startTime: '18:30', endTime: '20:30', sessionsTotal: 0, fromDate: '2026-09-07' })).toThrow('nguyên dương');
    expect(() => generateSessions({ weekdays: 'T2', startTime: '18:30', endTime: '20:30', sessionsTotal: 2, fromDate: '07/09/2026' })).toThrow('YYYY-MM-DD');
  });
});
