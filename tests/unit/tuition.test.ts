import { describe, expect, it } from 'vitest';
import { debtOf, dueDateFor, isOverdue, sessionsCovered, syncedTuitionFee, tuitionState } from '@/lib/tuition';

describe('syncedTuitionFee', () => {
  it('học sinh vào đủ khoá thì theo học phí lớp (null)', () => {
    expect(syncedTuitionFee(6_000_000, 24, 24)).toBeNull();
  });
  it('học sinh vào giữa khoá thì chia theo số buổi còn lại', () => {
    expect(syncedTuitionFee(6_000_000, 24, 12)).toBe(3_000_000);
    expect(syncedTuitionFee(6_000_000, 24, 0)).toBe(0);
  });
});

describe('tuitionState', () => {
  it('đã đóng khi thu đủ hoặc hơn học phí', () => {
    expect(tuitionState(12_000_000, 12_000_000)).toBe('paid');
    expect(tuitionState(12_000_000, 13_000_000)).toBe('paid');
  });
  it('còn nợ khi đã thu một phần, chưa đóng khi chưa thu', () => {
    expect(tuitionState(12_000_000, 6_000_000)).toBe('partial');
    expect(tuitionState(12_000_000, 0)).toBe('unpaid');
  });
});

describe('debtOf', () => {
  it('không âm khi đã thu thừa', () => {
    expect(debtOf(12_000_000, 4_000_000)).toBe(8_000_000);
    expect(debtOf(12_000_000, 15_000_000)).toBe(0);
  });
});

describe('sessionsCovered', () => {
  it('số buổi đóng tăng theo số tiền thu', () => {
    // 12 buổi, học phí 4.800.000 ₫: mỗi buổi 400.000 ₫
    expect(sessionsCovered(4_800_000, 0, 12)).toBe(0);
    expect(sessionsCovered(4_800_000, 1_200_000, 12)).toBe(3);
    expect(sessionsCovered(4_800_000, 1_100_000, 12)).toBe(2);
    expect(sessionsCovered(4_800_000, 4_800_000, 12)).toBe(12);
  });
  it('đóng thừa không vượt số buổi còn lại', () => {
    expect(sessionsCovered(4_800_000, 6_000_000, 12)).toBe(12);
  });
  it('học phí bằng 0 thì coi như đã đóng đủ buổi', () => {
    expect(sessionsCovered(0, 0, 8)).toBe(8);
  });
  it('không có buổi còn lại thì bằng 0', () => {
    expect(sessionsCovered(4_800_000, 4_800_000, 0)).toBe(0);
  });
});

describe('dueDateFor', () => {
  it('hạn là ngày dueDay của tháng sau tháng khai giảng', () => {
    expect(dueDateFor('2026-09-07', 10)).toBe('2026-10-10');
  });
  it('qua năm mới', () => {
    expect(dueDateFor('2026-12-03', 10)).toBe('2027-01-10');
  });
  it('kẹp ngày trong 1..28', () => {
    expect(dueDateFor('2026-09-07', 31)).toBe('2026-10-28');
    expect(dueDateFor('2026-09-07', 0)).toBe('2026-10-01');
  });
});

describe('isOverdue', () => {
  it('quá hạn khi còn nợ và đã qua hạn', () => {
    expect(isOverdue(12_000_000, 0, '2026-10-10', '2026-10-13')).toBe(true);
  });
  it('không quá hạn khi đã đóng đủ hoặc chưa tới hạn', () => {
    expect(isOverdue(12_000_000, 12_000_000, '2026-10-10', '2026-10-13')).toBe(false);
    expect(isOverdue(12_000_000, 0, '2026-10-10', '2026-10-09')).toBe(false);
  });
});
