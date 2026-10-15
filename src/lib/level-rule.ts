// Gợi ý lên trình độ (P27). Hàm thuần, không đụng cơ sở dữ liệu, có unit test.
// Quy tắc: ba bài đã chấm gần nhất đều có, và trung bình từng kỹ năng đạt ngưỡng của trình độ hiện tại.
// Hệ thống chỉ gợi ý. Giáo viên xác nhận thì mới ghi sự kiện và đổi trình độ.
import { SKILLS, type Skill } from '@/lib/assignment-scoring';

export const LEVEL_WINDOW = 3; // số bài đã chấm gần nhất được xét

export type Thresholds = Partial<Record<Skill, number>>; // ngưỡng phần trăm theo kỹ năng; thiếu là chưa đặt

export type LevelRow = { id: number; code: string; name: string; sort: number; thresholds: Thresholds };

export type LevelCheck = {
  ready: boolean; // đủ điều kiện gợi ý lên trình độ kế tiếp
  averages: Record<Skill, number | null>; // trung bình các bài được xét, làm tròn
  failing: Skill[]; // kỹ năng chưa đạt ngưỡng, hoặc chưa có điểm trong các bài được xét
  assignments: number; // số bài được xét, tối đa LEVEL_WINDOW
};

// recent: phần trăm từng kỹ năng của các bài đã chấm, theo thứ tự cũ đến mới. Chỉ xét các bài cuối.
export function checkLevelReadiness(recent: Record<Skill, number | null>[], thresholds: Thresholds): LevelCheck {
  const window = recent.slice(-LEVEL_WINDOW);
  const averages = Object.fromEntries(
    SKILLS.map((s) => {
      const values = window.map((r) => r[s]).filter((v): v is number => v !== null);
      return [s, values.length === 0 ? null : Math.round(values.reduce((a, b) => a + b, 0) / values.length)];
    }),
  ) as Record<Skill, number | null>;

  const hasAllThresholds = SKILLS.every((s) => thresholds[s] !== undefined);
  const failing = SKILLS.filter((s) => {
    const min = thresholds[s];
    const avg = averages[s];
    return min !== undefined && (avg === null || avg < min);
  });
  return {
    ready: window.length === LEVEL_WINDOW && hasAllThresholds && failing.length === 0,
    averages,
    failing,
    assignments: window.length,
  };
}

// Trình độ kế tiếp là trình độ có số thứ tự liền sau. Không có trình độ kế tiếp (đang ở cao nhất) thì không có kết quả kiểm.
// Kết quả kiểm để hiện "còn thiếu" cho giáo viên; chỉ khi check.ready mới hiện gợi ý lên.
export function suggestLevel(
  current: LevelRow | null,
  levels: LevelRow[],
  recent: Record<Skill, number | null>[],
): { next: LevelRow; check: LevelCheck } | null {
  if (!current) return null;
  const next = levels.find((l) => l.sort === current.sort + 1);
  if (!next) return null;
  return { next, check: checkLevelReadiness(recent, current.thresholds) };
}
