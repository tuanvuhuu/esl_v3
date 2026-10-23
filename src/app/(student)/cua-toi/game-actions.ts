'use server';

// Ghi lượt chơi trò chơi từ vựng của học sinh (35.17). Sao tính trên máy chủ, không tin số sao từ trình duyệt.
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db/client';
import { gamePlays, wordLists } from '@/db/schema';
import { GAME_LABELS, gameStars, type GameKind } from '@/lib/games';
import { enrolledStudent } from '@/lib/queries/student-portal';
import { getCurrentAccount } from '@/lib/session';

const playSchema = z
  .object({
    listId: z.number().int().positive(),
    game: z.enum(Object.keys(GAME_LABELS) as [GameKind, ...GameKind[]]),
    correct: z.number().int().min(0).max(200),
    total: z.number().int().min(1).max(200),
  })
  .refine((v) => v.correct <= v.total);

export async function recordGamePlayAction(input: { listId: number; game: GameKind; correct: number; total: number }): Promise<{ ok: true; stars: number } | { ok: false }> {
  try {
    const parsed = playSchema.safeParse(input);
    if (!parsed.success) return { ok: false };
    const account = await getCurrentAccount();
    if (!account || account.role !== 'student' || account.studentId === null) return { ok: false };
    const student = await enrolledStudent(account.studentId);
    const [list] = await db.select({ classId: wordLists.classId }).from(wordLists).where(eq(wordLists.id, parsed.data.listId)).limit(1);
    if (!student || !list || (list.classId !== null && list.classId !== student.classId)) return { ok: false };
    const stars = gameStars(parsed.data.correct, parsed.data.total);
    await db.insert(gamePlays).values({ studentId: student.id, wordListId: parsed.data.listId, game: parsed.data.game, correct: parsed.data.correct, total: parsed.data.total, stars });
    revalidatePath('/cua-toi');
    return { ok: true, stars };
  } catch (error) {
    console.error('Lỗi ghi lượt chơi:', error);
    return { ok: false };
  }
}
