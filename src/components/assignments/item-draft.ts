// Bản nháp câu hỏi trên màn soạn (P22, P23, P24). Hàm thuần, dùng chung cho soạn câu trong bài và trong ngân hàng.
import type { ItemType, Skill } from '@/lib/assignment-scoring';
import type { ItemInput } from '@/app/(app)/bai-tap/question-actions';
import type { BankQuestion } from '@/lib/queries/question-bank';

export const MAX_OPTIONS = 6;
export const MAX_PAIRS = 8;

export type DraftOption = {
  key: string;
  id: number | null;
  label: string;
  isCorrect: boolean;
  imageFileId: number | null;
  audioFileId: number | null;
};
export type DraftCriterion = { key: string; id: number | null; name: string; maxPoints: string };
export type DraftPair = {
  key: string;
  id: number | null;
  position: number;
  leftLabel: string;
  leftImageFileId: number | null;
  rightLabel: string;
  rightImageFileId: number | null;
};

export type Draft = {
  key: string;
  id: number | null;
  skill: Skill;
  itemType: ItemType;
  prompt: string;
  promptVi: string;
  passage: string;
  referenceText: string;
  points: string;
  audioFileId: number | null;
  audioName: string | null;
  imageFileId: number | null;
  modelAudioFileId: number | null;
  modelAudioName: string | null;
  wordTimings: string; // mốc karaoke của câu đọc to (35.7)
  maxSeconds: string;
  sourceLicense: string;
  options: DraftOption[];
  criteria: DraftCriterion[];
  pairs: DraftPair[];
  bankQuestionId: number | null; // câu chép từ ngân hàng nào (để đếm số bài dùng câu đó)
};

// Nguồn để dựng bản nháp: câu của bài hoặc câu trong ngân hàng
export type DraftSource = {
  id: number;
  skill: Skill;
  itemType: ItemType;
  prompt: string;
  passage: string;
  points: number;
  audioFileId: number | null;
  audioName: string | null;
  imageFileId?: number | null;
  modelAudioFileId?: number | null;
  promptVi?: string | null;
  referenceText?: string | null;
  wordTimings?: string | null;
  maxSeconds?: number | null;
  sourceLicense?: string | null;
  options: { id: number; label: string; isCorrect: boolean; imageFileId?: number | null; audioFileId?: number | null }[];
  criteria: { id: number; name: string; maxPoints: number }[];
  pairs?: {
    id: number;
    position: number;
    leftLabel: string;
    leftImageFileId: number | null;
    rightLabel: string;
    rightImageFileId: number | null;
  }[];
};

let counter = 0;
export const newKey = () => `k${++counter}`;

// Giữ id gốc để lưu đè đúng câu. bankQuestionId là câu ngân hàng gốc, nếu có.
export function toDraft(source: DraftSource, bankQuestionId: number | null = null): Draft {
  return {
    key: newKey(),
    id: source.id,
    skill: source.skill,
    itemType: source.itemType,
    prompt: source.prompt,
    promptVi: source.promptVi ?? '',
    passage: source.passage,
    referenceText: source.referenceText ?? '',
    points: String(source.points),
    audioFileId: source.audioFileId,
    audioName: source.audioName,
    imageFileId: source.imageFileId ?? null,
    modelAudioFileId: source.modelAudioFileId ?? null,
    modelAudioName: null,
    wordTimings: source.wordTimings ?? '',
    maxSeconds: source.maxSeconds ? String(source.maxSeconds) : '15',
    sourceLicense: source.sourceLicense ?? '',
    options: source.options.map((o) => ({
      key: newKey(),
      id: o.id,
      label: o.label,
      isCorrect: o.isCorrect,
      imageFileId: o.imageFileId ?? null,
      audioFileId: o.audioFileId ?? null,
    })),
    criteria: source.criteria.map((c) => ({ key: newKey(), id: c.id, name: c.name, maxPoints: String(c.maxPoints) })),
    pairs: (source.pairs ?? []).map((p) => ({
      key: newKey(),
      id: p.id,
      position: p.position,
      leftLabel: p.leftLabel ?? '',
      leftImageFileId: p.leftImageFileId ?? null,
      rightLabel: p.rightLabel ?? '',
      rightImageFileId: p.rightImageFileId ?? null,
    })),
    bankQuestionId,
  };
}

// Câu sinh từ Soạn nhanh (P36): dữ liệu gửi đi thành bản nháp mới, để giáo viên sửa tiếp trong màn soạn như câu tự soạn
export function draftFromInput(input: ItemInput): Draft {
  return {
    key: newKey(),
    id: null,
    skill: input.skill as Skill,
    itemType: input.itemType as ItemType,
    prompt: input.prompt,
    promptVi: input.promptVi ?? '',
    passage: input.passage,
    referenceText: input.referenceText ?? '',
    points: String(input.points),
    audioFileId: input.audioFileId,
    audioName: null,
    imageFileId: input.imageFileId ?? null,
    modelAudioFileId: input.modelAudioFileId ?? null,
    modelAudioName: null,
    wordTimings: input.wordTimings ?? '',
    maxSeconds: String(input.maxSeconds ?? 15),
    sourceLicense: input.sourceLicense ?? '',
    options: input.options.map((o) => ({ key: newKey(), id: null, label: o.label, isCorrect: o.isCorrect, imageFileId: o.imageFileId ?? null, audioFileId: o.audioFileId ?? null })),
    criteria: [],
    pairs: (input.pairs ?? []).map((p, i) => ({ key: newKey(), id: null, position: i + 1, leftLabel: p.leftLabel, leftImageFileId: p.leftImageFileId, rightLabel: p.rightLabel, rightImageFileId: p.rightImageFileId })),
    bankQuestionId: null,
  };
}

// Câu mới: trắc nghiệm hai đáp án, đáp án đầu tiên là đáp án đúng để giáo viên sửa
export function blankDraft(): Draft {
  return {
    key: newKey(),
    id: null,
    skill: 'reading',
    itemType: 'choice',
    prompt: '',
    promptVi: '',
    passage: '',
    referenceText: '',
    points: '1',
    audioFileId: null,
    audioName: null,
    imageFileId: null,
    modelAudioFileId: null,
    modelAudioName: null,
    wordTimings: '',
    maxSeconds: '15',
    sourceLicense: '',
    options: [
      { key: newKey(), id: null, label: '', isCorrect: true, imageFileId: null, audioFileId: null },
      { key: newKey(), id: null, label: '', isCorrect: false, imageFileId: null, audioFileId: null },
    ],
    criteria: [],
    pairs: [],
    bankQuestionId: null,
  };
}

// Chép từ ngân hàng: nội dung được chép, không giữ id của bản trong ngân hàng, nên sửa ngân hàng không đổi bài đã giao
export function draftFromBank(question: BankQuestion): Draft {
  const d = toDraft(question, question.id);
  return {
    ...d,
    id: null,
    options: d.options.map((o) => ({ ...o, id: null })),
    criteria: d.criteria.map((c) => ({ ...c, id: null })),
    pairs: d.pairs.map((p) => ({ ...p, id: null })),
  };
}

// Điểm câu có tiêu chí là tổng điểm tối đa các tiêu chí
export const criteriaTotal = (d: Draft) => d.criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);

// Dữ liệu gửi lên máy chủ. Trắc nghiệm không có tiêu chí; câu có tiêu chí lấy điểm từ tổng tiêu chí.
export function draftToInput(d: Draft): ItemInput {
  const hasOptions = ['choice', 'picture_choice', 'gap_fill', 'order'].includes(d.itemType);
  const criteria = hasOptions ? [] : d.criteria.map((c) => ({ id: c.id, name: c.name, maxPoints: Number(c.maxPoints) }));
  return {
    id: d.id,
    skill: d.skill,
    itemType: d.itemType,
    prompt: d.prompt,
    promptVi: d.promptVi.trim(),
    passage: d.passage,
    referenceText: d.referenceText.trim(),
    points: criteria.length > 0 ? criteria.reduce((sum, c) => sum + c.maxPoints, 0) : Number(d.points) || 1,
    audioFileId: d.audioFileId,
    bankQuestionId: d.bankQuestionId,
    imageFileId: d.imageFileId,
    modelAudioFileId: d.modelAudioFileId,
    wordTimings: d.itemType === 'speak_read' ? d.wordTimings : '',
    maxSeconds: Number(d.maxSeconds) || 15,
    sourceLicense: d.sourceLicense.trim(),
    options: hasOptions
      ? d.options.map((o) => ({
          id: o.id,
          label: o.label,
          isCorrect: o.isCorrect,
          imageFileId: o.imageFileId,
          audioFileId: o.audioFileId,
        }))
      : [],
    pairs:
      d.itemType === 'match'
        ? d.pairs.map((p, idx) => ({
            id: p.id,
            position: idx + 1,
            leftLabel: p.leftLabel.trim(),
            leftImageFileId: p.leftImageFileId,
            rightLabel: p.rightLabel.trim(),
            rightImageFileId: p.rightImageFileId,
          }))
        : [],
    criteria,
  };
}

// Nội dung ngắn để nhận diện câu trong danh sách chọn
export function snippet(text: string, audioName: string | null): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean) return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
  return audioName ? `(âm thanh: ${audioName})` : '(không có nội dung)';
}
