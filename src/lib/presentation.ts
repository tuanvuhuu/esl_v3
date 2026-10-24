// Trình chiếu cho cả lớp (35.19): đổi danh sách từ hoặc câu hỏi của bài thành các trang chiếu, và tính bước chuyển trang.
// Logic thuần, không đụng DB. Máy chiếu và điện thoại điều khiển dùng chung một trạng thái (trang đang chiếu, đã hiện đáp án chưa).
import { seeded, shuffle, type GameWord } from '@/lib/games';

export type SlideOption = { label: string; imageFileId: number | null; correct: boolean };
export type Slide = {
  kind: 'flash' | 'quiz' | 'info';
  prompt: string;
  promptVi: string;
  passage: string;
  emoji: string;
  imageFileId: number | null;
  audioFileId: number | null;
  speakText: string; // câu đọc bằng giọng máy khi không có âm thanh tải lên
  options: SlideOption[];
  answer: string;
  answerVi: string;
};

export type PresentMode = 'flash' | 'quiz';
export const PRESENT_MODES: Record<PresentMode, string> = { flash: 'Thẻ từ', quiz: 'Đố cả lớp' };

const blank = (s: Partial<Slide>): Slide => ({ kind: 'info', prompt: '', promptVi: '', passage: '', emoji: '', imageFileId: null, audioFileId: null, speakText: '', options: [], answer: '', answerVi: '', ...s });

// Danh sách từ: Thẻ từ (tranh trước, hiện đáp án là từ và nghĩa) hoặc Đố cả lớp (tranh và 3 từ, hiện đáp án tô từ đúng)
export function slidesFromWords(words: GameWord[], mode: PresentMode, seed: number): Slide[] {
  const rand = seeded(seed);
  return words.map((w) => {
    const base = { emoji: w.emoji, imageFileId: w.imageFileId, audioFileId: w.audioFileId, speakText: w.word, answer: w.word, answerVi: w.meaningVi };
    if (mode === 'flash') return blank({ ...base, kind: 'flash', prompt: 'What is it?' });
    const others = shuffle(words.filter((o) => o.word.toLowerCase() !== w.word.toLowerCase()), rand).slice(0, 2);
    const options = shuffle([w, ...others], rand).map((o) => ({ label: o.word, imageFileId: null, correct: o === w }));
    return blank({ ...base, kind: 'quiz', prompt: 'Which word is it?', options });
  });
}

export type PresentItem = {
  itemType: string;
  prompt: string;
  promptVi: string | null;
  passage: string;
  imageFileId: number | null;
  audioFileId: number | null;
  referenceText: string | null;
  options: { label: string; imageFileId: number | null; isCorrect: boolean }[];
  pairs: { leftLabel: string; rightLabel: string }[];
};

// Câu hỏi của bài: trắc nghiệm, chọn tranh thành câu đố có đáp án tô màu; các dạng khác hiện đề, đáp án là câu mẫu (nếu có)
export function slidesFromItems(items: PresentItem[]): Slide[] {
  return items.map((it) => {
    const base = { prompt: it.prompt, promptVi: it.promptVi ?? '', passage: it.passage, imageFileId: it.imageFileId, audioFileId: it.audioFileId };
    const correct = it.options.filter((o) => o.isCorrect).map((o) => o.label).filter(Boolean);
    if (it.itemType === 'choice' || it.itemType === 'picture_choice') {
      return blank({ ...base, kind: 'quiz', options: it.options.map((o) => ({ label: o.label, imageFileId: o.imageFileId, correct: o.isCorrect })), answer: correct.join(', ') });
    }
    let answer = '';
    if (it.itemType === 'match') answer = it.pairs.map((p) => `${p.leftLabel} – ${p.rightLabel}`).join(' · ');
    else if (it.itemType === 'gap_fill') answer = (it.referenceText ?? '').split(/[|,]/)[0]?.trim() || correct[0] || '';
    else if (it.itemType === 'order' || it.itemType.startsWith('speak_')) answer = it.referenceText ?? '';
    return blank({ ...base, kind: 'info', speakText: it.itemType.startsWith('speak_') ? (it.referenceText ?? '') : '', answer });
  });
}

// Bước chuyển trang từ máy chiếu hoặc điện thoại. Sang trang khác thì ẩn đáp án lại.
export type PresentState = { slide: number; revealed: boolean };
export type PresentStep = { op: 'next' | 'prev' | 'reveal' | 'hide' | 'goto'; to?: number };
export function stepPresentation(state: PresentState, step: PresentStep, total: number): PresentState {
  const last = Math.max(0, total - 1);
  const clamp = (n: number) => Math.min(last, Math.max(0, n));
  switch (step.op) {
    case 'next':
      // Trang chưa hiện đáp án thì bấm Tiếp là hiện đáp án trước (bấm một nút duy nhất trên bút trình chiếu vẫn đủ)
      if (!state.revealed) return { ...state, revealed: true };
      return state.slide >= last ? state : { slide: state.slide + 1, revealed: false };
    case 'prev':
      return state.slide <= 0 ? { slide: 0, revealed: false } : { slide: state.slide - 1, revealed: false };
    case 'reveal':
      return { ...state, revealed: true };
    case 'hide':
      return { ...state, revealed: false };
    case 'goto':
      return { slide: clamp(step.to ?? 0), revealed: false };
  }
}
