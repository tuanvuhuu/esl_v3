// Chấm bài nói (35.8): loại lỗi thường gặp của người Việt khi nói tiếng Anh, và định dạng mốc thời gian. Hàm thuần.

export const SPEAKING_ERRORS = {
  final_sound: 'Mất âm cuối',
  th: 'Âm /θ/ /ð/ (th)',
  sh_s: 'Lẫn /ʃ/ và /s/',
  z: 'Âm /z/',
  s_es: 'Đuôi s/es',
  ed: 'Đuôi -ed',
  stress: 'Trọng âm',
  intonation: 'Ngữ điệu',
  missing_word: 'Thiếu hoặc thừa từ',
  tense: 'Sai thì',
  other: 'Khác',
} as const;

export type SpeakingErrorType = keyof typeof SPEAKING_ERRORS;

export function isSpeakingError(value: string): value is SpeakingErrorType {
  return Object.prototype.hasOwnProperty.call(SPEAKING_ERRORS, value);
}

// 7300 → "0:07", 65000 → "1:05"
export function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export type SpeakingMark = {
  id: number;
  itemId: number;
  atMs: number;
  errorType: SpeakingErrorType;
  correctText: string;
  note: string;
  redo: boolean;
};

// Gợi ý cho trẻ nhỏ chỉ nêu 1–2 lỗi quan trọng nhất (35.9): ưu tiên câu cần nói lại, rồi theo thứ tự thời gian
export function topMarks(marks: SpeakingMark[], limit = 2): SpeakingMark[] {
  return [...marks].sort((a, b) => Number(b.redo) - Number(a.redo) || a.atMs - b.atMs).slice(0, limit);
}
