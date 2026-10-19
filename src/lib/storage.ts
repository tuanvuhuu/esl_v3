// Tệp tải lên: âm thanh của đề và tệp bài nộp (P22). Chỉ chạy trên server.
// Nội dung lưu qua blob-store (Firebase Storage khi có cấu hình, ổ đĩa khi dev), tên là khoá ngẫu nhiên.
// Tên gốc và loại tệp nằm trong bảng uploaded_files.
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { uploadedFiles } from '@/db/schema';
import { deleteBlob, getBlob, putBlob } from './blob-store';

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

// Đọc một tệp theo id để phục vụ tải xuống. Null nếu không có dòng nào hoặc nơi lưu đã mất tệp.
export async function readUpload(id: number): Promise<{ originalName: string; mimeType: string; bytes: Buffer } | null> {
  const [row] = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id)).limit(1);
  if (!row) return null;
  const bytes = await getBlob(row.storageKey);
  return bytes ? { originalName: row.originalName, mimeType: row.mimeType, bytes } : null;
}

// Xoá nội dung một tệp. Tệp đã mất thì bỏ qua, không báo lỗi.
export async function removeUploadFile(storageKey: string): Promise<void> {
  await deleteBlob(storageKey);
}
