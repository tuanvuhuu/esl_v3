// Hộp từ của học sinh (35.18): thêm từ của một danh sách vào hộp, đếm từ cần ôn, lấy từ để ôn và từ làm phương án nhiễu.
import { and, asc, eq, lt, notInArray, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { wordListItems, wordReviews } from '@/db/schema';
import type { GameWord } from '@/lib/games';
import { DAILY_REVIEW_LIMIT, endOfTodayVN, newReviewCard, type StoredCard } from '@/lib/review';

export type BoxWord = GameWord & { key: string };

const boxWordFields = {
  key: wordReviews.wordKey,
  word: wordReviews.word,
  meaningVi: wordReviews.meaningVi,
  emoji: wordReviews.emoji,
  imageFileId: wordReviews.imageFileId,
  audioFileId: wordReviews.audioFileId,
};
const asGameWord = (r: { key: string; word: string; meaningVi: string; emoji: string; imageFileId: number | null; audioFileId: number | null }): BoxWord => ({ ...r, sentence: '' });

export const wordKey = (word: string) => word.trim().toLowerCase();

// Từ của danh sách vào hộp: từ mới thì thêm thẻ đến hạn ngay; từ đã có thì chỉ cập nhật nghĩa, tranh, âm thanh, giữ lịch ôn
export async function addListToWordBox(studentId: number, listId: number, now: Date = new Date()): Promise<void> {
  const items = await db
    .select({ word: wordListItems.word, meaningVi: wordListItems.meaningVi, emoji: wordListItems.emoji, imageFileId: wordListItems.imageFileId, audioFileId: wordListItems.audioFileId })
    .from(wordListItems)
    .where(eq(wordListItems.listId, listId))
    .orderBy(asc(wordListItems.position));
  const seen = new Set<string>();
  const rows = items
    .filter((i) => {
      const k = wordKey(i.word);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((i) => {
      const fresh = newReviewCard(now);
      return { studentId, wordKey: wordKey(i.word), word: i.word.trim(), meaningVi: i.meaningVi, emoji: i.emoji, imageFileId: i.imageFileId, audioFileId: i.audioFileId, wordListId: listId, card: fresh.card, due: fresh.due };
    });
  if (rows.length === 0) return;
  await db
    .insert(wordReviews)
    .values(rows)
    .onConflictDoUpdate({
      target: [wordReviews.studentId, wordReviews.wordKey],
      set: {
        word: sql`excluded.word`,
        meaningVi: sql`excluded.meaning_vi`,
        emoji: sql`excluded.emoji`,
        imageFileId: sql`excluded.image_file_id`,
        audioFileId: sql`excluded.audio_file_id`,
        wordListId: sql`excluded.word_list_id`,
      },
    });
}

export async function wordBoxSummary(studentId: number, now: Date = new Date()): Promise<{ total: number; dueToday: number; nextDue: Date | null }> {
  const end = endOfTodayVN(now);
  const rows = await db.execute<{ total: number; due_today: number; next_due: Date | string | null }>(sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE due < ${end})::int AS due_today,
           MIN(due) FILTER (WHERE due >= ${end}) AS next_due
    FROM word_reviews WHERE student_id = ${studentId}`);
  const r = rows.rows[0];
  return { total: Number(r?.total ?? 0), dueToday: Math.min(Number(r?.due_today ?? 0), DAILY_REVIEW_LIMIT), nextDue: r?.next_due ? new Date(r.next_due) : null };
}

// Từ cần ôn hôm nay (hạn sớm trước, tối đa 10) và tối đa 30 từ khác trong hộp làm phương án nhiễu
export async function reviewSession(studentId: number, now: Date = new Date()): Promise<{ due: BoxWord[]; others: BoxWord[] }> {
  const due = await db
    .select(boxWordFields)
    .from(wordReviews)
    .where(and(eq(wordReviews.studentId, studentId), lt(wordReviews.due, endOfTodayVN(now))))
    .orderBy(asc(wordReviews.due))
    .limit(DAILY_REVIEW_LIMIT);
  const others =
    due.length === 0
      ? []
      : await db
          .select(boxWordFields)
          .from(wordReviews)
          .where(and(eq(wordReviews.studentId, studentId), notInArray(wordReviews.wordKey, due.map((d) => d.key))))
          .orderBy(sql`random()`)
          .limit(30);
  return { due: due.map(asGameWord), others: others.map(asGameWord) };
}

export async function getReviewCard(studentId: number, key: string): Promise<{ id: number; card: StoredCard } | null> {
  const [row] = await db.select({ id: wordReviews.id, card: wordReviews.card }).from(wordReviews).where(and(eq(wordReviews.studentId, studentId), eq(wordReviews.wordKey, key))).limit(1);
  return row ? { id: row.id, card: row.card as StoredCard } : null;
}
