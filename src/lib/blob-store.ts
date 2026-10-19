// Nơi lưu nội dung tệp tải lên. Chỉ chạy trên server.
// Có đủ biến FIREBASE_* thì lưu trên Firebase Storage (dùng khi chạy trên Vercel, vì ổ đĩa ở đó không giữ tệp lâu dài).
// Không có thì lưu trên ổ đĩa trong storage/uploads (máy dev, E2E).
// Tệp trên Firebase không công khai: chỉ server đọc bằng service account, rồi /api/files/[id] kiểm quyền trước khi trả về.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

type FirebaseConfig = { projectId: string; clientEmail: string; privateKey: string; bucket: string };

function firebaseConfig(): FirebaseConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel lưu khoá nhiều dòng dạng "\n": đổi lại thành xuống dòng thật
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const bucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!projectId || !clientEmail || !privateKey || !bucket) return null;
  return { projectId, clientEmail, privateKey, bucket };
}

export function blobDriver(): 'firebase' | 'disk' {
  return firebaseConfig() ? 'firebase' : 'disk';
}

const APP_NAME = 'esl-storage';
function firebaseApp(config: FirebaseConfig): App {
  if (getApps().some((a) => a.name === APP_NAME)) return getApp(APP_NAME);
  return initializeApp(
    { credential: cert({ projectId: config.projectId, clientEmail: config.clientEmail, privateKey: config.privateKey }), storageBucket: config.bucket },
    APP_NAME,
  );
}

// Tệp nằm trong thư mục uploads/ của bucket
function remoteFile(config: FirebaseConfig, key: string) {
  return getStorage(firebaseApp(config)).bucket(config.bucket).file(`uploads/${checkedKey(key)}`);
}

export function uploadDir(): string {
  return path.join(process.cwd(), 'storage', 'uploads');
}

// Khoá chỉ gồm chữ thường và số (sinh ngẫu nhiên ở storage.ts), nên không thể thoát ra ngoài thư mục
function checkedKey(key: string): string {
  if (!/^[a-z0-9]+$/.test(key)) throw new Error('Khoá tệp không hợp lệ');
  return key;
}

export async function putBlob(key: string, bytes: Buffer, contentType: string): Promise<void> {
  const config = firebaseConfig();
  if (config) {
    await remoteFile(config, key).save(bytes, { contentType, resumable: false, metadata: { cacheControl: 'private, no-store' } });
    return;
  }
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), checkedKey(key)), bytes);
}

// Null nếu tệp không còn
export async function getBlob(key: string): Promise<Buffer | null> {
  const config = firebaseConfig();
  try {
    if (config) {
      const [bytes] = await remoteFile(config, key).download();
      return bytes;
    }
    return await readFile(path.join(uploadDir(), checkedKey(key)));
  } catch (error) {
    if (config) console.error('Lỗi đọc tệp trên Firebase Storage:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Tệp đã mất thì bỏ qua, không báo lỗi
export async function deleteBlob(key: string): Promise<void> {
  const config = firebaseConfig();
  if (config) {
    await remoteFile(config, key).delete({ ignoreNotFound: true });
    return;
  }
  await rm(path.join(uploadDir(), checkedKey(key)), { force: true });
}
