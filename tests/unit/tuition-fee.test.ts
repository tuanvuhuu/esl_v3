import { describe, expect, it } from 'vitest';
import { netFee } from '@/lib/tuition-fee';

describe('học phí thực thu (giảm trừ theo số tiền)', () => {
  it('trừ đúng số tiền giảm trừ', () => {
    expect(netFee(5_000_000, 500_000)).toBe(4_500_000);
    expect(netFee(5_000_000, 0)).toBe(5_000_000);
  });

  it('không âm, và số giảm âm không làm tăng học phí', () => {
    expect(netFee(1_000_000, 2_000_000)).toBe(0);
    expect(netFee(1_000_000, -300_000)).toBe(1_000_000);
  });
});

import { balanceOf } from '@/lib/tuition';

describe('thừa hoặc thiếu so với phải nộp', () => {
  it('đã nộp trừ phải nộp: âm là thiếu, dương là thừa', () => {
    expect(balanceOf(4_400_000, 1_000_000)).toBe(-3_400_000);
    expect(balanceOf(4_400_000, 4_400_000)).toBe(0);
    expect(balanceOf(4_400_000, 5_000_000)).toBe(600_000);
  });
});
