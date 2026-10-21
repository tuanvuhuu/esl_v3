'use server';

// Kho từ cho Soạn nhanh (P36.4). Ai soạn bài tập được đọc kho và thêm từ; người có quyền Cài đặt duyệt từ giáo viên thêm.
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { vocabItems } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { hasPermission } from '@/lib/permissions';
import { existingHeadwords, listPendingVocab, listVocabTopics, listVocabWords, lookupVocab, type VocabWord } from '@/lib/queries/vocab';
import { getCurrentAccount } from '@/lib/session';
import { levelsUpTo } from '@/lib/vocab-topics';

type Fail = { ok: false; message: string };

function fail(error: unknown): Fail {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi kho từ:', error);
  return { ok: false, message: 'Không tải được kho từ. Thử lại sau ít phút.' };
}

async function me() {
  const granted = await requirePermission('assignments.manage');
  const account = await getCurrentAccount();
  if (!account) throw new ForbiddenError();
  return { accountId: account.id, canApprove: hasPermission(granted, 'settings.manage') };
}

const levelSchema = z.string().trim().max(10);

export type VocabLoad = {
  ok: true;
  topics: { topic: string; total: number; withMeaning: number }[];
  words: VocabWord[];
  canApprove: boolean;
  pending: VocabWord[];
};

// Chủ đề và từ của một chủ đề ở trình độ này và thấp hơn. topic rỗng (null) thì lấy chủ đề đầu tiên có nhiều từ có nghĩa nhất.
export async function loadVocabAction(levelCode: string, topic: string | null): Promise<VocabLoad | Fail> {
  try {
    const { accountId, canApprove } = await me();
    const levels = levelsUpTo(levelSchema.parse(levelCode));
    const topics = await listVocabTopics(levels, accountId);
    const chosen = topic ?? topics[0]?.topic ?? '';
    const words = topics.some((t) => t.topic === chosen) ? await listVocabWords(levels, chosen, accountId) : [];
    const pending = canApprove ? await listPendingVocab() : [];
    return { ok: true, topics, words, canApprove, pending };
  } catch (error) {
    return fail(error);
  }
}

// Tra nghĩa và emoji cho các từ giáo viên dán vào
export async function lookupVocabAction(headwords: string[]): Promise<{ ok: true; words: VocabWord[] } | Fail> {
  try {
    const { accountId } = await me();
    const list = z.array(z.string().max(60)).max(200).parse(headwords);
    return { ok: true, words: await lookupVocab(list, accountId) };
  } catch (error) {
    return fail(error);
  }
}

const newWordSchema = z.object({
  en: z.string().trim().min(1).max(60),
  vi: z.string().trim().min(1, 'Từ cần có nghĩa tiếng Việt').max(120),
  emoji: z.string().trim().max(16).default(''),
});

// Lưu từ giáo viên dán vào (có nghĩa) vào kho chung.
// Từ chưa có trong kho: thêm mới, chờ duyệt (người có quyền Cài đặt thì duyệt luôn).
// Từ CEFR-J đã có nhưng chưa có nghĩa: bổ sung nghĩa và emoji. Từ đã có nghĩa: bỏ qua, không ghi đè.
export async function saveVocabWordsAction(input: { en: string; vi: string; emoji: string }[], levelCode: string): Promise<{ ok: true; added: number; filled: number; skipped: number; message: string } | Fail> {
  try {
    const { accountId, canApprove } = await me();
    const words = z.array(newWordSchema).min(1).max(100).parse(input);
    const level = levelSchema.parse(levelCode) || 'A1';
    const hasMeaning = await existingHeadwords(words.map((w) => w.en));
    let added = 0;
    let filled = 0;
    let skipped = 0;
    await db.transaction(async (tx) => {
      for (const w of words) {
        const key = w.en.toLowerCase();
        if (hasMeaning.has(key)) {
          skipped++;
          continue;
        }
        const updated = await tx
          .update(vocabItems)
          .set({ meaningVi: w.vi, emoji: sql`case when ${vocabItems.emoji} = '' then ${w.emoji} else ${vocabItems.emoji} end`, updatedAt: new Date() })
          .where(and(sql`lower(${vocabItems.headword}) = ${key}`, eq(vocabItems.meaningVi, '')))
          .returning({ id: vocabItems.id });
        if (updated.length > 0) {
          filled++;
          continue;
        }
        const inserted = await tx
          .insert(vocabItems)
          .values({ headword: w.en, level, topic: '', meaningVi: w.vi, emoji: w.emoji, source: 'teacher', approved: canApprove, createdByAccountId: accountId })
          .onConflictDoNothing()
          .returning({ id: vocabItems.id });
        if (inserted.length > 0) added++;
        else skipped++;
      }
    });
    await writeAudit({ action: 'create', entity: 'vocab', entityId: accountId, summary: `Kho từ: thêm ${added}, bổ sung nghĩa ${filled}, bỏ qua ${skipped}` });
    const parts = [added && `thêm ${added} từ${canApprove ? '' : ' (chờ duyệt)'}`, filled && `bổ sung nghĩa ${filled} từ`, skipped && `${skipped} từ đã có`].filter(Boolean);
    return { ok: true, added, filled, skipped, message: `Kho từ: ${parts.join(', ')}.` };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? 'Từ không hợp lệ' };
    return fail(error);
  }
}

// Duyệt hoặc bỏ một từ chờ duyệt (chỉ người có quyền Cài đặt)
export async function reviewVocabAction(id: number, approve: boolean): Promise<{ ok: true } | Fail> {
  try {
    await requirePermission('settings.manage');
    const wordId = z.number().int().positive().parse(id);
    const [row] = await db.select({ en: vocabItems.headword, approved: vocabItems.approved }).from(vocabItems).where(eq(vocabItems.id, wordId)).limit(1);
    if (!row || row.approved) return { ok: false, message: 'Từ này không còn chờ duyệt.' };
    if (approve) await db.update(vocabItems).set({ approved: true, updatedAt: new Date() }).where(eq(vocabItems.id, wordId));
    else await db.delete(vocabItems).where(and(eq(vocabItems.id, wordId), eq(vocabItems.approved, false)));
    await writeAudit({ action: approve ? 'approve' : 'delete', entity: 'vocab', entityId: wordId, summary: `${approve ? 'Duyệt' : 'Bỏ'} từ "${row.en}" trong kho từ` });
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
