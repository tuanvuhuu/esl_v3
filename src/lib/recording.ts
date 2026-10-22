// Ghi âm trên trình duyệt (P35.6, docs/NGHIEN-CUU-TINH-NANG-P35.md mục 2). Hàm thuần, test được.
// Không dò theo tên trình duyệt: hỏi MediaRecorder.isTypeSupported. Chrome, Android, Firefox, Safari từ 18.4 ghi WebM Opus;
// Safari cũ hơn chỉ ghi MP4 (AAC). Cả hai đều phát được trên trình duyệt hiện nay.

export type RecordingFormat = { mimeType: string; baseType: string; ext: string };

const CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
const EXT: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/x-m4a': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' };

// Bỏ tham số sau dấu ";" (ví dụ "audio/webm;codecs=opus" thành "audio/webm") để khớp danh sách loại tệp của máy chủ
export function baseMime(type: string): string {
  return type.split(';')[0].trim().toLowerCase();
}

// Định dạng đầu tiên máy ghi được; null khi không ghi được (trình duyệt quá cũ)
export function pickRecordingFormat(isTypeSupported: (t: string) => boolean): RecordingFormat | null {
  const mimeType = CANDIDATES.find((t) => {
    try {
      return isTypeSupported(t);
    } catch {
      return false;
    }
  });
  if (!mimeType) return null;
  const baseType = baseMime(mimeType);
  return { mimeType, baseType, ext: EXT[baseType] ?? 'webm' };
}

// Loại tệp thật của bản ghi: ưu tiên loại máy báo sau khi ghi (recorder.mimeType), không có thì loại đã chọn
export function recordedFormat(reported: string, chosen: RecordingFormat): RecordingFormat {
  const base = baseMime(reported || chosen.mimeType);
  return { mimeType: reported || chosen.mimeType, baseType: base, ext: EXT[base] ?? chosen.ext };
}

// "0:07", "1:05"
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Sao của bài (1–3) theo phần tự chấm. Không phạt: ít nhất 1 sao khi đã làm bài.
// Bài chỉ có câu nói, viết (autoMax = 0) thì 3 sao vì đã hoàn thành, chờ giáo viên chấm.
export function starsFor(autoPoints: number, autoMax: number): 1 | 2 | 3 {
  if (autoMax <= 0) return 3;
  const ratio = autoPoints / autoMax;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}
