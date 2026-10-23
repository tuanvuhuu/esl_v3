import { describe, expect, it } from 'vitest';
import { formatMs, isSpeakingError, topMarks, type SpeakingMark } from '@/lib/speaking';

describe('chấm bài nói', () => {
  it('mốc thời gian dạng phút:giây', () => {
    expect(formatMs(0)).toBe('0:00');
    expect(formatMs(7300)).toBe('0:07');
    expect(formatMs(65_000)).toBe('1:05');
    expect(formatMs(-5)).toBe('0:00');
  });

  it('chỉ nhận loại lỗi trong danh sách', () => {
    expect(isSpeakingError('final_sound')).toBe(true);
    expect(isSpeakingError('toString')).toBe(false);
    expect(isSpeakingError('xyz')).toBe(false);
  });

  it('trẻ nhỏ: chỉ nêu 1–2 lỗi, ưu tiên câu cần nói lại', () => {
    const m = (id: number, atMs: number, redo: boolean): SpeakingMark => ({ id, itemId: 1, atMs, errorType: 'other', correctText: '', note: '', redo });
    expect(topMarks([m(1, 1000, false), m(2, 5000, true), m(3, 3000, false)]).map((x) => x.id)).toEqual([2, 1]);
  });
});
