// Trình độ và ngưỡng (P27). Chỉ chạy trên server.
import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { courseLevels, levelThresholds } from '@/db/schema';
import type { LevelRow, Thresholds } from '@/lib/level-rule';

// Mọi trình độ theo thứ tự, kèm ngưỡng từng kỹ năng
export async function listLevels(): Promise<LevelRow[]> {
  const levels = await db.select({ id: courseLevels.id, code: courseLevels.code, name: courseLevels.name, sort: courseLevels.sort }).from(courseLevels).orderBy(asc(courseLevels.sort));
  if (levels.length === 0) return [];
  const rows = await db.select({ levelId: levelThresholds.levelId, skill: levelThresholds.skill, minPercent: levelThresholds.minPercent }).from(levelThresholds);
  return levels.map((l) => ({
    ...l,
    thresholds: Object.fromEntries(rows.filter((r) => r.levelId === l.id).map((r) => [r.skill, r.minPercent])) as Thresholds,
  }));
}
