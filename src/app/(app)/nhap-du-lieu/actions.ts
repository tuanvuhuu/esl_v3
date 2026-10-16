'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db/client';
import { ForbiddenError, requirePermission, writeAudit } from '@/lib/authz';
import { getAllowedCampusIds } from '@/lib/campus-access';
import { MAX_IMPORT_BYTES, readImportFile } from '@/lib/import/excel';
import { applyImport, ENTITY_LABELS, planImport, type EntityKind, type ImportSummary, type RowResult } from '@/lib/import/plan';
import type { RawRow } from '@/lib/import/rows';

export type PreviewResponse =
  | { ok: false; message: string }
  | { ok: true; fileName: string; rows: RowResult[]; summary: ImportSummary; errorCount: number };

export type CommitResponse = { ok: true; message: string; summary: ImportSummary } | { ok: false; message: string };

async function readUploaded(formData: FormData): Promise<{ ok: true; name: string; rows: RawRow[] } | { ok: false; message: string }> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Chọn file Excel (.xlsx) để nhập.' };
  if (!file.name.toLowerCase().endsWith('.xlsx')) return { ok: false, message: 'Chỉ nhận file .xlsx. Hãy dùng file mẫu.' };
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, message: 'File lớn hơn 900 KB. Chia thành nhiều file nhỏ hơn.' };
  const read = await readImportFile(await file.arrayBuffer());
  if (!read.ok) return read;
  if (read.rows.length === 0) return { ok: false, message: 'File chưa có dòng dữ liệu nào dưới dòng tiêu đề.' };
  return { ok: true, name: file.name, rows: read.rows };
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ForbiddenError) return error.message;
  console.error('Lỗi nhập dữ liệu:', error);
  return fallback;
}

// Xem trước: đọc file, đối chiếu với dữ liệu hiện có, không ghi gì
export async function previewImportAction(formData: FormData): Promise<PreviewResponse> {
  try {
    await requirePermission('settings.manage');
    const file = await readUploaded(formData);
    if (!file.ok) return file;
    const plan = await planImport(file.rows, db, await getAllowedCampusIds());
    if (plan.rows.length === 0) return { ok: false, message: 'File chưa có dòng dữ liệu nào dưới dòng tiêu đề.' };
    return { ok: true, fileName: file.name, rows: plan.rows, summary: plan.summary, errorCount: plan.errorCount };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'Không đọc được file. Thử lại sau ít phút.') };
  }
}

function describe(summary: ImportSummary): string {
  const parts = (Object.keys(summary) as EntityKind[])
    .filter((k) => k !== 'link')
    .map((k) => {
      const s = summary[k];
      const bits = [s.create > 0 ? `thêm ${s.create}` : '', s.update > 0 ? `cập nhật ${s.update}` : ''].filter(Boolean);
      return bits.length > 0 ? `${ENTITY_LABELS[k].toLowerCase()} ${bits.join(', ')}` : '';
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : 'không có thay đổi';
}

// Nhập thật: đọc lại file và lập kế hoạch ngay trong transaction, để dữ liệu ghi khớp với dữ liệu lúc ghi.
// Có lỗi ở bất kỳ dòng nào thì không ghi dòng nào.
export async function commitImportAction(formData: FormData): Promise<CommitResponse> {
  try {
    await requirePermission('settings.manage');
    const file = await readUploaded(formData);
    if (!file.ok) return file;
    const allowed = await getAllowedCampusIds();
    const result = await db.transaction(async (tx) => {
      const plan = await planImport(file.rows, tx, allowed);
      if (plan.errorCount > 0) return { ok: false as const, errorCount: plan.errorCount };
      await applyImport(plan, tx);
      return { ok: true as const, summary: plan.summary };
    });
    if (!result.ok) {
      return { ok: false, message: `Dữ liệu đã thay đổi so với lúc xem trước: còn ${result.errorCount} dòng lỗi. Bấm Xem trước lại.` };
    }
    const text = describe(result.summary);
    await writeAudit({ action: 'import', entity: 'system', entityId: '', summary: `Nhập dữ liệu từ ${file.name}: ${text}` });
    for (const path of ['/co-so', '/giao-vien', '/lop-hoc', '/lich-hoc', '/hoc-sinh', '/phu-huynh', '/tong-quan']) revalidatePath(path);
    return { ok: true, message: `Đã nhập xong: ${text}.`, summary: result.summary };
  } catch (error) {
    return { ok: false, message: errorMessage(error, 'Không nhập được. Không có dòng nào được ghi. Thử lại sau ít phút.') };
  }
}
