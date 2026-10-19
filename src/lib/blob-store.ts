// Nơi lưu nội dung tệp tải lên. Chỉ chạy trên server.
// Có đủ biến SUPABASE_* thì lưu trên Supabase Storage (S3-compatible API).
// Không có thì lưu trên ổ đĩa trong storage/uploads (máy dev, E2E).
// Tệp trên Supabase không công khai: chỉ server đọc hoặc cấp signed URL, rồi /api/files/[id] kiểm quyền trước khi trả về.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type SupabaseStorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

export function supabaseConfig(): SupabaseStorageConfig | null {
  const accessKeyId = process.env.SUPABASE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_SECRET_ACCESS_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const endpoint =
    process.env.SUPABASE_S3_ENDPOINT ||
    (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/s3` : '');
  const region = process.env.SUPABASE_S3_REGION || 'ap-northeast-1';

  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) return null;
  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

export function blobDriver(): 'supabase' | 'disk' {
  return supabaseConfig() ? 'supabase' : 'disk';
}

let cachedClient: { client: S3Client; configKey: string } | null = null;

function getS3Client(config: SupabaseStorageConfig): S3Client {
  const configKey = `${config.endpoint}:${config.accessKeyId}:${config.region}`;
  if (cachedClient && cachedClient.configKey === configKey) {
    return cachedClient.client;
  }
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  cachedClient = { client, configKey };
  return client;
}

export function uploadDir(): string {
  return path.join(process.cwd(), 'storage', 'uploads');
}

// Khoá chỉ gồm chữ thường và số (sinh ngẫu nhiên ở storage.ts), nên không thể thoát ra ngoài thư mục
function checkedKey(key: string): string {
  if (!/^[a-z0-9]+$/.test(key)) throw new Error('Khoá tệp không hợp lệ');
  return key;
}

function objectKey(key: string): string {
  return `uploads/${checkedKey(key)}`;
}

export async function putBlob(key: string, bytes: Buffer, contentType: string): Promise<void> {
  const config = supabaseConfig();
  if (config) {
    const s3 = getS3Client(config);
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey(key),
        Body: bytes,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      }),
    );
    return;
  }
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), checkedKey(key)), bytes);
}

// Null nếu tệp không còn
export async function getBlob(key: string): Promise<Buffer | null> {
  const config = supabaseConfig();
  try {
    if (config) {
      const s3 = getS3Client(config);
      const res = await s3.send(
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: objectKey(key),
        }),
      );
      if (!res.Body) return null;
      const byteArray = await res.Body.transformToByteArray();
      return Buffer.from(byteArray);
    }
    return await readFile(path.join(uploadDir(), checkedKey(key)));
  } catch (error) {
    const isNotFound =
      Boolean(error && typeof error === 'object' && ('name' in error || 'Code' in error) && ((error as { name?: string }).name === 'NoSuchKey' || (error as { Code?: string }).Code === 'NoSuchKey')) ||
      (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404;
    if (!isNotFound && config) {
      console.error('Lỗi đọc tệp trên Supabase Storage:', error instanceof Error ? error.message : error);
    }
    return null;
  }
}

// Tệp đã mất thì bỏ qua, không báo lỗi
export async function deleteBlob(key: string): Promise<void> {
  const config = supabaseConfig();
  if (config) {
    try {
      const s3 = getS3Client(config);
      await s3.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: objectKey(key),
        }),
      );
    } catch (error) {
      console.error('Lỗi xoá tệp trên Supabase Storage:', error instanceof Error ? error.message : error);
    }
    return;
  }
  await rm(path.join(uploadDir(), checkedKey(key)), { force: true });
}

// Cấp signed upload URL cho trình duyệt tải trực tiếp tệp lớn lên Supabase (P34.3)
export async function createSignedUploadUrl(key: string, contentType: string, expiresInSeconds = 300): Promise<string | null> {
  const config = supabaseConfig();
  if (!config) return null;
  const s3 = getS3Client(config);
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey(key),
      ContentType: contentType,
      CacheControl: 'private, no-store',
    }),
    { expiresIn: expiresInSeconds },
  );
}
