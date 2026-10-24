'use server';

// Ghi lượt chơi trò chơi từ vựng của học sinh (35.17) và lượt ôn hộp từ (35.18). Sao, lịch ôn tính trên máy chủ.
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { gamePlays, wordLists, wordReviews } from '@/db/schema';
import { GAME_LABELS, gameStars, type GameKind } from '@/lib/games';
import { enrolledStudent } from '@/lib/queries/student-portal';
import { addListToWordBox, getReviewCard, wordKey } from '@/lib/queries/word-box';
import { applyReview, nextReviewLabel } from '@/lib/review';
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
    // Chơi xong một trò thì các từ của danh sách vào hộp từ để ôn những ngày sau
    await addListToWordBox(student.id, parsed.data.listId);
    return { ok: true, stars };
  } catch (error) {
    console.error('Lỗi ghi lượt chơi:', error);
    return { ok: false };
  }
}

// Một lần ôn một từ trong hộp: đúng là nhớ, sai là quên. Trả lần ôn tới để màn ôn báo cho học sinh.
export async function reviewWordAction(input: { word: string; correct: boolean }): Promise<{ ok: true; next: string } | { ok: false }> {
  try {
    const parsed = z.object({ word: z.string().trim().min(1).max(60), correct: z.boolean() }).safeParse(input);
    if (!parsed.success) return { ok: false };
    const account = await getCurrentAccount();
    if (!account || account.role !== 'student' || account.studentId === null) return { ok: false };
    const row = await getReviewCard(account.studentId, wordKey(parsed.data.word));
    if (!row) return { ok: false };
    const now = new Date();
    const next = applyReview(row.card, parsed.data.correct, now);
    await db
      .update(wordReviews)
      .set({
        card: next.card,
        due: next.due,
        reviewCount: sql`${wordReviews.reviewCount} + 1`,
        wrongCount: parsed.data.correct ? wordReviews.wrongCount : sql`${wordReviews.wrongCount} + 1`,
        lastReviewedAt: now,
      })
      .where(eq(wordReviews.id, row.id));
    // Không làm mới trang: màn ôn đang mở sẽ bị dựng lại giữa chừng (từ vừa ôn hết hạn). Trang /cua-toi luôn đọc mới khi mở.
    return { ok: true, next: nextReviewLabel(next.due, now) };
  } catch (error) {
    console.error('Lỗi ghi lượt ôn từ:', error);
    return { ok: false };
  }
}
