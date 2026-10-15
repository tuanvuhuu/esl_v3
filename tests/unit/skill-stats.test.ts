import { describe, expect, it } from 'vitest';
import type { SubmissionSummary } from '@/lib/assignment-scoring';
import { addSkillScores, bandOf, emptyTotals, gradedSkillScores, percentOf, totalPercent, trendOf } from '@/lib/skill-stats';

const summary = (status: SubmissionSummary['status']): SubmissionSummary => ({
  status,
  total: 4,
  maxTotal: 10,
  complete: status === 'graded',
  skills: [{ skill: 'writing', raw: 4, max: 10 }],
  points: {},
});

describe('tổng hợp kỹ năng', () => {
  it('bắt đầu từ bốn kỹ năng, mỗi kỹ năng bằng 0', () => {
    const t = emptyTotals();
    expect(Object.keys(t).sort()).toEqual(['listening', 'reading', 'speaking', 'writing']);
    expect(t.writing).toEqual({ raw: 0, max: 0, count: 0 });
  });

  it('chỉ bài đã chấm xong mới được tính', () => {
    expect(gradedSkillScores(summary('submitted'))).toEqual([]);
    expect(gradedSkillScores(summary('not_submitted'))).toEqual([]);
    expect(gradedSkillScores(summary('graded'))).toEqual([{ skill: 'writing', raw: 4, max: 10 }]);
  });

  it('cộng điểm không sửa bản cũ, và đếm số bài', () => {
    const before = emptyTotals();
    const once = addSkillScores(before, [{ skill: 'reading', raw: 3, max: 4 }]);
    const twice = addSkillScores(once, [{ skill: 'reading', raw: 1, max: 2 }]);
    expect(before.reading).toEqual({ raw: 0, max: 0, count: 0 });
    expect(twice.reading).toEqual({ raw: 4, max: 6, count: 2 });
    expect(totalPercent(twice.reading)).toBe(67);
    expect(totalPercent(twice.speaking)).toBeNull();
  });
});

describe('phần trăm và dải màu', () => {
  it('làm tròn phần trăm và không chia cho 0', () => {
    expect(percentOf(7, 9)).toBe(78);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(0, 0)).toBeNull();
  });

  it('ranh giới 80, 60 và không có dữ liệu', () => {
    expect(bandOf(80)).toBe('good');
    expect(bandOf(79)).toBe('mid');
    expect(bandOf(60)).toBe('mid');
    expect(bandOf(59)).toBe('low');
    expect(bandOf(null)).toBe('none');
  });
});

describe('xu hướng qua các bài', () => {
  it('cần ít nhất hai bài có điểm', () => {
    expect(trendOf([])).toBe('none');
    expect(trendOf([50])).toBe('none');
    expect(trendOf([null, 50])).toBe('none');
  });

  it('chênh từ 5 điểm phần trăm trở lên mới là tăng hoặc giảm', () => {
    expect(trendOf([50, 60])).toBe('up');
    expect(trendOf([70, 60])).toBe('down');
    expect(trendOf([50, 53])).toBe('flat');
    expect(trendOf([50, 55])).toBe('up');
  });

  it('bỏ qua bài chưa có điểm kỹ năng này', () => {
    expect(trendOf([null, 40, null, 52])).toBe('up');
  });
});
