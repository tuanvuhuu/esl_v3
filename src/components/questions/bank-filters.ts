// Lọc ngân hàng câu hỏi theo kỹ năng, trình độ, chủ đề, dạng câu (P36.6). Dùng chung cho trang ngân hàng và hộp chép câu vào bài.
import { ITEM_TYPE_LABELS, ITEM_TYPES, SKILL_LABELS, SKILLS, type ItemType, type Skill } from '@/lib/assignment-scoring';
import { LEVEL_LABELS } from '@/lib/level-params';
import type { BankQuestion } from '@/lib/queries/question-bank';
import { STARTER_TOPIC_LABELS } from '@/lib/vocab-starter';
import { LEVEL_ORDER, topicLabel } from '@/lib/vocab-topics';

export type BankFilter = { skill: 'all' | Skill; level: string; topic: string; type: 'all' | ItemType };
export const ALL = 'all';
export const NONE = '__none__'; // chưa xếp trình độ hoặc chủ đề
export const EMPTY_FILTER: BankFilter = { skill: 'all', level: ALL, topic: ALL, type: 'all' };

export const levelLabel = (code: string) => (code in LEVEL_LABELS ? LEVEL_LABELS[code as keyof typeof LEVEL_LABELS] : code) || 'Chưa xếp';

export const SKILL_OPTIONS = [{ value: 'all', label: 'Tất cả kỹ năng' }, ...SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))];
export const TYPE_OPTIONS = [{ value: 'all', label: 'Mọi dạng câu' }, ...ITEM_TYPES.map((t) => ({ value: t, label: ITEM_TYPE_LABELS[t] }))];
export const LEVEL_OPTIONS = [{ value: ALL, label: 'Mọi trình độ' }, ...LEVEL_ORDER.map((c) => ({ value: c, label: levelLabel(c) })), { value: NONE, label: 'Chưa xếp trình độ' }];
// Ô chọn trong form: không có "mọi trình độ"
export const LEVEL_FIELD_OPTIONS = [{ value: '', label: 'Chưa xếp' }, ...LEVEL_ORDER.map((c) => ({ value: c, label: levelLabel(c) }))];

// Chủ đề có sẵn của bộ từ, cộng chủ đề đang dùng trong ngân hàng
export function topicKeys(questions: BankQuestion[]): string[] {
  return [...new Set([...Object.keys(STARTER_TOPIC_LABELS), ...questions.map((q) => q.topic).filter(Boolean)])];
}
export function topicOptions(questions: BankQuestion[]) {
  return [{ value: ALL, label: 'Mọi chủ đề' }, ...topicKeys(questions).map((t) => ({ value: t, label: topicLabel(t) })), { value: NONE, label: 'Chưa xếp chủ đề' }];
}
export function topicFieldOptions(questions: BankQuestion[]) {
  return [{ value: '', label: 'Chưa xếp' }, ...topicKeys(questions).map((t) => ({ value: t, label: topicLabel(t) }))];
}

const match = (value: string, wanted: string) => wanted === ALL || (wanted === NONE ? value === '' : value === wanted);

export function filterBank(questions: BankQuestion[], f: BankFilter): BankQuestion[] {
  return questions.filter((q) => (f.skill === 'all' || q.skill === f.skill) && (f.type === 'all' || q.itemType === f.type) && match(q.level, f.level) && match(q.topic, f.topic));
}
