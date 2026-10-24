import { describe, expect, it } from 'vitest';
import { applyReview, newReviewCard, nextReviewLabel, pickDueWords } from '@/lib/review';

const T0 = new Date('2026-10-24T03:00:00Z'); // 10:00 giờ Việt Nam
const day = (d: Date) => d.toISOString().slice(0, 10);

describe('lịch ôn từ (FSRS)', () => {
  it('từ mới đến hạn ngay; nhớ đúng thì 2 ngày sau, quên thì ngày mai', () => {
    const { card, due } = newReviewCard(T0);
    expect(due.getTime()).toBe(T0.getTime());
    expect(day(applyReview(card, true, T0).due)).toBe('2026-10-26');
    expect(day(applyReview(card, false, T0).due)).toBe('2026-10-25');
  });

  it('nhớ đúng liên tiếp thì khoảng cách giãn dần, không quá 90 ngày', () => {
    let c = newReviewCard(T0);
    let now = T0;
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      const next = applyReview(c.card, true, now);
      gaps.push(next.card.scheduled_days);
      now = next.due;
      c = next;
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(90);
    expect(gaps[0]).toBe(2);
  });

  it('quên sau khi đã nhớ lâu thì khoảng cách rút ngắn và đếm số lần quên', () => {
    let c = newReviewCard(T0);
    let now = T0;
    for (let i = 0; i < 3; i++) {
      c = applyReview(c.card, true, now);
      now = c.due;
    }
    const before = c.card.scheduled_days;
    const lapse = applyReview(c.card, false, now);
    expect(lapse.card.lapses).toBe(1);
    expect(lapse.card.scheduled_days).toBeLessThan(before);
  });

  it('chọn từ cần ôn hôm nay theo giờ Việt Nam: hạn sớm trước, tối đa 10', () => {
    const at = (iso: string) => ({ due: new Date(iso) });
    // 16:59 UTC = 23:59 giờ Việt Nam vẫn là hôm nay; 17:00 UTC đã sang ngày mai
    const rows = [at('2026-10-24T16:59:00Z'), at('2026-10-24T17:00:00Z'), at('2026-10-20T00:00:00Z')];
    expect(pickDueWords(rows, T0).map((r) => r.due.toISOString())).toEqual(['2026-10-20T00:00:00.000Z', '2026-10-24T16:59:00.000Z']);
    const many = Array.from({ length: 15 }, (_, i) => at(`2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`));
    expect(pickDueWords(many, T0)).toHaveLength(10);
  });

  it('nhãn lần ôn tới', () => {
    expect(nextReviewLabel(new Date('2026-10-25T03:00:00Z'), T0)).toBe('ngày mai');
    expect(nextReviewLabel(new Date('2026-10-27T03:00:00Z'), T0)).toBe('3 ngày nữa');
    expect(nextReviewLabel(T0, T0)).toBe('hôm nay');
  });
});
