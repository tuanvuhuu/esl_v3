// Danh sách từ cho trò chơi (35.14). Chỉ chạy trên server.
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { wordListItems } from '@/db/schema';
import type { CampusScope } from '@/lib/campus';

export type WordListRow = { id: number; name: string; classId: number | null; className: string | null; lessonId: number | null; lessonTitle: string | null; wordCount: number; preview: string };
export type WordListItem = { word: string; meaningVi: string; emoji: string; imageFileId: number | null; audioFileId: number | null; vocabItemId: number | null };

// Theo cơ sở đang xem: danh sách gắn lớp thuộc cơ sở đó, cùng danh sách không gắn lớp (dùng chung)
export async function listWordLists(scope: CampusScope, allowedCampusIds: number[] | null): Promise<WordListRow[]> {
  const campusOk = scope !== null ? sql`c.campus_id = ${scope}` : allowedCampusIds === null ? sql`true` : sql`c.campus_id = ANY(${`{${allowedCampusIds.join(',')}}`}::int[])`;
  const rows = await db.execute<{ id: number; name: string; class_id: number | null; class_name: string | null; lesson_id: number | null; lesson_title: string | null; word_count: number; preview: string | null }>(sql`
    SELECT wl.id, wl.name, wl.class_id, c.name AS class_name, wl.lesson_id, l.title AS lesson_title,
      (SELECT COUNT(*)::int FROM word_list_items i WHERE i.list_id = wl.id) AS word_count,
      (SELECT string_agg(i.word, ', ' ORDER BY i.position) FROM (SELECT word, position FROM word_list_items WHERE list_id = wl.id ORDER BY position LIMIT 6) i) AS preview
    FROM word_lists wl
    LEFT JOIN classes c ON c.id = wl.class_id
    LEFT JOIN lessons l ON l.id = wl.lesson_id
    WHERE wl.class_id IS NULL OR ${campusOk}
    ORDER BY wl.updated_at DESC, wl.id DESC`);
  return rows.rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    classId: r.class_id === null ? null : Number(r.class_id),
    className: r.class_name,
    lessonId: r.lesson_id === null ? null : Number(r.lesson_id),
    lessonTitle: r.lesson_title,
    wordCount: Number(r.word_count),
    preview: r.preview ?? '',
  }));
}

export async function getWordListItems(listId: number): Promise<WordListItem[]> {
  return db
    .select({ word: wordListItems.word, meaningVi: wordListItems.meaningVi, emoji: wordListItems.emoji, imageFileId: wordListItems.imageFileId, audioFileId: wordListItems.audioFileId, vocabItemId: wordListItems.vocabItemId })
    .from(wordListItems)
    .where(eq(wordListItems.listId, listId))
    .orderBy(asc(wordListItems.position));
}
