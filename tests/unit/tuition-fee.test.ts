import { describe, expect, it } from 'vitest';
import { netFee } from '@/lib/tuition-fee';

describe('phải nộp theo buổi đã học', () => {
  it('buổi đã học × 250.000', () => {
    expect(netFee(0)).toBe(0);
    expect(netFee(18)).toBe(4_500_000);
  });
});
