import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { extractDriveFileId } from '@/app/(app)/bai-giang/actions';
import { driveConfig, isDriveConfigured } from '@/lib/drive-store';

describe('Google Drive & Lưu trữ tệp (P34.23 - P34.27)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('extractDriveFileId', () => {
    it('trích xuất đúng ID từ URL dạng /file/d/ID/view', () => {
      const url = 'https://drive.google.com/file/d/1XyZ_abc1234567890-qwerty/view?usp=sharing';
      expect(extractDriveFileId(url)).toBe('1XyZ_abc1234567890-qwerty');
    });

    it('trích xuất đúng ID từ URL dạng open?id=ID', () => {
      const url = 'https://drive.google.com/open?id=1a2B3c4D5e6F7g8H9i0J_kLmN';
      expect(extractDriveFileId(url)).toBe('1a2B3c4D5e6F7g8H9i0J_kLmN');
    });

    it('nhận diện đúng khi người dùng nhập trực tiếp file ID', () => {
      const id = '1a2B3c4D5e6F7g8H9i0J_kLmN_12345';
      expect(extractDriveFileId(id)).toBe(id);
    });

    it('trả về null nếu định dạng liên kết hoặc ID không hợp lệ', () => {
      expect(extractDriveFileId('')).toBeNull();
      expect(extractDriveFileId('   ')).toBeNull();
      expect(extractDriveFileId('short')).toBeNull();
      expect(extractDriveFileId('https://youtube.com/watch?v=12345')).toBeNull();
    });
  });

  describe('Cấu hình Google Drive (isDriveConfigured)', () => {
    it('báo chưa cấu hình khi thiếu bất kỳ biến nào trong 4 biến môi trường', () => {
      delete process.env.GOOGLE_DRIVE_FOLDER_ID;
      delete process.env.GOOGLE_OAUTH_CLIENT_ID;
      delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      delete process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

      expect(isDriveConfigured()).toBe(false);
      expect(driveConfig().configured).toBe(false);

      process.env.GOOGLE_DRIVE_FOLDER_ID = 'test-folder-id';
      expect(isDriveConfigured()).toBe(false);

      process.env.GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
      expect(isDriveConfigured()).toBe(false);

      process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'test-client-secret';
      expect(isDriveConfigured()).toBe(false);

      process.env.GOOGLE_OAUTH_REFRESH_TOKEN = 'test-refresh-token';
      expect(isDriveConfigured()).toBe(true);
      expect(driveConfig().configured).toBe(true);
      expect(driveConfig().folderId).toBe('test-folder-id');
    });
  });

  describe('HTTP Range Requests cho Video & Tệp lớn', () => {
    it('tính đúng khoảng byte cho Range header thông thường', () => {
      const rangeHeader = 'bytes=0-499';
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);

      expect(start).toBe(0);
      expect(end).toBe(499);
      expect(end - start + 1).toBe(500);
    });

    it('xử lý đúng khi client gửi Range bytes=500- (tới hết file)', () => {
      const total = 1000;
      const rangeHeader = 'bytes=500-';
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

      expect(start).toBe(500);
      expect(end).toBe(999);
      expect(end - start + 1).toBe(500);
    });
  });
});
