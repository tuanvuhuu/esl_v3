// Kho từ cho Soạn nhanh (P36.4). Chỉ chạy trên server.
// Mỗi người thấy từ đã duyệt và từ chính mình thêm (chưa duyệt). Người duyệt thấy thêm danh sách chờ duyệt.
import { and, asc, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { vocabItems } from '@/db/schema';

export type VocabWord = {
  id: number;
  en: string;
  vi: string;
  emoji: string;
  topic: string;
  level: string;
  approved: boolean;
  source: string;
};

const visible = (accountId: number) => or(eq(vocabItems.approved, true), eq(vocabItems.createdByAccountId, accountId));

const columns = {
  id: vocabItems.id,
  en: vocabItems.headword,
  vi: vocabItems.meaningVi,
  emoji: vocabItems.emoji,
  topic: vocabItems.topic,
  level: vocabItems.level,
  approved: vocabItems.approved,
  source: vocabItems.source,
};

// Chủ đề có từ ở các trình độ cho trước, kèm số từ và số từ đã có nghĩa
export async function listVocabTopics(levels: string[], accountId: number) {
  return db
    .select({ topic: vocabItems.topic, total: count(), withMeaning: sql<number>`count(*) filter (where ${vocabItems.meaningVi} <> '')`.mapWith(Number) })
    .from(vocabItems)
    .where(and(inArray(vocabItems.level, levels), visible(accountId)))
    .groupBy(vocabItems.topic)
    .orderBy(desc(sql`count(*) filter (where ${vocabItems.meaningVi} <> '')`), asc(vocabItems.topic));
}

// Từ của một chủ đề: từ đã có nghĩa lên trước, rồi theo trình độ và chữ cái
export async function listVocabWords(levels: string[], topic: string, accountId: number, limit = 400): Promise<VocabWord[]> {
  return db
    .select(columns)
    .from(vocabItems)
    .where(and(inArray(vocabItems.level, levels), eq(vocabItems.topic, topic), visible(accountId)))
    .orderBy(sql`${vocabItems.meaningVi} = ''`, sql`array_position(array['Pre-A1','A1','A2','B1','B2','C1','C2']::text[], ${vocabItems.level})`, asc(vocabItems.headword))
    .limit(limit);
}

// Tra nghĩa và emoji cho danh sách giáo viên dán vào (không phân biệt hoa thường). Ưu tiên dòng đã có nghĩa.
export async function lookupVocab(headwords: string[], accountId: number): Promise<VocabWord[]> {
  const keys = [...new Set(headwords.map((h) => h.trim().toLowerCase()).filter(Boolean))].slice(0, 200);
  if (keys.length === 0) return [];
  return db
    .select(columns)
    .from(vocabItems)
    .where(and(inArray(sql`lower(${vocabItems.headword})`, keys), visible(accountId)))
    .orderBy(sql`${vocabItems.meaningVi} = ''`, asc(vocabItems.id));
}

export async function listPendingVocab(): Promise<VocabWord[]> {
  return db.select(columns).from(vocabItems).where(eq(vocabItems.approved, false)).orderBy(asc(vocabItems.createdAt)).limit(200);
}

export async function existingHeadwords(headwords: string[]): Promise<Set<string>> {
  const keys = [...new Set(headwords.map((h) => h.trim().toLowerCase()))];
  if (keys.length === 0) return new Set();
  const rows = await db.select({ en: vocabItems.headword, vi: vocabItems.meaningVi }).from(vocabItems).where(inArray(sql`lower(${vocabItems.headword})`, keys));
  // Từ đã có trong kho với nghĩa thì không thêm lại; từ CEFR-J chưa có nghĩa thì được bổ sung nghĩa
  return new Set(rows.filter((r) => r.vi).map((r) => r.en.toLowerCase()));
}
