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
