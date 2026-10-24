import { describe, expect, it } from 'vitest';
import { activeWord, estimateDurationMs, evenTimings, formatTimings, karaokeWords, parseTimings, wordIndexAtChar } from '@/lib/karaoke';

describe('karaoke đọc theo', () => {
  const words = karaokeWords('I can see a big brown bear.');

  it('chia đều theo độ dài từ: bắt đầu từ 0, tăng dần, từ dài chiếm nhiều hơn', () => {
    const t = evenTimings(words, 3000);
    expect(t).toHaveLength(7);
    expect(t[0]).toBe(0);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    expect(t[1] - t[0]).toBeLessThan(t[6] - t[5]); // "I" ngắn hơn "brown"
    expect(t[6]).toBeLessThan(3000);
  });

  it('mốc đã lưu: đúng số từ, không giảm; sai thì coi như chưa chỉnh', () => {
    expect(parseTimings('0,300,700', 3)).toEqual([0, 300, 700]);
    expect(parseTimings('0,300', 3)).toBeNull();
    expect(parseTimings('0,700,300', 3)).toBeNull();
    expect(parseTimings('0,-1,300', 3)).toBeNull();
    expect(parseTimings('', 3)).toBeNull();
    expect(formatTimings([0, 299.6, 700.2])).toBe('0,300,700');
  });

  it('từ đang đọc theo thời điểm', () => {
    const t = [0, 300, 700];
    expect(activeWord(t, 0)).toBe(0);
    expect(activeWord(t, 299)).toBe(0);
    expect(activeWord(t, 300)).toBe(1);
    expect(activeWord(t, 5000)).toBe(2);
    expect(activeWord([100, 300], 50)).toBe(-1);
  });

  it('máy đọc: ước lượng thời lượng hợp lý và đổi vị trí ký tự ra số thứ tự từ', () => {
    const d = estimateDurationMs(words);
    expect(d).toBeGreaterThan(1500);
    expect(d).toBeLessThan(8000);
    const text = 'I can see a big brown bear.';
    expect(wordIndexAtChar(text, 0)).toBe(0);
    expect(wordIndexAtChar(text, 2)).toBe(1);
    expect(wordIndexAtChar(text, text.indexOf('brown'))).toBe(5);
  });
});
