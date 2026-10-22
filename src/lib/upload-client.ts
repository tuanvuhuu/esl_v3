// Tải tệp từ trình duyệt (P35.6): xin link có chữ ký rồi PUT thẳng lên kho tệp, xong thì xác nhận với máy chủ.
// Chưa cấu hình kho tệp (mode "server") thì gửi qua server action như cũ. Dùng được cho mọi màn tải tệp.
import { confirmDirectUploadAction, requestDirectUploadAction, uploadFileAction } from '@/app/(app)/bai-tap/question-actions';
import { studentConfirmUploadAction, studentRequestUploadAction, studentUploadAction } from '@/app/(student)/cua-toi/actions';
import type { PrepareDirectUploadResult } from './storage';

type Uploaded = { ok: true; fileId: number; name: string } | { ok: false; message: string };

export async function uploadFile(
  file: File,
  actions: {
    request: (info: { name: string; type: string; size: number }) => Promise<PrepareDirectUploadResult>;
    confirm: (p: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number }) => Promise<Uploaded>;
    viaServer: (fd: FormData) => Promise<Uploaded>;
  },
): Promise<Uploaded> {
  const prep = await actions.request({ name: file.name, type: file.type, size: file.size });
  if (!prep.ok) return prep;
  if (prep.mode === 'server') {
    const fd = new FormData();
    fd.append('file', file);
    return actions.viaServer(fd);
  }
  try {
    const res = await fetch(prep.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!res.ok) return { ok: false, message: 'Không tải được tệp lên. Kiểm tra mạng rồi thử lại.' };
  } catch {
    return { ok: false, message: 'Không tải được tệp lên. Kiểm tra mạng rồi thử lại.' };
  }
  return actions.confirm({ storageKey: prep.storageKey, fileName: prep.name, mimeType: file.type, sizeBytes: file.size });
}

// Bọc sẵn cho hai loại tài khoản: nhân viên (soạn câu, tài liệu, chấm bài) và học sinh (bài nộp, ghi âm)
export const uploadAsStaff = (file: File) =>
  uploadFile(file, { request: requestDirectUploadAction, confirm: confirmDirectUploadAction, viaServer: uploadFileAction });
export const uploadAsStudent = (file: File) =>
  uploadFile(file, { request: studentRequestUploadAction, confirm: studentConfirmUploadAction, viaServer: studentUploadAction });
