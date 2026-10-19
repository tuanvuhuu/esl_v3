// Driver Google Drive (P34.24): Lưu trữ lâu dài và sao lưu cho ESL Center.
// Chạy hoàn toàn trên server với OAuth 2.0 (Google One cá nhân, quyền drive.file).
import { Readable } from 'node:stream';
import { google } from 'googleapis';

export function driveConfig() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || null;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || null;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || null;

  return {
    configured: Boolean(clientId && clientSecret && refreshToken),
    folderId,
    clientId,
    clientSecret,
    refreshToken,
  };
}

export function isDriveConfigured(): boolean {
  return driveConfig().configured;
}

function getDriveClient() {
  const config = driveConfig();
  if (!config.configured) {
    throw new Error('Google Drive chưa được cấu hình đầy đủ trong biến môi trường');
  }

  const oauth2Client = new google.auth.OAuth2(
    config.clientId!,
    config.clientSecret!,
    'https://developers.google.com/oauthplayground',
  );

  oauth2Client.setCredentials({
    refresh_token: config.refreshToken!,
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

// Hàm hỗ trợ thử lại khi gặp lỗi tốc độ 429 hoặc lỗi mạng tạm thời
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, delayMs = 1500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      attempt++;
      const isRateLimit = (error as { status?: number; code?: number })?.status === 429 || (error as { code?: number })?.code === 429;
      if (attempt >= maxRetries || !isRateLimit) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
    }
  }
}

// Tìm hoặc tạo thư mục con bên trong thư mục cha (ví dụ thư mục năm "2026", tháng "10")
export async function getOrCreateFolder(folderName: string, parentFolderId: string): Promise<string> {
  const drive = getDriveClient();

  return withRetry(async () => {
    // 1. Tìm xem thư mục đã có chưa
    const query = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    // 2. Chưa có thì tạo mới
    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id',
    });

    return createRes.data.id!;
  });
}

// Lấy thư mục lưu trữ theo Năm/Tháng: YYYY/MM
export async function getDatedFolderId(): Promise<string> {
  const rootFolderId = driveConfig().folderId || 'root';
  const baseFolderId = rootFolderId === 'root'
    ? await getOrCreateFolder('ESL_Center', 'root')
    : rootFolderId;

  const now = new Date();
  const yearStr = String(now.getFullYear());
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');

  const yearFolderId = await getOrCreateFolder(yearStr, baseFolderId);
  return getOrCreateFolder(monthStr, yearFolderId);
}

export type DriveUploadResult = {
  fileId: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
};

// Tải tệp lên Google Drive
export async function uploadToDrive(
  filename: string,
  content: Buffer,
  mimeType: string,
  targetFolderId?: string,
): Promise<DriveUploadResult> {
  const drive = getDriveClient();
  const folderId = targetFolderId ?? (await getDatedFolderId());

  return withRetry(async () => {
    const stream = new Readable();
    stream.push(content);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, size, mimeType',
    });

    return {
      fileId: res.data.id!,
      name: res.data.name ?? filename,
      sizeBytes: content.length,
      mimeType: res.data.mimeType ?? mimeType,
    };
  });
}

// Tải nội dung tệp từ Google Drive về Buffer
export async function downloadFromDrive(fileId: string): Promise<Buffer | null> {
  const drive = getDriveClient();

  return withRetry(async () => {
    try {
      const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' },
      );
      return Buffer.from(res.data as ArrayBuffer);
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 404) return null;
      throw error;
    }
  });
}

// Xoá tệp trên Google Drive
export async function deleteFromDrive(fileId: string): Promise<boolean> {
  const drive = getDriveClient();

  return withRetry(async () => {
    try {
      await drive.files.delete({ fileId });
      return true;
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      throw error;
    }
  });
}

// Lấy thông tin tệp trên Google Drive
export async function getFileInfoFromDrive(fileId: string) {
  const drive = getDriveClient();

  return withRetry(async () => {
    try {
      const res = await drive.files.get({
        fileId,
        fields: 'id, name, size, mimeType, createdTime, modifiedTime',
      });
      return res.data;
    } catch (error: unknown) {
      const status = (error as { status?: number })?.status;
      if (status === 404) return null;
      throw error;
    }
  });
}
