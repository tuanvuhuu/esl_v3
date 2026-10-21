// Tên tiếng Việt của chủ đề trong kho từ (P36.4). Khoá là chủ đề của bộ từ khởi đầu hoặc tên chủ đề CEFR-J giữ nguyên.
import { STARTER_TOPIC_LABELS } from './vocab-starter';

const CEFRJ_TOPIC_LABELS: Record<string, string> = {
  'Things in the town, shops and shopping': 'Phố phường',
  'Work and Jobs': 'Nghề nghiệp',
  'Hobbies and pastimes': 'Sở thích',
  'Travel and services vocab': 'Du lịch, dịch vụ',
  'Nationalities and countries': 'Quốc gia',
  'News, lifestyles and current affairs': 'Tin tức, đời sống',
  Shopping: 'Mua sắm',
  'Personal information': 'Thông tin cá nhân',
  'Leisure activities': 'Giải trí',
  'Books and literature': 'Sách, văn học',
  Media: 'Truyền thông',
  Collocation: 'Cụm từ',
  'Ways of travelling': 'Đi lại',
  Arts: 'Nghệ thuật',
  Holidays: 'Kỳ nghỉ',
  'Technical and legal language': 'Kỹ thuật, pháp lý',
  'Hobbies and lifestyles': 'Sở thích, lối sống',
  Film: 'Phim ảnh',
};

export const NO_TOPIC_LABEL = 'Chưa xếp chủ đề';

export function topicLabel(topic: string): string {
  if (!topic) return NO_TOPIC_LABEL;
  return (STARTER_TOPIC_LABELS as Record<string, string>)[topic] ?? CEFRJ_TOPIC_LABELS[topic] ?? topic;
}

// Mã trình độ theo thứ tự, để lấy từ của trình độ này và các trình độ thấp hơn
export const LEVEL_ORDER = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export function levelsUpTo(code: string): string[] {
  const i = LEVEL_ORDER.indexOf(code as (typeof LEVEL_ORDER)[number]);
  return [...LEVEL_ORDER.slice(0, i < 0 ? 2 : i + 1)];
}
