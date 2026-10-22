import { describe, expect, it } from 'vitest';
import { describeSchedule, encodeDayTimes, generateSessions, resolveDayTimes } from '@/lib/schedule';
import { checkDayTimes, classCreateSchema } from '@/lib/validation/class';
import { fieldErrorsFrom } from '@/lib/validation/student';
import { proratedFee } from '@/lib/tuition';
import { parseStudentCode, studentCode } from '@/lib/student-code';

const vnTime = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(11, 16);

describe('giờ học riêng từng ngày', () => {
  const dayTimes = 'T3 18:00-19:30,T7 08:00-09:30';

  it('sinh buổi đúng giờ của từng ngày (T3 18:00–19:30, T7 08:00–09:30)', () => {
    // 27/10/2026 là thứ Ba
    const sessions = generateSessions({ weekdays: 'T3,T7', startTime: '18:00', endTime: '19:30', dayTimes, sessionsTotal: 4, fromDate: '2026-10-27' });
    expect(sessions.map((s) => s.date)).toEqual(['2026-10-27', '2026-10-31', '2026-11-03', '2026-11-07']);
    expect(sessions.map((s) => `${vnTime(s.startsAt)}-${vnTime(s.endsAt)}`)).toEqual(['18:00-19:30', '08:00-09:30', '18:00-19:30', '08:00-09:30']);
  });

  it('lớp cũ không có giờ riêng dùng một giờ chung', () => {
    expect(resolveDayTimes('T2,T4', '18:30', '20:30')).toEqual([
      { code: 'T2', start: '18:30', end: '20:30' },
      { code: 'T4', start: '18:30', end: '20:30' },
    ]);
    expect(describeSchedule('T2,T4', '18:30', '20:30', '')).toBe('T2 · T4 · 18:30–20:30');
  });

  it('mô tả lịch ghi giờ từng ngày, gộp các ngày cùng giờ', () => {
    expect(describeSchedule('T3,T7', '18:00', '19:30', dayTimes)).toBe('T3 18:00–19:30 · T7 08:00–09:30');
    expect(describeSchedule('T2,T4,T7', '18:00', '19:30', 'T2 18:00-19:30,T4 18:00-19:30,T7 08:00-09:30')).toBe('T2, T4 18:00–19:30 · T7 08:00–09:30');
    // Mọi ngày cùng giờ thì giữ kiểu cũ
    expect(describeSchedule('T2,T4', '18:00', '19:30', 'T2 18:00-19:30,T4 18:00-19:30')).toBe('T2 · T4 · 18:00–19:30');
  });

  it('mô tả bảy ngày khác giờ vẫn vừa cột schedule (300 ký tự)', () => {
    const all = encodeDayTimes(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((code, i) => ({ code, start: `0${i + 1}:00`, end: `0${i + 2}:30` })));
    expect(all.length).toBeLessThanOrEqual(300);
    expect(describeSchedule('T2,T3,T4,T5,T6,T7,CN', '01:00', '02:30', all).length).toBeLessThanOrEqual(300);
  });

  it('kiểm giờ từng ngày, lỗi theo tên ô', () => {
    const r = checkDayTimes(['T3', 'T7'], { T3: [{ start: '18:00', end: '19:30' }], T7: [{ start: '09:30', end: '08:00' }] });
    expect(r.errors).toEqual({ end_T7: 'Giờ kết thúc phải sau giờ bắt đầu' });
  });

  it('form tạo lớp nhận giờ riêng và lấy giờ ngày đầu tuần làm giờ chung', () => {
    const base = {
      name: 'IELTS-K20', course: 'IELTS', campusId: '1', teacherId: '1', fee: '3000000', capacity: '15',
      weekdays: ['T7', 'T3'], startDate: '2026-10-27', sessionsTotal: '24',
      dayTimes: { T3: [{ start: '18:00', end: '19:30' }], T7: [{ start: '08:00', end: '09:30' }] },
    };
    const v = classCreateSchema.parse(base);
    expect(v.dayTimes).toEqual([
      { code: 'T3', start: '18:00', end: '19:30' },
      { code: 'T7', start: '08:00', end: '09:30' },
    ]);
    expect([v.startTime, v.endTime]).toEqual(['18:00', '19:30']);
    const bad = classCreateSchema.safeParse({ ...base, dayTimes: { ...base.dayTimes, T7: [{ start: '08:00', end: '' }] } });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrorsFrom(bad.error).end_T7).toBe('Vui lòng chọn giờ kết thúc');
  });
});

describe('một ngày học nhiều ca', () => {
  const dayTimes = 'T3 18:00-19:30,T7 14:00-15:30,T7 08:00-09:30';

  it('ngày có hai ca sinh hai buổi trong ngày, đúng thứ tự giờ', () => {
    // 27/10/2026 là thứ Ba
    const sessions = generateSessions({ weekdays: 'T3,T7', startTime: '18:00', endTime: '19:30', dayTimes, sessionsTotal: 6, fromDate: '2026-10-27' });
    expect(sessions.map((s) => `${s.date} ${vnTime(s.startsAt)}`)).toEqual([
      '2026-10-27 18:00',
      '2026-10-31 08:00',
      '2026-10-31 14:00',
      '2026-11-03 18:00',
      '2026-11-07 08:00',
      '2026-11-07 14:00',
    ]);
    expect(sessions.map((s) => s.sessionNo)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('dừng đúng số buổi kể cả giữa hai ca của một ngày', () => {
    const sessions = generateSessions({ weekdays: 'T7', startTime: '08:00', endTime: '09:30', dayTimes: 'T7 08:00-09:30,T7 14:00-15:30', sessionsTotal: 3, fromDate: '2026-10-31' });
    expect(sessions.map((s) => `${s.date} ${vnTime(s.startsAt)}`)).toEqual(['2026-10-31 08:00', '2026-10-31 14:00', '2026-11-07 08:00']);
  });

  it('mô tả lịch ghi các ca của một ngày cạnh nhau', () => {
    expect(describeSchedule('T3,T7', '18:00', '19:30', dayTimes)).toBe('T3 18:00–19:30 · T7 08:00–09:30, 14:00–15:30');
    expect(describeSchedule('T7,CN', '08:00', '09:30', 'T7 08:00-09:30,T7 14:00-15:30,CN 08:00-09:30,CN 14:00-15:30')).toBe('T7 · CN · 08:00–09:30, 14:00–15:30');
  });

  it('hai ca trùng giờ trong một ngày bị chặn, cả khi sinh buổi và khi kiểm form', () => {
    expect(() => generateSessions({ weekdays: 'T7', startTime: '08:00', endTime: '09:30', dayTimes: 'T7 08:00-09:30,T7 09:00-10:00', sessionsTotal: 2, fromDate: '2026-10-31' })).toThrow('trùng giờ');
    const r = checkDayTimes(['T7'], { T7: [{ start: '08:00', end: '09:30' }, { start: '09:00', end: '10:00' }] });
    expect(r.errors).toEqual({ start_T7_2: 'Trùng giờ với ca khác của T7' });
    // Ca sau kết thúc đúng lúc ca trước bắt đầu thì không trùng
    expect(checkDayTimes(['T7'], { T7: [{ start: '09:30', end: '11:00' }, { start: '08:00', end: '09:30' }] }).errors).toEqual({});
  });

  it('form tạo lớp nhận nhiều ca, xếp ca theo giờ', () => {
    const v = classCreateSchema.parse({
      name: 'KIDS-2CA', course: 'Kids', campusId: '1', teacherId: '1', fee: '3000000', capacity: '15',
      weekdays: ['T7'], startDate: '2026-10-31', sessionsTotal: '8',
      dayTimes: { T7: [{ start: '14:00', end: '15:30' }, { start: '08:00', end: '09:30' }] },
    });
    expect(encodeDayTimes(v.dayTimes)).toBe('T7 08:00-09:30,T7 14:00-15:30');
    expect([v.startTime, v.endTime]).toEqual(['08:00', '09:30']);
  });
});

describe('học phí theo số buổi còn lại', () => {
  it('chia học phí lớp theo buổi, làm tròn đến 1.000đ', () => {
    expect(proratedFee(3_000_000, 24, 17)).toBe(2_125_000);
    expect(proratedFee(2_500_000, 24, 17)).toBe(1_771_000); // 1.770.833 → 1.771.000
  });
  it('học đủ khoá thì đóng đủ, hết buổi thì 0, kết quả luôn là số nguyên', () => {
    expect(proratedFee(2_500_000, 24, 24)).toBe(2_500_000);
    expect(proratedFee(2_500_000, 24, 0)).toBe(0);
    expect(proratedFee(2_500_000, 0, 0)).toBe(2_500_000);
    expect(Number.isInteger(proratedFee(1_234_567, 7, 3))).toBe(true);
  });
});

describe('mã học sinh 5 chữ số', () => {
  it('hiển thị HS-00001, đọc được cả mã cũ 4 chữ số', () => {
    expect(studentCode(1)).toBe('HS-00001');
    expect(studentCode(12345)).toBe('HS-12345');
    expect(parseStudentCode('HS-00012')).toBe(12);
    expect(parseStudentCode('hs-0012')).toBe(12);
  });
});
