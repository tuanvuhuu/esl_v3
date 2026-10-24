'use server';

// Thêm bộ bài mẫu Starters vào một lớp (35.21): 3 bài đủ dạng câu (hạn 7 ngày) và một danh sách từ cho trò chơi.
// Bài hoặc danh sách cùng tên đã có trong lớp thì bỏ qua, nên bấm lại không tạo trùng. Không gửi tin bài mới cho phụ huynh
// (đây là bài mẫu để demo, giáo viên tự báo khi muốn giao thật).
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { assignments, classes, wordListItems, wordLists } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireClassAccess } from '@/lib/campus-access';
import { insertLessonItems } from '@/lib/demo';
import { STARTERS_SET } from '@/lib/sample-sets';
import { getCurrentAccount } from '@/lib/session';
import type { ActionResult } from '@/lib/validation/student';

export async function installSampleSetAction(classId: number): Promise<ActionResult> {
  try {
    await requirePermission('assignments.manage');
    if (!Number.isSafeInteger(classId) || classId <= 0) return { ok: false, message: 'Chưa chọn lớp.' };
    await requireClassAccess(classId);
    const [cls] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1);
    if (!cls) return { ok: false, message: 'Không tìm thấy lớp. Có thể đã bị xoá.' };
    const account = await getCurrentAccount();
    const set = STARTERS_SET;
    const due = new Date(Date.now() + 7 * 86_400_000);

    const added = await db.transaction(async (tx) => {
      let lessons = 0;
      for (const lesson of set.lessons) {
        const [exists] = await tx.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.classId, classId), eq(assignments.title, lesson.title))).limit(1);
        if (exists) continue;
        const [row] = await tx.insert(assignments).values({ classId, title: lesson.title, description: lesson.description, dueAt: due, maxScore: 10 }).returning({ id: assignments.id });
        await insertLessonItems(tx, row.id, lesson);
        lessons += 1;
      }
      let list = 0;
      const [hasList] = await tx.select({ id: wordLists.id }).from(wordLists).where(and(eq(wordLists.classId, classId), eq(wordLists.name, set.wordList.name))).limit(1);
      if (!hasList) {
        const [l] = await tx.insert(wordLists).values({ name: set.wordList.name, classId, createdByAccountId: account?.id ?? null }).returning({ id: wordLists.id });
        await tx.insert(wordListItems).values(set.wordList.words.map((w, i) => ({ listId: l.id, position: i + 1, word: w.word, meaningVi: w.meaningVi, emoji: w.emoji, sentence: w.sentence })));
        list = 1;
      }
      return { lessons, list };
    });

    if (added.lessons === 0 && added.list === 0) return { ok: true, message: `Lớp ${cls.name} đã có đủ ${set.name}` };
    await writeAudit({ action: 'create', entity: 'assignment', entityId: classId, summary: `Thêm ${set.name} vào lớp ${cls.name}: ${added.lessons} bài, ${added.list} danh sách từ` });
    revalidatePath('/bai-tap');
    revalidatePath('/tu-vung');
    return { ok: true, message: `Đã thêm ${added.lessons} bài mẫu${added.list ? ' và 1 danh sách từ' : ''} vào lớp ${cls.name}` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi thêm bộ bài mẫu:', error);
    return { ok: false, message: 'Không thêm được bộ bài mẫu. Thử lại sau ít phút.' };
  }
}
