// Trình chiếu (35.19): dựng trang chiếu từ nguồn, đọc trạng thái lần chiếu. Chỉ chạy trên server.
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { assignments, presentSessions } from '@/db/schema';
import { listItemsOfAssignment } from '@/lib/queries/assignment-items';
import { getWordListHeader, getWordListItems } from '@/lib/queries/word-lists';
import { slidesFromItems, slidesFromWords, type PresentMode, type Slide } from '@/lib/presentation';

export type PresentSource = 'word_list' | 'assignment';

export async function buildSlides(kind: PresentSource, sourceId: number, mode: PresentMode, seed: number): Promise<{ title: string; slides: Slide[] } | null> {
  if (kind === 'word_list') {
    const head = await getWordListHeader(sourceId);
    if (!head) return null;
    return { title: head.name, slides: slidesFromWords(await getWordListItems(sourceId), mode, seed) };
  }
  const [a] = await db.select({ title: assignments.title }).from(assignments).where(eq(assignments.id, sourceId)).limit(1);
  if (!a) return null;
  const items = await listItemsOfAssignment(sourceId);
  return {
    title: a.title,
    slides: slidesFromItems(
      items.map((i) => ({
        itemType: i.itemType,
        prompt: i.prompt,
        promptVi: i.promptVi,
        passage: i.passage,
        imageFileId: i.imageFileId,
        audioFileId: i.audioFileId,
        referenceText: i.referenceText,
        options: i.options.map((o) => ({ label: o.label, imageFileId: o.imageFileId, isCorrect: o.isCorrect })),
        pairs: i.pairs.map((p) => ({ leftLabel: p.leftLabel, rightLabel: p.rightLabel })),
      })),
    ),
  };
}

export type PresentRow = typeof presentSessions.$inferSelect;

// Lần chiếu của chính tài khoản đang đăng nhập (token trong đường dẫn không đủ, phải đúng người tạo)
export async function getOwnPresentation(token: string, accountId: number): Promise<PresentRow | null> {
  const [row] = await db.select().from(presentSessions).where(and(eq(presentSessions.token, token), eq(presentSessions.accountId, accountId))).limit(1);
  return row ?? null;
}
