// Thống kê kỹ năng của học sinh và của lớp (P26). Hàm thuần, không đụng cơ sở dữ liệu, có unit test.
import { SKILLS, SKILL_LABELS, type Skill, type SubmissionSummary } from '@/lib/assignment-scoring';

export type SkillTotal = { raw: number; max: number; count: number }; // count: số bài đã chấm có câu kỹ năng này
export type SkillTotals = Record<Skill, SkillTotal>;

// Một bài đã chấm xong: điểm từng kỹ năng trong bài
export type SkillPoint = { assignmentId: number; title: string; dueAt: string; percent: Record<Skill, number | null> };

export const SKILL_ORDER: readonly Skill[] = SKILLS;
export { SKILL_LABELS };

export function emptyTotals(): SkillTotals {
  return Object.fromEntries(SKILLS.map((s) => [s, { raw: 0, max: 0, count: 0 }])) as SkillTotals;
}

// Chỉ bài đã chấm đủ mới đưa vào thống kê. Bài đang chấm dở thì không tính.
export function gradedSkillScores(summary: SubmissionSummary): { skill: Skill; raw: number; max: number }[] {
  return summary.status === 'graded' ? summary.skills : [];
}

// Phần trăm làm đúng, làm tròn. Không có điểm tối đa thì không có phần trăm.
export function percentOf(raw: number, max: number): number | null {
  if (max <= 0) return null;
  return Math.round((raw / max) * 100);
}

// Cộng điểm một bài vào tổng của học sinh (trả về bản mới, không sửa bản cũ)
export function addSkillScores(totals: SkillTotals, scores: { skill: Skill; raw: number; max: number }[]): SkillTotals {
  const next = { ...totals };
  for (const s of scores) {
    const cur = next[s.skill];
    next[s.skill] = { raw: cur.raw + s.raw, max: cur.max + s.max, count: cur.count + 1 };
  }
  return next;
}

export function totalPercent(total: SkillTotal): number | null {
  return percentOf(total.raw, total.max);
}

// Dải màu theo phần trăm: từ 80 là tốt, 60 đến 79 là khá, dưới 60 cần cố gắng, không có dữ liệu thì để trống
export type Band = 'good' | 'mid' | 'low' | 'none';

export function bandOf(percent: number | null): Band {
  if (percent === null) return 'none';
  if (percent >= 80) return 'good';
  if (percent >= 60) return 'mid';
  return 'low';
}

export const BAND_LABEL: Record<Band, string> = { good: 'Từ 80%', mid: '60–79%', low: 'Dưới 60%', none: 'Chưa có' };

// Xu hướng qua các bài: so bài đầu với bài cuối trong dãy có điểm. Chênh từ 5 điểm phần trăm trở lên mới tính là tăng hoặc giảm.
export type Trend = 'up' | 'down' | 'flat' | 'none';

export function trendOf(percents: (number | null)[]): Trend {
  const known = percents.filter((p): p is number => p !== null);
  if (known.length < 2) return 'none';
  const diff = known[known.length - 1] - known[0];
  if (diff >= 5) return 'up';
  if (diff <= -5) return 'down';
  return 'flat';
}
