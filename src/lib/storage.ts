// Tệp tải lên: âm thanh của đề và tệp bài nộp (P22). Chỉ chạy trên server.
// Nội dung lưu qua blob-store (Firebase Storage khi có cấu hình, ổ đĩa khi dev), tên là khoá ngẫu nhiên.
// Tên gốc và loại tệp nằm trong bảng uploaded_files.
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { uploadedFiles } from '@/db/schema';
import { createSignedUploadUrl, deleteBlob, getBlob, putBlob } from './blob-store';
import { downloadFromDrive } from './drive-store';

export { uploadDir } from './blob-store';

const MB = 1024 * 1024;
const AUDIO_MAX = 25 * MB;
const DOC_MAX = 10 * MB;

// Loại tệp được nhận, kèm cỡ tối đa. Loại khác thì từ chối, nên không ai tải lên được HTML hay script.
export const ALLOWED_TYPES: Record<string, number> = {
  'audio/mpeg': AUDIO_MAX,
  'audio/mp4': AUDIO_MAX,
  'audio/x-m4a': AUDIO_MAX,
  'audio/wav': AUDIO_MAX,
  'audio/x-wav': AUDIO_MAX,
  'audio/webm': AUDIO_MAX,
  'audio/ogg': AUDIO_MAX,
  'application/pdf': DOC_MAX,
  'image/png': DOC_MAX,
  'image/jpeg': DOC_MAX,
  'text/plain': DOC_MAX,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': DOC_MAX,
};

// Tên gốc để hiện và tải xuống: bỏ đường dẫn và ký tự điều khiển, giới hạn độ dài
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return (cleaned || 'tep').slice(0, 200);
}

export type UploadResult = { ok: true; id: number; name: string } | { ok: false; message: string };

// Ghi một tệp tải lên. Kiểm loại và cỡ trước khi ghi ổ đĩa.
export async function saveUpload(file: File, accountId: number | null): Promise<UploadResult> {
  const limit = ALLOWED_TYPES[file.type];
  if (!limit) {
    return { ok: false, message: 'Loại tệp này chưa được hỗ trợ. Dùng âm thanh (mp3, m4a, wav), PDF, ảnh PNG hoặc JPG, văn bản (txt, docx).' };
  }
  if (file.size === 0) return { ok: false, message: 'Tệp này trống.' };
  if (file.size > limit) return { ok: false, message: `Tệp quá lớn. Tối đa ${Math.round(limit / MB)} MB.` };

  const storageKey = randomBytes(24).toString('hex');
  const name = safeFileName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await putBlob(storageKey, bytes, file.type);
  const [row] = await db
    .insert(uploadedFiles)
    .values({ storageKey, originalName: name, mimeType: file.type, sizeBytes: bytes.length, uploadedByAccountId: accountId })
    .returning({ id: uploadedFiles.id });
  return { ok: true, id: row.id, name };
}

// Đọc một tệp theo id để phục vụ tải xuống. Tự động đọc từ Google Drive (nếu đã chuyển lưu trữ) hoặc Supabase Storage / ổ đĩa.
export async function readUpload(id: number): Promise<{ originalName: string; mimeType: string; bytes: Buffer } | null> {
  let row: {
    id: number;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    storageLocation?: string | null;
    driveFileId?: string | null;
  } | undefined;

  try {
    const [res] = await db
      .select({
        id: uploadedFiles.id,
        storageKey: uploadedFiles.storageKey,
        originalName: uploadedFiles.originalName,
        mimeType: uploadedFiles.mimeType,
        sizeBytes: uploadedFiles.sizeBytes,
        storageLocation: uploadedFiles.storageLocation,
        driveFileId: uploadedFiles.driveFileId,
      })
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, id))
      .limit(1);
    row = res;
  } catch (err: unknown) {
    // Trường hợp DB chưa kịp chạy migration thêm cột storage_location
    const msg = (err as Error)?.message || '';
    if (msg.includes('storage_location') || msg.includes('drive_file_id')) {
      const [res] = await db
        .select({
          id: uploadedFiles.id,
          storageKey: uploadedFiles.storageKey,
          originalName: uploadedFiles.originalName,
          mimeType: uploadedFiles.mimeType,
          sizeBytes: uploadedFiles.sizeBytes,
        })
        .from(uploadedFiles)
        .where(eq(uploadedFiles.id, id))
        .limit(1);
      row = res ? { ...res, storageLocation: 'supabase', driveFileId: null } : undefined;
    } else {
      throw err;
    }
  }

  if (!row) return null;

  // 1. Tệp đã lưu trữ trên Google Drive (P34.25 / P34.27)
  if (row.storageLocation === 'drive' && (row.driveFileId || row.storageKey)) {
    try {
      const driveBytes = await downloadFromDrive(row.driveFileId || row.storageKey);
      if (driveBytes) {
        return { originalName: row.originalName, mimeType: row.mimeType, bytes: driveBytes };
      }
    } catch (driveErr) {
      console.error(`[storage] Lỗi tải tệp id=${id} từ Google Drive:`, driveErr);
    }
  }

  // 2. Tệp trên Supabase Storage hoặc ổ đĩa cục bộ
  const bytes = await getBlob(row.storageKey);
  return bytes ? { originalName: row.originalName, mimeType: row.mimeType, bytes } : null;
}

// Đăng ký một tệp Google Drive vào hệ thống (P34.27)
export async function registerDriveUpload(params: {
  name: string;
  driveFileId: string;
  mimeType: string;
  sizeBytes: number;
  accountId: number | null;
}): Promise<UploadResult> {
  const name = safeFileName(params.name);
  const storageKey = `drive_${params.driveFileId.slice(0, 32)}`;
  const [row] = await db
    .insert(uploadedFiles)
    .values({
      storageKey,
      originalName: name,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      uploadedByAccountId: params.accountId,
      storageLocation: 'drive',
      driveFileId: params.driveFileId,
    })
    .returning({ id: uploadedFiles.id });
  return { ok: true, id: row.id, name };
}

// Xoá nội dung một tệp. Tệp đã mất thì bỏ qua, không báo lỗi.
export async function removeUploadFile(storageKey: string): Promise<void> {
  await deleteBlob(storageKey);
}

export type PrepareDirectUploadResult =
  | { ok: true; mode: 'direct'; uploadUrl: string; storageKey: string; name: string }
  | { ok: true; mode: 'server' }
  | { ok: false; message: string };

// Cấp signed upload URL để trình duyệt tải thẳng tệp lên Supabase Storage (P34.3)
export async function prepareDirectUpload(fileInfo: {
  name: string;
  type: string;
  size: number;
}): Promise<PrepareDirectUploadResult> {
  const limit = ALLOWED_TYPES[fileInfo.type];
  if (!limit) {
    return { ok: false, message: 'Loại tệp này chưa được hỗ trợ. Dùng âm thanh (mp3, m4a, wav), PDF, ảnh PNG hoặc JPG, văn bản (txt, docx).' };
  }
  if (fileInfo.size <= 0) return { ok: false, message: 'Tệp này trống.' };
  if (fileInfo.size > limit) return { ok: false, message: `Tệp quá lớn. Tối đa ${Math.round(limit / MB)} MB.` };

  const storageKey = randomBytes(24).toString('hex');
  const name = safeFileName(fileInfo.name);
  const uploadUrl = await createSignedUploadUrl(storageKey, fileInfo.type);
  if (!uploadUrl) {
    return { ok: true, mode: 'server' };
  }
  return { ok: true, mode: 'direct', uploadUrl, storageKey, name };
}

// Xác nhận tệp đã tải xong lên Supabase Storage và ghi vào cơ sở dữ liệu (P34.3)
export async function completeDirectUpload(params: {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  accountId: number | null;
}): Promise<UploadResult> {
  if (!/^[a-z0-9]+$/.test(params.storageKey)) {
    return { ok: false, message: 'Khoá tệp không hợp lệ.' };
  }
  const blob = await getBlob(params.storageKey);
  if (!blob) {
    return { ok: false, message: 'Tệp chưa được tải lên hoặc tải lên không thành công.' };
  }
  const name = safeFileName(params.fileName);
  const [row] = await db
    .insert(uploadedFiles)
    .values({
      storageKey: params.storageKey,
      originalName: name,
      mimeType: params.mimeType,
      sizeBytes: blob.length || params.sizeBytes,
      uploadedByAccountId: params.accountId,
    })
    .returning({ id: uploadedFiles.id });
  return { ok: true, id: row.id, name };
}

