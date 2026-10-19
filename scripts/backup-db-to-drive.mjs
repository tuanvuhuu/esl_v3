// Script sao lưu cơ sở dữ liệu PostgreSQL hằng ngày lên Google Drive (P34.26)
// Dump cơ sở dữ liệu, nén gzip, tải lên Google Drive (thư mục backups/daily và backups/monthly).
// Duy trì chính sách lưu trữ: 30 bản hằng ngày, 12 bản hằng tháng. Tự động xoá bản cũ hơn.
// Báo cảnh báo khẩn cấp tới Super Admin qua bot Telegram khi có lỗi.
import { exec } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { google } from 'googleapis';
import pg from 'pg';

const execAsync = promisify(exec);
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

const dbUrl = process.env.DATABASE_URL;
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const driveClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const driveClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const driveRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const superAdminChatId = process.env.TELEGRAM_SUPER_ADMIN_CHAT_ID;

// Hàm gửi tin nhắn cảnh báo Telegram
async function notifyAdminAlert(message) {
  if (!botToken) return;

  const targetChatIds = new Set();
  if (superAdminChatId) targetChatIds.add(superAdminChatId);

  // Tìm thêm chat_id của các Admin từ database nếu kết nối được
  if (dbUrl) {
    try {
      const client = new pg.Client({ connectionString: dbUrl });
      await client.connect();
      const res = await client.query(`
        SELECT tc.chat_id 
        FROM telegram_chats tc
        JOIN accounts a ON a.id = tc.account_id
        WHERE a.role = 'admin' AND tc.active = true
      `);
      for (const row of res.rows) targetChatIds.add(row.chat_id);
      await client.end();
    } catch {}
  }

  for (const chatId of targetChatIds) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🚨 [ESL Center] CẢNH BÁO SAO LƯU DATABASE\n\n${message}`,
        }),
      });
    } catch (err) {
      console.error(`Không thể gửi tin báo Telegram tới ${chatId}:`, err.message);
    }
  }
}

// Tìm hoặc tạo folder trên Drive
async function getOrCreateFolder(drive, name, parentId) {
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

// Xoá các bản sao lưu cũ vượt quá số lượng tối đa cho phép
async function pruneOldBackups(drive, folderId, maxKeep) {
  const q = `'${folderId}' in parents and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  });

  const files = res.data.files || [];
  if (files.length <= maxKeep) return;

  const toDelete = files.slice(maxKeep);
  console.log(`Đang dọn dẹp ${toDelete.length} bản sao lưu cũ trong thư mục (giữ lại ${maxKeep} bản mới nhất)...`);
  for (const f of toDelete) {
    try {
      await drive.files.delete({ fileId: f.id });
      console.log(` - Đã xoá bản sao lưu cũ: ${f.name} (${f.createdTime})`);
    } catch (delErr) {
      console.warn(`Lỗi xoá ${f.name}:`, delErr.message);
    }
  }
}

// Sao lưu qua dump node-postgres thuần (khi máy chủ không cài sẵn pg_dump CLI)
async function generateNodeSqlDump(client) {
  const lines = [
    '-- ESL Center PostgreSQL Data Backup',
    `-- Thời gian: ${new Date().toISOString()}`,
    'BEGIN;',
    'SET statement_timeout = 0;',
    'SET client_encoding = \'UTF8\';',
    'SET standard_conforming_strings = on;',
    '',
  ];

  // Lấy danh sách các bảng public
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const tables = tablesRes.rows.map((r) => r.table_name);

  // Xuất dữ liệu từng bảng dưới dạng INSERT
  for (const table of tables) {
    // Không dump audit_logs quá cũ nếu không cần hoặc dump tất cả
    const dataRes = await client.query(`SELECT * FROM "${table}"`);
    if (dataRes.rows.length === 0) continue;

    lines.push(`-- Dữ liệu bảng: ${table} (${dataRes.rows.length} dòng)`);
    const cols = dataRes.fields.map((f) => `"${f.name}"`).join(', ');

    for (const row of dataRes.rows) {
      const vals = dataRes.fields.map((f) => {
        const val = row[f.name];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return String(val);
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      lines.push(`INSERT INTO "${table}" (${cols}) VALUES (${vals.join(', ')});`);
    }
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  return Buffer.from(lines.join('\n'), 'utf8');
}

async function main() {
  console.log(`[Backup] Bắt đầu quá trình sao lưu database lúc ${new Date().toLocaleString('vi-VN')}...`);

  if (!dbUrl) {
    throw new Error('Thiếu DATABASE_URL trong .env.local');
  }
  if (!driveFolderId || !driveClientId || !driveClientSecret || !driveRefreshToken) {
    throw new Error('Thiếu cấu hình Google Drive trong .env.local (GOOGLE_DRIVE_FOLDER_ID, GOOGLE_OAUTH_CLIENT_ID, ...)');
  }

  // Khởi tạo OAuth client
  const oauth2Client = new google.auth.OAuth2(
    driveClientId,
    driveClientSecret,
    'https://developers.google.com/oauthplayground',
  );
  oauth2Client.setCredentials({ refresh_token: driveRefreshToken });
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // 1. Tạo thư mục backups/daily và backups/monthly
  const backupsFolderId = await getOrCreateFolder(drive, 'backups', driveFolderId);
  const dailyFolderId = await getOrCreateFolder(drive, 'daily', backupsFolderId);
  const monthlyFolderId = await getOrCreateFolder(drive, 'monthly', backupsFolderId);

  // 2. Tạo nội dung dump nén gzip
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
  const filename = `esl_center_backup_${dateStr}_${timeStr}.sql.gz`;

  let gzippedBuffer = null;

  // Thử dùng pg_dump CLI nếu có sẵn
  try {
    const tempFile = path.join(rootDir, 'storage', `temp_dump_${Date.now()}.sql.gz`);
    await execAsync(`pg_dump "${dbUrl}" --clean --if-exists --no-owner --no-acl | gzip > "${tempFile}"`);
    gzippedBuffer = await readFile(tempFile);
    await unlink(tempFile);
    console.log(' ✓ Đã dump dữ liệu bằng pg_dump CLI.');
  } catch {
    console.log('ℹ️ Không có pg_dump CLI, chuyển sang dump qua PostgreSQL client...');
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();
    try {
      const sqlBuffer = await generateNodeSqlDump(client);
      // Nén gzip
      const zlib = await import('node:zlib');
      gzippedBuffer = await promisify(zlib.gzip)(sqlBuffer);
      console.log(` ✓ Đã dump ${sqlBuffer.length} bytes SQL -> nén còn ${gzippedBuffer.length} bytes.`);
    } finally {
      await client.end();
    }
  }

  if (!gzippedBuffer || gzippedBuffer.length === 0) {
    throw new Error('Dữ liệu dump rỗng.');
  }

  // 3. Tải lên backups/daily
  console.log(`Đang tải bản sao lưu "${filename}" (${Math.round(gzippedBuffer.length / 1024)} KB) lên Google Drive (daily)...`);

  const uploadStream = new Readable();
  uploadStream.push(gzippedBuffer);
  uploadStream.push(null);

  const dailyUpload = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [dailyFolderId],
    },
    media: {
      mimeType: 'application/gzip',
      body: uploadStream,
    },
    fields: 'id, name, size',
  });

  console.log(` ✓ Đã tải lên daily: ID=${dailyUpload.data.id}`);

  // 4. Nếu là ngày đầu tháng (hoặc chạy thủ công --monthly): lưu thêm vào backups/monthly
  const isFirstDayOfMonth = now.getDate() === 1 || process.argv.includes('--monthly');
  if (isFirstDayOfMonth) {
    const monthStr = dateStr.slice(0, 7); // YYYY-MM
    const monthlyFilename = `esl_center_backup_${monthStr}.sql.gz`;
    console.log(`Lưu bản sao lưu tháng: "${monthlyFilename}"...`);

    const mStream = new Readable();
    mStream.push(gzippedBuffer);
    mStream.push(null);

    await drive.files.create({
      requestBody: {
        name: monthlyFilename,
        parents: [monthlyFolderId],
      },
      media: {
        mimeType: 'application/gzip',
        body: mStream,
      },
      fields: 'id',
    });
    console.log(` ✓ Đã lưu bản sao lưu tháng vào monthly.`);
  }

  // 5. Áp dụng chính sách duy trì (retention): giữ 30 bản daily, 12 bản monthly
  await pruneOldBackups(drive, dailyFolderId, 30);
  await pruneOldBackups(drive, monthlyFolderId, 12);

  console.log(`\n🎉 Sao lưu hoàn tất thành công! (${filename})`);
}

main().catch(async (err) => {
  console.error('\n❌ SAO LƯU THẤT BẠI:', err.message);
  await notifyAdminAlert(`Thời gian: ${new Date().toLocaleString('vi-VN')}\nLỗi chi tiết: ${err.message}`);
  process.exit(1);
});
