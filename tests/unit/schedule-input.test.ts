import { describe, expect, it } from 'vitest';
import { durationLabel, finishTime, typingTime } from '@/components/classes/DayTimeRows';
import { summarizeConflicts, type ScheduleConflict } from '@/lib/queries/schedule-conflicts';

describe('ô giờ kiểu 24 giờ', () => {
  it('gõ số liền tự thêm dấu hai chấm', () => {
    expect(typingTime('1830')).toBe('18:30');
    expect(typingTime('830')).toBe('8:30');
    expect(typingTime('18')).toBe('18');
    expect(typingTime('18:')).toBe('18:');
    expect(typingTime('18:3')).toBe('18:3');
    expect(typingTime('18h30')).toBe('18:30');
    expect(typingTime('183099')).toBe('18:30');
  });
  it('rời ô thì đủ hai chữ số giờ', () => {
    expect(finishTime('8:30')).toBe('08:30');
    expect(finishTime('8')).toBe('08:00');
    expect(finishTime('18:30')).toBe('18:30');
    expect(finishTime('abc')).toBe('abc');
  });
  it('độ dài ca', () => {
    expect(durationLabel('18:00', '19:30')).toBe('1 giờ 30 phút');
    expect(durationLabel('08:00', '08:45')).toBe('45 phút');
    expect(durationLabel('08:00', '10:00')).toBe('2 giờ');
    expect(durationLabel('10:00', '09:00')).toBe('');
  });
});

describe('gom câu trùng lịch', () => {
  const at = (s: string) => new Date(`${s}+07:00`);
  const c = (date: string, kind: 'teacher' | 'room' = 'teacher'): ScheduleConflict => ({
    kind,
    startsAt: at(`${date}T09:30:00`),
    endsAt: at(`${date}T11:00:00`),
    otherClass: 'GT-A1',
    otherStartsAt: at(`${date}T09:00:00`),
    otherEndsAt: at(`${date}T11:00:00`),
    who: kind === 'teacher' ? 'Thầy Quốc Bảo' : 'P.110',
  });
  it('cùng giáo viên, cùng lớp, cùng giờ thì một câu nhiều ngày', () => {
    expect(summarizeConflicts([c('2026-10-24'), c('2026-10-31')])).toEqual(['Thầy Quốc Bảo đang dạy lớp GT-A1 09:00–11:00 các ngày T7 24/10, T7 31/10']);
  });
  it('quá nhiều ngày thì nêu số ngày còn lại; phòng là câu riêng', () => {
    const many = ['2026-10-24', '2026-10-31', '2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28'].map((d) => c(d));
    expect(summarizeConflicts(many)[0]).toMatch(/T7 14\/11 và 2 ngày khác$/);
    expect(summarizeConflicts([c('2026-10-24', 'room')])).toEqual(['Phòng P.110 đã có lớp GT-A1 09:00–11:00 ngày T7 24/10']);
  });
});
