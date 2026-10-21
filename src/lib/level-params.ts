// Độ khó của câu sinh tự động theo trình độ của lớp (P36.1, docs/NGHIEN-CUU-SOAN-CAU-HOI.md mục 5).
// Đề xuất ban đầu: giáo viên của trung tâm chỉnh lại sau vài tuần dùng. Hàm thuần, dùng được ở server và giao diện.

export type LevelParams = {
  code: 'Pre-A1' | 'A1' | 'A2';
  pictureOptions: number; // số tranh của câu nghe chọn tranh
  meaningOptions: number; // số đáp án của câu trắc nghiệm nghĩa
  pairs: [number, number]; // số cặp một câu ghép đôi (ít nhất, nhiều nhất)
  orderWords: [number, number]; // số từ của câu sắp xếp (ít nhất, nhiều nhất)
  gapMode: 'pick' | 'pick_or_type' | 'type'; // điền chỗ trống: chạm chọn từ, chọn hoặc gõ, gõ
  speakSeconds: number; // giây ghi âm của câu nhắc lại, đọc to
  lessonSize: [number, number]; // số câu gợi ý cho một bài
  viPrompt: 'always' | 'yes' | 'optional'; // hướng dẫn tiếng Việt
};

export const LEVEL_PARAMS: Record<LevelParams['code'], LevelParams> = {
  'Pre-A1': { code: 'Pre-A1', pictureOptions: 3, meaningOptions: 3, pairs: [3, 4], orderWords: [3, 4], gapMode: 'pick', speakSeconds: 5, lessonSize: [8, 10], viPrompt: 'always' },
  A1: { code: 'A1', pictureOptions: 4, meaningOptions: 3, pairs: [4, 5], orderWords: [4, 6], gapMode: 'pick_or_type', speakSeconds: 10, lessonSize: [10, 15], viPrompt: 'yes' },
  A2: { code: 'A2', pictureOptions: 4, meaningOptions: 4, pairs: [5, 6], orderWords: [6, 9], gapMode: 'type', speakSeconds: 15, lessonSize: [15, 20], viPrompt: 'optional' },
};

// Lớp chưa xếp trình độ dùng A1. Từ B1 trở lên dùng mức khó nhất đang có (A2).
export function levelParams(code: string | null | undefined): LevelParams {
  if (code === 'Pre-A1' || code === 'A1' || code === 'A2') return LEVEL_PARAMS[code];
  if (code && /^(B|C)\d/.test(code)) return LEVEL_PARAMS.A2;
  return LEVEL_PARAMS.A1;
}

// Tên hiển thị kèm tên kỳ thi thiếu nhi, ví dụ "A1 (Movers)"
export const LEVEL_LABELS: Record<LevelParams['code'], string> = { 'Pre-A1': 'Pre-A1 (Starters)', A1: 'A1 (Movers)', A2: 'A2 (Flyers)' };
