'use server';

// Trình chiếu (35.19): tạo lần chiếu, chuyển trang, đổi kiểu chiếu. Máy chiếu và điện thoại gọi cùng các hàm này.
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { presentSessions, wordLists } from '@/db/schema';
import { ForbiddenError, requirePermission } from '@/lib/authz';
import { requireAssignmentAccess, requireClassAccess } from '@/lib/campus-access';
import { PRESENT_MODES, stepPresentation, type PresentMode, type PresentState, type PresentStep } from '@/lib/presentation';
import { buildSlides, getOwnPresentation, type PresentSource } from '@/lib/queries/presentation';
import { getCurrentAccount } from '@/lib/session';

export type PresentSnapshot = PresentState & { version: number; mode: PresentMode };
type Result<T> = ({ ok: true } & T) | { ok: false; message: string };

const modeSchema = z.enum(Object.keys(PRESENT_MODES) as [PresentMode, ...PresentMode[]]);

function fail(error: unknown): { ok: false; message: string } {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi trình chiếu:', error);
  return { ok: false, message: 'Không trình chiếu được. Thử lại sau ít phút.' };
}

export async function createPresentationAction(kind: PresentSource, sourceId: number, mode: PresentMode = 'flash'): Promise<Result<{ token: string }>> {
  try {
    await requirePermission('students.view');
    const parsed = z.object({ kind: z.enum(['word_list', 'assignment']), sourceId: z.number().int().positive(), mode: modeSchema }).safeParse({ kind, sourceId, mode });
    if (!parsed.success) return { ok: false, message: 'Không rõ nội dung cần chiếu.' };
    if (kind === 'assignment') await requireAssignmentAccess(sourceId);
    else {
      const [list] = await db.select({ classId: wordLists.classId }).from(wordLists).where(eq(wordLists.id, sourceId)).limit(1);
      if (list?.classId) await requireClassAccess(list.classId);
    }
    const account = await getCurrentAccount();
    if (!account) return { ok: false, message: 'Cần đăng nhập.' };
    const seed = Math.floor(Math.random() * 1_000_000);
    const built = await buildSlides(kind, sourceId, parsed.data.mode, seed);
    if (!built) return { ok: false, message: 'Không tìm thấy nội dung. Có thể đã bị xoá.' };
    if (built.slides.length === 0) return { ok: false, message: kind === 'assignment' ? 'Bài chưa có câu hỏi để chiếu.' : 'Danh sách chưa có từ để chiếu.' };
    const token = randomBytes(12).toString('base64url');
    await db.insert(presentSessions).values({ token, accountId: account.id, sourceKind: kind, sourceId, mode: parsed.data.mode, seed, total: built.slides.length });
    return { ok: true, token };
  } catch (error) {
    return fail(error);
  }
}

const stepSchema = z.object({ op: z.enum(['next', 'prev', 'reveal', 'hide', 'goto']), to: z.number().int().min(0).max(1000).optional() });

export async function stepPresentationAction(token: string, step: PresentStep): Promise<Result<{ state: PresentSnapshot }>> {
  try {
    const parsed = stepSchema.safeParse(step);
    if (!parsed.success) return { ok: false, message: 'Bước chuyển không hợp lệ.' };
    const account = await getCurrentAccount();
    if (!account) return { ok: false, message: 'Cần đăng nhập.' };
    const row = await getOwnPresentation(token, account.id);
    if (!row) return { ok: false, message: 'Không tìm thấy lần trình chiếu này.' };
    const next = stepPresentation({ slide: row.slide, revealed: row.revealed }, parsed.data, row.total);
    const [saved] = await db
      .update(presentSessions)
      .set({ slide: next.slide, revealed: next.revealed, version: row.version + 1, updatedAt: new Date() })
      .where(and(eq(presentSessions.id, row.id)))
      .returning({ slide: presentSessions.slide, revealed: presentSessions.revealed, version: presentSessions.version, mode: presentSessions.mode });
    return { ok: true, state: { ...saved, mode: saved.mode as PresentMode } };
  } catch (error) {
    return fail(error);
  }
}

// Đổi kiểu chiếu (chỉ danh sách từ): về trang đầu, ẩn đáp án
export async function setPresentModeAction(token: string, mode: PresentMode): Promise<Result<{ state: PresentSnapshot }>> {
  try {
    const parsed = modeSchema.safeParse(mode);
    if (!parsed.success) return { ok: false, message: 'Kiểu chiếu không hợp lệ.' };
    const account = await getCurrentAccount();
    if (!account) return { ok: false, message: 'Cần đăng nhập.' };
    const row = await getOwnPresentation(token, account.id);
    if (!row || row.sourceKind !== 'word_list') return { ok: false, message: 'Không đổi được kiểu chiếu.' };
    const [saved] = await db
      .update(presentSessions)
      .set({ mode: parsed.data, slide: 0, revealed: false, version: row.version + 1, updatedAt: new Date() })
      .where(eq(presentSessions.id, row.id))
      .returning({ slide: presentSessions.slide, revealed: presentSessions.revealed, version: presentSessions.version, mode: presentSessions.mode });
    return { ok: true, state: { ...saved, mode: saved.mode as PresentMode } };
  } catch (error) {
    return fail(error);
  }
}
