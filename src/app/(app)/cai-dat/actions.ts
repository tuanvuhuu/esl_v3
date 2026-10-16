'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { centerSettings } from '@/db/schema';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { requireUnrestricted } from '@/lib/campus-access';
import { centerSettingsSchema } from '@/lib/validation/settings';
import { fieldErrorsFrom, type ActionResult } from '@/lib/validation/student';

// Lưu cài đặt trung tâm vào dòng id = 1. Ô bật tắt gửi lên khi được chọn.
export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission('settings.manage');
    await requireUnrestricted();
    const parsed = centerSettingsSchema.safeParse({
      ...Object.fromEntries(formData),
      notifySmsBeforeDue: formData.has('notifySmsBeforeDue'),
      notifyWeeklyReport: formData.has('notifyWeeklyReport'),
      notifyAbsentAlert: formData.has('notifyAbsentAlert'),
      notifyNewClass: formData.has('notifyNewClass'),
    });
    if (!parsed.success) {
      return { ok: false, message: 'Vui lòng kiểm tra lại các ô được đánh dấu.', fieldErrors: fieldErrorsFrom(parsed.error) };
    }
    const v = parsed.data;
    const values = { ...v, updatedAt: new Date() };
    await db
      .insert(centerSettings)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: centerSettings.id, set: values });
    await writeAudit({ action: 'update', entity: 'settings', entityId: 1, summary: `Cập nhật cài đặt trung tâm ${v.centerName}` });
    revalidatePath('/cai-dat');
    revalidatePath('/hoc-phi');
    return { ok: true, message: 'Đã lưu cài đặt' };
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, message: error.message };
    console.error('Lỗi server action cài đặt:', error);
    return { ok: false, message: 'Không lưu được cài đặt. Thử lại sau ít phút.' };
  }
}
