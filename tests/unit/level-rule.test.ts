import { describe, expect, it } from 'vitest';
import { checkLevelReadiness, suggestLevel, type LevelRow, type Thresholds } from '@/lib/level-rule';
import type { Skill } from '@/lib/assignment-scoring';

const all = (v: number): Record<Skill, number | null> => ({ listening: v, speaking: v, reading: v, writing: v });
const T70: Thresholds = { listening: 70, speaking: 70, reading: 70, writing: 70 };

const levels: LevelRow[] = [
  { id: 1, code: 'A1', name: 'Sơ cấp A1', sort: 1, thresholds: T70 },
  { id: 2, code: 'A2', name: 'Sơ cấp A2', sort: 2, thresholds: T70 },
  { id: 6, code: 'C2', name: 'Thành thạo C2', sort: 6, thresholds: {} },
];

describe('điều kiện gợi ý lên trình độ', () => {
  it('chưa đủ ba bài đã chấm thì chưa gợi ý dù điểm cao', () => {
    const c = checkLevelReadiness([all(95), all(95)], T70);
    expect(c.ready).toBe(false);
    expect(c.assignments).toBe(2);
  });

  it('ba bài đều đạt ngưỡng ở bốn kỹ năng thì gợi ý', () => {
    const c = checkLevelReadiness([all(70), all(80), all(90)], T70);
    expect(c.ready).toBe(true);
    expect(c.averages).toEqual({ listening: 80, speaking: 80, reading: 80, writing: 80 });
    expect(c.failing).toEqual([]);
  });

  it('chỉ xét ba bài gần nhất: hai bài cũ thấp không làm mất điều kiện', () => {
    const c = checkLevelReadiness([all(10), all(20), all(80), all(80), all(80)], T70);
    expect(c.assignments).toBe(3);
    expect(c.ready).toBe(true);
  });

  it('một kỹ năng trung bình dưới ngưỡng thì không gợi ý và nêu kỹ năng đó', () => {
    const recent = [
      { listening: 90, speaking: 90, reading: 90, writing: 50 },
      { listening: 90, speaking: 90, reading: 90, writing: 60 },
      { listening: 90, speaking: 90, reading: 90, writing: 70 },
    ];
    const c = checkLevelReadiness(recent, T70);
    expect(c.ready).toBe(false);
    expect(c.failing).toEqual(['writing']);
    expect(c.averages.writing).toBe(60);
  });

  it('kỹ năng không có điểm trong các bài được xét thì coi là thiếu', () => {
    const recent = [
      { listening: 90, speaking: 90, reading: null, writing: 90 },
      { listening: 90, speaking: 90, reading: null, writing: 90 },
      { listening: 90, speaking: 90, reading: null, writing: 90 },
    ];
    const c = checkLevelReadiness(recent, T70);
    expect(c.ready).toBe(false);
    expect(c.failing).toEqual(['reading']);
  });

  it('trình độ chưa đặt đủ ngưỡng (cao nhất) thì không bao giờ gợi ý', () => {
    expect(checkLevelReadiness([all(100), all(100), all(100)], {}).ready).toBe(false);
  });
});

describe('gợi ý theo trình độ hiện tại', () => {
  it('chưa xếp trình độ thì không có gợi ý', () => {
    expect(suggestLevel(null, levels, [all(90), all(90), all(90)])).toBeNull();
  });

  it('đang ở trình độ cao nhất thì không có trình độ kế tiếp', () => {
    expect(suggestLevel(levels[2], levels, [all(90), all(90), all(90)])).toBeNull();
  });

  it('trình độ kế tiếp là số thứ tự liền sau', () => {
    const s = suggestLevel(levels[0], levels, [all(90), all(90), all(90)]);
    expect(s?.next.code).toBe('A2');
    expect(s?.check.ready).toBe(true);
  });
});
