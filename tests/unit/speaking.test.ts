import { describe, expect, it } from 'vitest';
import { formatMs, isSpeakingError, rubricToPoints, speakingScale, topMarks, type SpeakingMark } from '@/lib/speaking';

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
    const m = (id: number, atMs: number, redo: boolean): SpeakingMark => ({ id, itemId: 1, atMs, errorType: 'other', correctText: '', note: '', redo, modelFileId: null });
    expect(topMarks([m(1, 1000, false), m(2, 5000, true), m(3, 3000, false)]).map((x) => x.id)).toEqual([2, 1]);
  });
});

describe('tiêu chí bài nói theo độ tuổi', () => {
  it('đến 8 tuổi chấm sao, từ 9 tuổi chấm điểm; chưa có ngày sinh coi như trẻ nhỏ', () => {
    expect(speakingScale('2018-10-25', '2026-10-24')).toBe('stars'); // 7 tuổi
    expect(speakingScale('2017-10-24', '2026-10-24')).toBe('points'); // vừa đủ 9 tuổi
    expect(speakingScale('2017-10-25', '2026-10-24')).toBe('stars'); // còn 1 ngày nữa mới 9 tuổi
    expect(speakingScale(null, '2026-10-24')).toBe('stars');
  });

  it('quy đổi sao và điểm ra điểm câu', () => {
    expect(rubricToPoints('stars', { pronunciation: 3, fluency: 3, task: 3 }, 10)).toBe(10);
    expect(rubricToPoints('stars', { pronunciation: 2, fluency: 1, task: 3 }, 10)).toBe(7); // 6/9
    expect(rubricToPoints('points', { pronunciation: 5, fluency: 4, task: 5, vocabulary: 3, grammar: 3 }, 10)).toBe(8); // 20/25
    expect(rubricToPoints('points', { pronunciation: 0, fluency: 0, task: 0, vocabulary: 0, grammar: 0 }, 10)).toBe(0);
  });

  it('thiếu tiêu chí hoặc ngoài thang thì chưa quy đổi', () => {
    expect(rubricToPoints('stars', { pronunciation: 3, fluency: 3 }, 10)).toBeNull();
    expect(rubricToPoints('stars', { pronunciation: 0, fluency: 3, task: 3 }, 10)).toBeNull();
    expect(rubricToPoints('points', { pronunciation: 6, fluency: 4, task: 5, vocabulary: 3, grammar: 3 }, 10)).toBeNull();
  });
});
