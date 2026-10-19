import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Đọc file .env.local thủ công nếu chưa có
async function loadEnv() {
  try {
    const content = await readFile(path.join(rootDir, '.env.local'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

await loadEnv();

const accessKeyId = process.env.SUPABASE_ACCESS_KEY_ID;
const secretAccessKey = process.env.SUPABASE_SECRET_ACCESS_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET;
const endpoint = process.env.SUPABASE_S3_ENDPOINT || (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/s3` : '');
const region = process.env.SUPABASE_S3_REGION || 'ap-northeast-1';

if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
  console.error('❌ Thiếu cấu hình Supabase S3 trong .env.local!');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint,
  region,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

const uploadsDir = path.join(rootDir, 'storage', 'uploads');
let fileNames = [];
try {
  fileNames = await readdir(uploadsDir);
} catch {
  console.log('Thư mục storage/uploads rỗng hoặc không tồn tại.');
  process.exit(0);
}

// Đọc mime_type từ database nếu có
let mimeMap = new Map();
if (process.env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const rows = (await client.query('SELECT storage_key, mime_type FROM uploaded_files')).rows;
    for (const r of rows) mimeMap.set(r.storage_key, r.mime_type);
    await client.end();
  } catch (err) {
    console.warn('Không đọc được mime_type từ database:', err.message);
  }
}

console.log(`Bắt đầu đồng bộ ${fileNames.length} tệp lên Supabase Storage bucket "${bucket}"...`);
let success = 0;
let errors = 0;

for (const name of fileNames) {
  if (!/^[a-z0-9]+$/.test(name)) continue;
  try {
    const bytes = await readFile(path.join(uploadsDir, name));
    const mimeType = mimeMap.get(name) || 'application/octet-stream';
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `uploads/${name}`,
        Body: bytes,
        ContentType: mimeType,
        CacheControl: 'private, no-store',
      }),
    );
    success++;
    console.log(` ✓ Đã tải lên: ${name} (${bytes.length} bytes, ${mimeType})`);
  } catch (err) {
    errors++;
    console.error(` ❌ Lỗi tải lên ${name}:`, err.message);
  }
}

console.log(`\n🎉 Hoàn thành! Thành công: ${success}, Thất bại: ${errors}`);
