import { describe, expect, it } from 'vitest';
import { arrangeForStudent, shuffleApart, shuffleSeed } from '@/lib/student-shuffle';
import { seeded } from '@/lib/games';

const opt = (id: number, label: string) => ({ id, label, imageFileId: null, audioFileId: null });
const item = (id: number, itemType: string, extra: Partial<{ referenceText: string; options: ReturnType<typeof opt>[]; pairs: { leftLabel: string; rightLabel: string }[] }> = {}) => ({
  id,
  position: id,
  itemType,
  prompt: `Câu ${id}`,
  referenceText: extra.referenceText ?? null,
  options: extra.options ?? [],
  pairs: (extra.pairs ?? []).map((p) => ({ ...p, leftImageFileId: null, rightImageFileId: null })),
});
const ITEMS = Array.from({ length: 8 }, (_, i) =>
  item(i + 1, 'choice', { options: [opt(10 * (i + 1) + 1, 'đúng'), opt(10 * (i + 1) + 2, 'sai 1'), opt(10 * (i + 1) + 3, 'sai 2'), opt(10 * (i + 1) + 4, 'sai 3')] }),
);

describe('xáo câu hỏi và đáp án theo học sinh', () => {
  it('cùng học sinh cùng bài thì giữ nguyên thứ tự; học sinh khác thì khác', () => {
    const a = arrangeForStudent(ITEMS, 7, 100).map((i) => i.id);
    expect(arrangeForStudent(ITEMS, 7, 100).map((i) => i.id)).toEqual(a);
    const others = [8, 9, 10, 11].map((s) => arrangeForStudent(ITEMS, s, 100).map((i) => i.id).join());
    expect(others.some((o) => o !== a.join())).toBe(true);
    expect(shuffleSeed(1, 2)).not.toBe(shuffleSeed(2, 1));
  });

  it('đánh số lại 1..n theo thứ tự mới, đủ mọi câu', () => {
    const out = arrangeForStudent(ITEMS, 3, 5);
    expect(out.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(out.map((i) => i.id).sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('đáp án đúng (đang đứng đầu trong dữ liệu) không còn luôn ở đầu', () => {
    const firsts = arrangeForStudent(ITEMS, 42, 9).map((i) => i.options[0].label);
    expect(firsts.filter((l) => l === 'đúng').length).toBeLessThan(ITEMS.length);
    for (const i of arrangeForStudent(ITEMS, 42, 9)) expect(i.options.map((o) => o.label).sort()).toEqual(['sai 1', 'sai 2', 'sai 3', 'đúng']);
  });

  it('không gửi đáp án: sắp xếp chỉ có từ đã xáo, điền chỗ trống không có câu mẫu và lựa chọn; câu nói giữ câu mẫu', () => {
    const [order, gap, speak] = [
      item(1, 'order', { referenceText: 'I like my red bike' }),
      item(2, 'gap_fill', { referenceText: 'have|own', options: [opt(1, 'have')] }),
      item(3, 'speak_repeat', { referenceText: 'Hello!' }),
    ].map((i) => arrangeForStudent([i], 1, 1)[0]);
    expect(order.referenceText).toBeNull();
    expect([...order.orderWords].sort()).toEqual(['I', 'bike', 'like', 'my', 'red']);
    expect(order.orderWords.join(' ')).not.toBe('I like my red bike');
    expect(gap.referenceText).toBeNull();
    expect(gap.options).toEqual([]);
    expect(speak.referenceText).toBe('Hello!');
    expect('pairs' in order).toBe(false);
  });

  it('ghép đôi: hai cột xáo riêng, cột phải không trùng thứ tự cột trái', () => {
    const pairs = [{ leftLabel: 'cat', rightLabel: 'mèo' }, { leftLabel: 'dog', rightLabel: 'chó' }, { leftLabel: 'bird', rightLabel: 'chim' }];
    for (const s of [1, 2, 3, 4, 5]) {
      const m = arrangeForStudent([item(1, 'match', { pairs })], s, 1)[0];
      expect(m.matchLeft.map((x) => x.label).sort()).toEqual(['bird', 'cat', 'dog']);
      expect(m.matchRight.map((x) => x.label).sort()).toEqual(['chim', 'chó', 'mèo']);
      const pairedInOrder = m.matchLeft.every((l, k) => pairs.find((p) => p.leftLabel === l.label)?.rightLabel === m.matchRight[k].label);
      expect(pairedInOrder).toBe(false);
    }
  });

  it('xáo tránh trùng thứ tự ban đầu khi có thể', () => {
    expect(shuffleApart(['a', 'b'], seeded(1))).toEqual(['b', 'a']);
    expect(shuffleApart(['a', 'a'], seeded(1))).toEqual(['a', 'a']);
  });
});
