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
  modelFileId: number | null; // giọng mẫu của giáo viên
};

// Gợi ý cho trẻ nhỏ chỉ nêu 1–2 lỗi quan trọng nhất (35.9): ưu tiên câu cần nói lại, rồi theo thứ tự thời gian
export function topMarks(marks: SpeakingMark[], limit = 2): SpeakingMark[] {
  return [...marks].sort((a, b) => Number(b.redo) - Number(a.redo) || a.atMs - b.atMs).slice(0, limit);
}

// ---------- Tiêu chí bài nói theo độ tuổi (35.9) ----------

// Trẻ đến 8 tuổi chấm sao (1–3 sao, ba tiêu chí); từ 9 tuổi chấm điểm 0–5, thêm từ vựng và ngữ pháp.
// Chưa có ngày sinh thì coi như trẻ nhỏ (trung tâm mầm non thường chưa có ngày sinh).
export type SpeakingScale = 'stars' | 'points';
export const SPEAKING_CRITERIA = {
  pronunciation: 'Phát âm',
  fluency: 'Trôi chảy',
  task: 'Hoàn thành yêu cầu',
  vocabulary: 'Từ vựng',
  grammar: 'Ngữ pháp',
} as const;
export type SpeakingCriterion = keyof typeof SPEAKING_CRITERIA;

export const SCALE_CRITERIA: Record<SpeakingScale, SpeakingCriterion[]> = {
  stars: ['pronunciation', 'fluency', 'task'],
  points: ['pronunciation', 'fluency', 'task', 'vocabulary', 'grammar'],
};
export const SCALE_RANGE: Record<SpeakingScale, { min: number; max: number }> = { stars: { min: 1, max: 3 }, points: { min: 0, max: 5 } };

// Tuổi tròn tại ngày todayKey (YYYY-MM-DD); dob null thì không biết
export function speakingScale(dob: string | null, todayKey: string): SpeakingScale {
  if (!dob) return 'stars';
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && td < d)) age--;
  return age <= 8 ? 'stars' : 'points';
}

// Điểm tiêu chí quy ra điểm câu: tổng đạt được chia tổng tối đa, nhân điểm câu, làm tròn (1 sao vẫn được một phần điểm).
export function rubricToPoints(scale: SpeakingScale, scores: Partial<Record<SpeakingCriterion, number>>, itemPoints: number): number | null {
  const keys = SCALE_CRITERIA[scale];
  const { min, max } = SCALE_RANGE[scale];
  if (keys.some((k) => scores[k] === undefined || scores[k]! < min || scores[k]! > max || !Number.isInteger(scores[k]))) return null;
  const got = keys.reduce((sum, k) => sum + scores[k]!, 0);
  return Math.round((got / (keys.length * max)) * itemPoints);
}
