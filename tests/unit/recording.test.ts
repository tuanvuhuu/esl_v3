import { describe, expect, it } from 'vitest';
import { baseMime, clock, pickRecordingFormat, recordedFormat, starsFor } from '@/lib/recording';

describe('định dạng ghi âm theo máy', () => {
  it('Chrome, Android, Safari từ 18.4: WebM Opus', () => {
    const f = pickRecordingFormat((t) => t.startsWith('audio/webm'))!;
    expect(f).toEqual({ mimeType: 'audio/webm;codecs=opus', baseType: 'audio/webm', ext: 'webm' });
  });
  it('Safari cũ: chỉ MP4, đuôi m4a', () => {
    const f = pickRecordingFormat((t) => t === 'audio/mp4')!;
    expect(f).toMatchObject({ baseType: 'audio/mp4', ext: 'm4a' });
  });
  it('máy không ghi được hoặc isTypeSupported lỗi thì trả null', () => {
    expect(pickRecordingFormat(() => false)).toBeNull();
    expect(
      pickRecordingFormat(() => {
        throw new Error('x');
      }),
    ).toBeNull();
  });
  it('cắt tham số codecs để khớp danh sách loại tệp của máy chủ', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseMime('Audio/MP4')).toBe('audio/mp4');
    const chosen = pickRecordingFormat((t) => t.startsWith('audio/webm'))!;
    expect(recordedFormat('audio/webm; codecs="opus"', chosen).baseType).toBe('audio/webm');
    expect(recordedFormat('', chosen)).toMatchObject({ baseType: 'audio/webm', ext: 'webm' });
  });
});

describe('đồng hồ và sao', () => {
  it('hiện phút:giây đúng khi quá 59 giây', () => {
    expect(clock(7)).toBe('0:07');
    expect(clock(65)).toBe('1:05');
    expect(clock(-3)).toBe('0:00');
  });
  it('sao theo phần tự chấm, ít nhất 1 sao, bài chỉ có câu nói hoặc viết là 3 sao', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(8, 10)).toBe(3);
    expect(starsFor(5, 10)).toBe(2);
    expect(starsFor(0, 10)).toBe(1);
    expect(starsFor(0, 0)).toBe(3);
  });
});
