// Bản nháp câu hỏi trên màn soạn (P22, P23, P24). Hàm thuần, dùng chung cho soạn câu trong bài và trong ngân hàng.
import type { ItemType, Skill } from '@/lib/assignment-scoring';
import type { ItemInput } from '@/app/(app)/bai-tap/question-actions';
import type { BankQuestion } from '@/lib/queries/question-bank';

export const MAX_OPTIONS = 6;

export type DraftOption = { key: string; id: number | null; label: string; isCorrect: boolean };
export type DraftCriterion = { key: string; id: number | null; name: string; maxPoints: string };
export type Draft = {
  key: string;
  id: number | null;
  skill: Skill;
  itemType: ItemType;
  prompt: string;
  passage: string;
  points: string;
  audioFileId: number | null;
  audioName: string | null;
  options: DraftOption[];
  criteria: DraftCriterion[];
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
  options: { id: number; label: string; isCorrect: boolean }[];
  criteria: { id: number; name: string; maxPoints: number }[];
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
    passage: source.passage,
    points: String(source.points),
    audioFileId: source.audioFileId,
    audioName: source.audioName,
    options: source.options.map((o) => ({ key: newKey(), id: o.id, label: o.label, isCorrect: o.isCorrect })),
    criteria: source.criteria.map((c) => ({ key: newKey(), id: c.id, name: c.name, maxPoints: String(c.maxPoints) })),
    bankQuestionId,
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
    passage: '',
    points: '1',
    audioFileId: null,
    audioName: null,
    options: [
      { key: newKey(), id: null, label: '', isCorrect: true },
      { key: newKey(), id: null, label: '', isCorrect: false },
    ],
    criteria: [],
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
  };
}

// Điểm câu có tiêu chí là tổng điểm tối đa các tiêu chí
export const criteriaTotal = (d: Draft) => d.criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);

// Dữ liệu gửi lên máy chủ. Trắc nghiệm không có tiêu chí; câu có tiêu chí lấy điểm từ tổng tiêu chí.
export function draftToInput(d: Draft): ItemInput {
  const criteria = d.itemType === 'choice' ? [] : d.criteria.map((c) => ({ id: c.id, name: c.name, maxPoints: Number(c.maxPoints) }));
  return {
    id: d.id,
    skill: d.skill,
    itemType: d.itemType,
    prompt: d.prompt,
    passage: d.passage,
    points: criteria.length > 0 ? criteria.reduce((sum, c) => sum + c.maxPoints, 0) : Number(d.points),
    audioFileId: d.audioFileId,
    bankQuestionId: d.bankQuestionId,
    options: d.itemType === 'choice' ? d.options.map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })) : [],
    criteria,
  };
}

// Nội dung ngắn để nhận diện câu trong danh sách chọn
export function snippet(text: string, audioName: string | null): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean) return clean.length > 80 ? `${clean.slice(0, 80)}…` : clean;
  return audioName ? `(âm thanh: ${audioName})` : '(không có nội dung)';
}
