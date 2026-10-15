'use server';

import { inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { uploadedFiles } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { listOrphanFiles } from '@/lib/queries/files';
import { removeUploadFile } from '@/lib/storage';
import type { ActionResult } from '@/lib/validation/student';

// Dọn tệp tải lên không còn dùng và đã quá 24 giờ: xoá trên ổ đĩa rồi xoá dòng trong bảng.
// Tệp mới tải lên (dưới 24 giờ) được giữ, vì có thể giáo viên chưa bấm lưu.
export async function cleanupOrphanFilesAction(): Promise<ActionResult> {
  try {
    await requirePermission('settings.manage');
    const orphans = await listOrphanFiles();
    if (orphans.length === 0) return { ok: true, message: 'Không có tệp nào cần dọn' };

    for (const f of orphans) await removeUploadFile(f.storageKey);
    await db.delete(uploadedFiles).where(inArray(uploadedFiles.id, orphans.map((f) => f.id)));

    const mb = (orphans.reduce((sum, f) => sum + f.sizeBytes, 0) / (1024 * 1024)).toFixed(1);
    await writeAudit({ action: 'delete', entity: 'uploaded_files', entityId: 'cleanup', summary: `Dọn ${orphans.length} tệp không còn dùng (${mb} MB)` });
    revalidatePath('/cai-dat');
    return { ok: true, message: `Đã dọn ${orphans.length} tệp, giải phóng ${mb} MB` };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi dọn tệp:', error);
    return { ok: false, message: 'Không dọn được tệp. Thử lại sau ít phút.' };
  }
}
