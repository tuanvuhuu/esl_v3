import { describe, expect, it } from 'vitest';
import { netFee } from '@/lib/tuition-fee';

describe('phải nộp theo buổi đã học', () => {
  it('buổi đã học × 250.000 trừ giảm trừ cố định', () => {
    expect(netFee(18, 0)).toBe(4_500_000);
    expect(netFee(18, 500_000)).toBe(4_000_000);
  });
  it('giảm trừ lớn hơn thì âm (tiền trước), số giảm âm bị bỏ qua', () => {
    expect(netFee(0, 250_000)).toBe(-250_000);
    expect(netFee(4, -1_000_000)).toBe(1_000_000);
  });
});
