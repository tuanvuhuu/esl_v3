import { describe, expect, it } from 'vitest';
import { assignmentStars, classGoal, stickerBook, STORIES, weeklyStreak } from '@/lib/motivation';

describe('động lực học', () => {
  it('sao theo bài: chưa nộp 0, chờ chấm 1, đã chấm 1–3 theo điểm; không có sao âm', () => {
    expect(assignmentStars('not_submitted', null, 10)).toBe(0);
    expect(assignmentStars('submitted', null, 10)).toBe(1);
    expect(assignmentStars('graded', 10, 10)).toBe(3);
    expect(assignmentStars('graded', 8, 10)).toBe(3);
    expect(assignmentStars('graded', 5, 10)).toBe(2);
    expect(assignmentStars('graded', 0, 10)).toBe(1);
  });

  it('sticker: cứ 5 sao mở một hình', () => {
    const book = stickerBook(12);
    expect(book.filter((s) => s.unlocked)).toHaveLength(2);
    expect(book[2]).toMatchObject({ need: 15, unlocked: false });
    expect(stickerBook(0).some((s) => s.unlocked)).toBe(false);
  });

  it('truyện mở theo ngưỡng sao tăng dần', () => {
    const needs = STORIES.map((s) => s.need);
    expect([...needs].sort((a, b) => a - b)).toEqual(needs);
    expect(new Set(STORIES.map((s) => s.slug)).size).toBe(STORIES.length);
  });

  it('chuỗi tuần: đếm các tuần liền nhau; tuần này chưa học thì chưa mất chuỗi', () => {
    const now = '2026-10-19'; // thứ Hai
    expect(weeklyStreak(['2026-10-19', '2026-10-12', '2026-10-05'], now)).toEqual({ weeks: 3, activeThisWeek: true });
    expect(weeklyStreak(['2026-10-12', '2026-10-05'], now)).toEqual({ weeks: 2, activeThisWeek: false });
    // Bỏ một tuần thì chuỗi tính lại
    expect(weeklyStreak(['2026-10-19', '2026-10-05'], now)).toEqual({ weeks: 1, activeThisWeek: true });
    expect(weeklyStreak(['2026-09-28'], now)).toEqual({ weeks: 0, activeThisWeek: false });
  });

  it('mục tiêu lớp: mỗi bạn 10 sao, phần trăm không quá 100', () => {
    expect(classGoal(54, 12)).toEqual({ stars: 54, target: 120, percent: 45, reached: false });
    expect(classGoal(130, 12)).toMatchObject({ percent: 100, reached: true });
    expect(classGoal(0, 0).target).toBe(10);
  });
});
