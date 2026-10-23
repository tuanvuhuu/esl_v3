'use server';

// Danh sách từ cho trò chơi (35.14): thêm, sửa, xoá. Sửa thì thay toàn bộ từ của danh sách.
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { uploadedFiles, wordListItems, wordLists } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireClassAccess, requireLessonAccess } from '@/lib/campus-access';
import { getWordListItems, type WordListItem } from '@/lib/queries/word-lists';
import { getCurrentAccount } from '@/lib/session';
import { wordListSchema, type WordListInput } from '@/lib/validation/word-list';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

function errorResult(error: unknown): ActionResult {
  if (error instanceof ForbiddenError) return { ok: false, message: error.message };
  console.error('Lỗi danh sách từ:', error);
  return { ok: false, message: 'Không lưu được. Thử lại sau ít phút.' };
}

// Danh sách gắn lớp thì chỉ người làm việc ở cơ sở của lớp mới đụng được
async function requireListAccess(id: number): Promise<{ name: string }> {
  const [row] = await db.select({ name: wordLists.name, classId: wordLists.classId, lessonId: wordLists.lessonId }).from(wordLists).where(eq(wordLists.id, id)).limit(1);
  if (!row) throw new ForbiddenError('Không tìm thấy danh sách từ này. Có thể đã bị xoá.');
  if (row.classId) await requireClassAccess(row.classId);
  if (row.lessonId) await requireLessonAccess(row.lessonId);
  return { name: row.name };
}

async function checked(input: WordListInput) {
  const parsed = wordListSchema.safeParse(input);
  if (!parsed.success) return { error: { ok: false, message: parsed.error.issues[0]?.message ?? 'Vui lòng kiểm tra lại các ô.', fieldErrors: fieldErrorsFrom(parsed.error) } as ActionResult };
  const v = parsed.data;
  if (v.classId) await requireClassAccess(v.classId);
  if (v.lessonId) await requireLessonAccess(v.lessonId);
  const fileIds = [...new Set(v.items.flatMap((i) => [i.imageFileId, i.audioFileId]).filter((x): x is number => x !== null))];
  if (fileIds.length > 0) {
    const found = await db.select({ id: uploadedFiles.id }).from(uploadedFiles).where(inArray(uploadedFiles.id, fileIds));
    if (found.length !== fileIds.length) return { error: { ok: false, message: 'Có tệp tranh hoặc âm thanh không còn. Tải lại rồi lưu.' } as ActionResult };
  }
  return { value: v };
}

const itemRows = (listId: number, items: ReturnType<typeof wordListSchema.parse>['items']) =>
  items.map((i, idx) => ({ listId, position: idx + 1, word: i.word, meaningVi: i.meaningVi, emoji: i.emoji, imageFileId: i.imageFileId, audioFileId: i.audioFileId, vocabItemId: i.vocabItemId }));

export async function createWordListAction(input: WordListInput): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const c = await checked(input);
    if ('error' in c) return c.error!;
    const v = c.value;
    const account = await getCurrentAccount();
    const id = await db.transaction(async (tx) => {
      const [row] = await tx.insert(wordLists).values({ name: v.name, classId: v.classId, lessonId: v.lessonId, createdByAccountId: account?.id ?? null }).returning({ id: wordLists.id });
      await tx.insert(wordListItems).values(itemRows(row.id, v.items));
      return row.id;
    });
    await writeAudit({ action: 'create', entity: 'word_list', entityId: id, summary: `Thêm danh sách từ ${v.name} (${v.items.length} từ)` });
    revalidatePath('/tu-vung');
    return { ok: true, message: `Đã thêm danh sách ${v.name} (${v.items.length} từ)` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateWordListAction(id: number, input: WordListInput): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    await requireListAccess(id);
    const c = await checked(input);
    if ('error' in c) return c.error!;
    const v = c.value;
    await db.transaction(async (tx) => {
      await tx.update(wordLists).set({ name: v.name, classId: v.classId, lessonId: v.lessonId, updatedAt: new Date() }).where(eq(wordLists.id, id));
      await tx.delete(wordListItems).where(eq(wordListItems.listId, id));
      await tx.insert(wordListItems).values(itemRows(id, v.items));
    });
    await writeAudit({ action: 'update', entity: 'word_list', entityId: id, summary: `Sửa danh sách từ ${v.name} (${v.items.length} từ)` });
    revalidatePath('/tu-vung');
    return { ok: true, message: `Đã lưu danh sách ${v.name}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteWordListAction(id: number): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    const { name } = await requireListAccess(id);
    await db.delete(wordLists).where(eq(wordLists.id, id));
    await writeAudit({ action: 'delete', entity: 'word_list', entityId: id, summary: `Xoá danh sách từ ${name}` });
    revalidatePath('/tu-vung');
    return { ok: true, message: `Đã xoá danh sách ${name}` };
  } catch (error) {
    return errorResult(error);
  }
}

export async function loadWordListAction(id: number): Promise<{ ok: true; items: WordListItem[] } | { ok: false; message: string }> {
  try {
    await requirePermission('students.view');
    await requireListAccess(id);
    return { ok: true, items: await getWordListItems(id) };
  } catch (error) {
    const r = errorResult(error);
    return { ok: false, message: r.message ?? 'Không đọc được' };
  }
}
