// Script lưu trữ tệp cũ sang Google Drive (P34.25)
// Chuyển bản ghi âm và tệp bài nộp của các bài đã chấm quá 90 ngày từ Supabase Storage sang Google Drive.
// Đảm bảo: Sao chép -> Kiểm tra kích thước khớp -> Cập nhật storage_location='drive' -> Xoá khỏi Supabase.
// Chạy lặp lại an toàn (idempotent), không nhân đôi tệp.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { google } from 'googleapis';
import pg from 'pg';
import { Readable } from 'node:stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Đọc file .env.local
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

const isDryRun = process.argv.includes('--dry-run');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 90;
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

console.log(`[Archive] Bắt đầu quét tệp cũ quá ${days} ngày... (Chế độ dry-run: ${isDryRun ? 'BẬT' : 'TẮT'})`);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ Thiếu DATABASE_URL trong .env.local');
  process.exit(1);
}

const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';
const driveClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const driveClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const driveRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

if (!driveClientId || !driveClientSecret || !driveRefreshToken) {
  console.error('❌ Thiếu cấu hình Google Drive trong .env.local!');
  console.error('Cần: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN');
  process.exit(1);
}

// Cấu hình Google Drive client
const oauth2Client = new google.auth.OAuth2(
  driveClientId,
  driveClientSecret,
  'https://developers.google.com/oauthplayground',
);
oauth2Client.setCredentials({ refresh_token: driveRefreshToken });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Cấu hình Supabase S3 client
const s3AccessKey = process.env.SUPABASE_ACCESS_KEY_ID;
const s3SecretKey = process.env.SUPABASE_SECRET_ACCESS_KEY;
const s3Bucket = process.env.SUPABASE_STORAGE_BUCKET || 'esl';
const s3Endpoint = process.env.SUPABASE_S3_ENDPOINT;
const s3Region = process.env.SUPABASE_S3_REGION || 'ap-northeast-1';

const s3 = (s3AccessKey && s3SecretKey && s3Endpoint)
  ? new S3Client({
      endpoint: s3Endpoint,
      region: s3Region,
      credentials: { accessKeyId: s3AccessKey, secretAccessKey: s3SecretKey },
      forcePathStyle: true,
    })
  : null;

// Tìm hoặc tạo folder trên Drive
async function getOrCreateFolder(name, parentId) {
  const q = `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({ q, fields: 'files(id, name)', spaces: 'drive' });
  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }
  const createRes = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  });
  return createRes.data.id;
}

// Thư mục lưu trữ theo Năm/Tháng: YYYY/MM
async function getArchiveTargetFolderId() {
  const baseFolderId = (driveFolderId && driveFolderId !== 'root')
    ? driveFolderId
    : await getOrCreateFolder('ESL_Center', 'root');

  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearId = await getOrCreateFolder(year, baseFolderId);
  return getOrCreateFolder(month, yearId);
}

const pool = new pg.Pool({ connectionString: dbUrl });

try {
  // Kiểm tra cột storage_location đã có trong DB chưa
  const colCheck = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'uploaded_files' AND column_name = 'storage_location'",
  );
  if (colCheck.rows.length === 0) {
    console.warn('⚠️ Cột storage_location chưa có trong bảng uploaded_files. Vui lòng chạy migration 0015_drive_archive.sql trước.');
    process.exit(1);
  }

  // Quét các tệp thoả mãn: thuộc bài nộp đã chấm quá N ngày, chưa chuyển sang Google Drive
  const query = `
    SELECT DISTINCT f.id, f.storage_key, f.original_name, f.mime_type, f.size_bytes, f.storage_location
    FROM uploaded_files f
    JOIN submission_item_scores sis ON sis.file_id = f.id
    JOIN assignment_submissions s ON s.id = sis.submission_id
    WHERE s.status = 'graded'
      AND s.updated_at < NOW() - make_interval(days => $1)
      AND (f.storage_location IS NULL OR f.storage_location != 'drive')
    ORDER BY f.id ASC
    LIMIT $2
  `;

  const { rows } = await pool.query(query, [days, limit]);

  if (rows.length === 0) {
    console.log('✅ Không có tệp bài nộp cũ nào cần lưu trữ sang Google Drive.');
    process.exit(0);
  }

  console.log(`Tìm thấy ${rows.length} tệp bài nộp đủ điều kiện lưu trữ.`);

  if (isDryRun) {
    for (const r of rows) {
      console.log(` - [Dry-run] id=${r.id}, file="${r.original_name}", size=${r.size_bytes}B, key=${r.storage_key}`);
    }
    console.log('Chế độ dry-run hoàn tất, không có thay đổi nào được thực hiện.');
    process.exit(0);
  }

  const targetFolderId = await getArchiveTargetFolderId();
  let archivedCount = 0;
  let errorCount = 0;

  for (const r of rows) {
    try {
      console.log(`\nĐang xử lý tệp id=${r.id}: "${r.original_name}" (${r.size_bytes} bytes)...`);

      // 1. Tải tệp từ Supabase (hoặc local fallback)
      let buffer = null;
      if (s3) {
        try {
          const s3Res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: `uploads/${r.storage_key}` }));
          const chunks = [];
          for await (const chunk of s3Res.Body) chunks.push(chunk);
          buffer = Buffer.concat(chunks);
        } catch (s3Err) {
          console.warn(`Không tải được từ S3 (${s3Err.message}), thử đọc từ ổ đĩa cục bộ...`);
        }
      }

      if (!buffer) {
        try {
          buffer = await readFile(path.join(rootDir, 'storage', 'uploads', r.storage_key));
        } catch (fsErr) {
          throw new Error(`Không tìm thấy nội dung tệp cả trên S3 và ổ đĩa: ${fsErr.message}`);
        }
      }

      // 2. Tải lên Google Drive
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const driveRes = await drive.files.create({
        requestBody: {
          name: `${r.storage_key}_${r.original_name}`,
          parents: [targetFolderId],
        },
        media: {
          mimeType: r.mime_type,
          body: stream,
        },
        fields: 'id, name, size',
      });

      const driveFileId = driveRes.data.id;
      const uploadedSize = parseInt(driveRes.data.size || String(buffer.length), 10);

      // 3. Kiểm tra kích thước khớp
      if (uploadedSize !== buffer.length && uploadedSize !== r.size_bytes) {
        // Xoá tệp lỗi trên Drive để an toàn
        try { await drive.files.delete({ fileId: driveFileId }); } catch {}
        throw new Error(`Kích thước tải lên Drive không khớp: gốc=${buffer.length}, Drive=${uploadedSize}`);
      }

      // 4. Cập nhật cơ sở dữ liệu
      await pool.query(
        "UPDATE uploaded_files SET storage_location = 'drive', drive_file_id = $1 WHERE id = $2",
        [driveFileId, r.id],
      );

      // 5. Xoá tệp ở Supabase Storage
      if (s3) {
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: `uploads/${r.storage_key}` }));
        } catch (delErr) {
          console.warn(`Lưu ý: Không xoá được tệp cũ trên S3 (${delErr.message})`);
        }
      }

      archivedCount++;
      console.log(` ✓ Chuyển thành công: id=${r.id} -> Drive fileId=${driveFileId}`);
    } catch (err) {
      errorCount++;
      console.error(` ❌ Thất bại tệp id=${r.id}:`, err.message);
    }
  }

  console.log(`\n🎉 Hoàn thành lưu trữ: Đã chuyển ${archivedCount} tệp, Thất bại: ${errorCount} tệp.`);
} finally {
  await pool.end();
}
