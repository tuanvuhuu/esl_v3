import { afterAll, describe, expect, it } from 'vitest';
import { blobDriver, createSignedUploadUrl, deleteBlob, getBlob, putBlob } from '@/lib/blob-store';
import { deepLink, newLinkCode, parseCommand } from '@/lib/telegram/commands';

describe('đọc lệnh Telegram', () => {
  it('/start kèm mã hợp lệ thì lấy mã; mã sai dạng thì bỏ', () => {
    const code = newLinkCode();
    expect(code).toMatch(/^[a-f0-9]{20}$/);
    expect(parseCommand(`/start ${code}`)).toEqual({ kind: 'start', code });
    expect(parseCommand('/start xin-chao')).toEqual({ kind: 'start', code: null });
    expect(parseCommand('/start')).toEqual({ kind: 'start', code: null });
  });

  it('lệnh tiếng Việt và tiếng Anh, có hoặc không có @tên_bot', () => {
    expect(parseCommand('/lich')).toEqual({ kind: 'schedule' });
    expect(parseCommand('/hocphi@esl_center_bot')).toEqual({ kind: 'tuition' });
    expect(parseCommand('/homework')).toEqual({ kind: 'homework' });
    expect(parseCommand('/diem')).toEqual({ kind: 'scores' });
    expect(parseCommand('/nhanxet')).toEqual({ kind: 'scores' });
    expect(parseCommand('/chuyencan')).toEqual({ kind: 'attendance' });
    expect(parseCommand('/nghi')).toEqual({ kind: 'leave', arg: undefined });
    expect(parseCommand('/nghi vi con om')).toEqual({ kind: 'leave', arg: 'vi con om' });
    expect(parseCommand('/homnay')).toEqual({ kind: 'today' });
    expect(parseCommand('/chocham')).toEqual({ kind: 'pending_grading' });
    expect(parseCommand('/baocao')).toEqual({ kind: 'report' });
    expect(parseCommand('/huy')).toEqual({ kind: 'stop' });
    expect(parseCommand('/help')).toEqual({ kind: 'help' });
  });

  it('nhận diện nút bấm tiếng Việt và từ khoá không cần gõ lệnh gạch chéo', () => {
    expect(parseCommand('📅 Lịch học')).toEqual({ kind: 'schedule' });
    expect(parseCommand('Lịch học')).toEqual({ kind: 'schedule' });
    expect(parseCommand('📊 Điểm số')).toEqual({ kind: 'scores' });
    expect(parseCommand('Bảng điểm')).toEqual({ kind: 'scores' });
    expect(parseCommand('📝 Chuyên cần')).toEqual({ kind: 'attendance' });
    expect(parseCommand('Điểm danh')).toEqual({ kind: 'attendance' });
    expect(parseCommand('💳 Học phí')).toEqual({ kind: 'tuition' });
    expect(parseCommand('Học phí')).toEqual({ kind: 'tuition' });
    expect(parseCommand('📚 Bài tập')).toEqual({ kind: 'homework' });
    expect(parseCommand('Bài tập')).toEqual({ kind: 'homework' });
    expect(parseCommand('🩺 Xin nghỉ học')).toEqual({ kind: 'leave' });
    expect(parseCommand('Xin nghỉ')).toEqual({ kind: 'leave' });
    expect(parseCommand('❓ Hướng dẫn')).toEqual({ kind: 'help' });
    expect(parseCommand('Hướng dẫn')).toEqual({ kind: 'help' });
    expect(parseCommand('📅 Lịch dạy hôm nay')).toEqual({ kind: 'today' });
    expect(parseCommand('📝 Bài chờ chấm')).toEqual({ kind: 'pending_grading' });
    expect(parseCommand('📊 Báo cáo ngày')).toEqual({ kind: 'report' });
  });

  it('tin thường và lệnh lạ đều là tin để trung tâm đọc', () => {
    expect(parseCommand('  Cô ơi con nghỉ học hôm nay  ')).toEqual({ kind: 'text', text: 'Cô ơi con nghỉ học hôm nay' });
    expect(parseCommand('/abc xyz')).toEqual({ kind: 'text', text: '/abc xyz' });
  });

  it('link mời mở đúng bot kèm mã', () => {
    expect(deepLink('esl_center_bot', 'abc123')).toBe('https://t.me/esl_center_bot?start=abc123');
  });
});

describe('nơi lưu tệp (ổ đĩa khi chưa cấu hình Supabase)', () => {
  const key = `unittest${Date.now()}`;
  afterAll(() => deleteBlob(key));

  it('ghi, đọc, xoá được; khoá lạ bị từ chối để không thoát khỏi thư mục', async () => {
    expect(blobDriver()).toBe('disk');
    await putBlob(key, Buffer.from('xin chào'), 'text/plain');
    expect((await getBlob(key))?.toString()).toBe('xin chào');
    await deleteBlob(key);
    expect(await getBlob(key)).toBeNull();
    await expect(putBlob('../ngoai', Buffer.from('x'), 'text/plain')).rejects.toThrow('Khoá tệp không hợp lệ');
  });

  it('chuyển sang driver supabase và tạo signed upload URL khi có cấu hình S3', async () => {
    const prev = { ...process.env };
    try {
      process.env.SUPABASE_ACCESS_KEY_ID = 'test_id';
      process.env.SUPABASE_SECRET_ACCESS_KEY = 'test_secret';
      process.env.SUPABASE_STORAGE_BUCKET = 'esl';
      process.env.SUPABASE_S3_ENDPOINT = 'https://example.supabase.co/storage/v1/s3';
      expect(blobDriver()).toBe('supabase');

      const url = await createSignedUploadUrl('testfile123', 'audio/mpeg');
      expect(url).toContain('https://example.supabase.co/storage/v1/s3/esl/uploads/testfile123');
    } finally {
      process.env = prev;
    }
  });
});
