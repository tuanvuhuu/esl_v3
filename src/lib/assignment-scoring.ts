// Tính điểm bài tập có câu hỏi (P22, P23). Hàm thuần, không đụng cơ sở dữ liệu, có unit test.
// Trắc nghiệm tự chấm theo đáp án đã chọn. Câu viết và nộp tệp do giáo viên cho điểm, theo tiêu chí nếu câu có tiêu chí.

export const SKILLS = ['listening', 'speaking', 'reading', 'writing'] as const;
export type Skill = (typeof SKILLS)[number];
export const SKILL_LABELS: Record<Skill, string> = { listening: 'Nghe', speaking: 'Nói', reading: 'Đọc', writing: 'Viết' };

export const ITEM_TYPES = [
  'choice',
  'text',
  'file',
  'picture_choice',
  'match',
  'order',
  'gap_fill',
  'speak_repeat',
  'speak_read',
  'speak_picture',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  choice: 'Trắc nghiệm',
  text: 'Trả lời viết',
  file: 'Nộp tệp',
  picture_choice: 'Nghe / Chọn tranh',
  match: 'Ghép đôi',
  order: 'Sắp xếp câu / từ',
  gap_fill: 'Điền chỗ trống',
  speak_repeat: 'Nghe nhắc lại',
  speak_read: 'Đọc to',
  speak_picture: 'Nói về tranh',
};

// Các dạng câu được chấm tự động ngay khi học sinh nộp bài
export function isAutoScoredItem(itemType: ItemType): boolean {
  return itemType === 'choice' || itemType === 'picture_choice' || itemType === 'match' || itemType === 'order' || itemType === 'gap_fill';
}

// Mẫu tiêu chí IELTS (P23): mỗi tiêu chí tối đa 5 điểm, câu có bốn tiêu chí là 20 điểm.
// Một câu nhiều nhất 8 tiêu chí, mỗi tiêu chí tối đa 10 điểm.
export const CRITERION_MAX_DEFAULT = 5;
export const CRITERIA_PER_ITEM = 8;
export const CRITERION_MAX_POINTS = 10;
export const RUBRIC_PRESETS: Record<'writing' | 'speaking', { label: string; criteria: string[] }> = {
  writing: {
    label: 'Mẫu IELTS viết',
    criteria: ['Task Response', 'Coherence and Cohesion', 'Lexical Resource', 'Grammatical Range and Accuracy'],
  },
  speaking: {
    label: 'Mẫu IELTS nói',
    criteria: ['Fluency and Coherence', 'Lexical Resource', 'Grammatical Range and Accuracy', 'Pronunciation'],
  },
};

export type ScoringOption = { id: number; label?: string; isCorrect: boolean };
export type ScoringPair = { id: number; leftLabel: string; rightLabel: string };
export type ScoringCriterion = { id: number; maxPoints: number };
export type ScoringItem = {
  id: number;
  skill: Skill;
  itemType: ItemType;
  points: number; // điểm tối đa của câu; câu có tiêu chí thì bằng tổng điểm tối đa các tiêu chí
  prompt?: string;
  promptVi?: string;
  referenceText?: string;
  options: ScoringOption[];
  pairs?: ScoringPair[];
  criteria: ScoringCriterion[];
};
export type ScoringAnswer = {
  itemId: number;
  selectedOptionId: number | null;
  answerText: string;
  fileId: number | null;
  points: number | null; // điểm giáo viên cho câu viết, nộp tệp không có tiêu chí
  criterionPoints?: Record<number, number | null>; // điểm từng tiêu chí theo id tiêu chí (cả bài)
};

export type SubmissionStatus = 'not_submitted' | 'submitted' | 'graded';

export type SubmissionSummary = {
  status: SubmissionStatus;
  total: number; // tổng điểm đã có (câu chưa chấm tính 0)
  maxTotal: number; // tổng điểm tối đa của mọi câu
  complete: boolean; // mọi câu đã có điểm
  skills: { skill: Skill; raw: number; max: number }[]; // chỉ các kỹ năng có câu trong bài
  points: Record<number, number | null>; // điểm từng câu theo id; null khi chưa chấm
};

// Chuẩn hoá câu để so khớp dạng sắp xếp và điền từ: bỏ dấu câu, chữ thường, gọn khoảng trắng
export function normalizeSentence(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Điểm một câu. Tự động chấm cho choice, picture_choice, match, order, gap_fill.
// Câu có tiêu chí: đủ mọi tiêu chí thì bằng tổng, thiếu thì chưa chấm.
// Câu viết, nộp tệp và các dạng nói tự do: lấy điểm giáo viên đã nhập.
export function itemPoints(item: ScoringItem, answer: ScoringAnswer | undefined): number | null {
  // 1. Trắc nghiệm & Chọn tranh: chọn đúng được điểm tối đa, sai hoặc chưa chọn thì 0
  if (item.itemType === 'choice' || item.itemType === 'picture_choice') {
    if (!answer || answer.selectedOptionId === null) return 0;
    const picked = item.options.find((o) => o.id === answer.selectedOptionId);
    return picked?.isCorrect ? item.points : 0;
  }

  // 2. Sắp xếp câu / từ (order): so khớp câu hoàn chỉnh sau khi chuẩn hoá
  if (item.itemType === 'order') {
    if (!answer || !answer.answerText.trim()) return 0;
    const target = normalizeSentence(item.referenceText || '');
    const user = normalizeSentence(answer.answerText);
    return target === user ? item.points : 0;
  }

  // 3. Điền chỗ trống (gap_fill): so khớp với đáp án chấp nhận được
  if (item.itemType === 'gap_fill') {
    if (!answer || !answer.answerText.trim()) return 0;
    const user = answer.answerText.trim().toLowerCase();
    const acceptable = (item.referenceText || '')
      .split(/[|,]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    for (const opt of item.options.filter((o) => o.isCorrect)) {
      if (opt.label) acceptable.push(opt.label.trim().toLowerCase());
    }
    return acceptable.includes(user) ? item.points : 0;
  }

  // 4. Ghép đôi (match): tính điểm theo tỷ lệ cặp ghép đúng
  if (item.itemType === 'match') {
    if (!answer || !answer.answerText.trim() || !item.pairs || item.pairs.length === 0) return 0;
    try {
      const userPairs = JSON.parse(answer.answerText) as { left?: string; right?: string }[];
      if (!Array.isArray(userPairs)) return 0;
      let matchedCount = 0;
      for (const pair of item.pairs) {
        const found = userPairs.find(
          (up) =>
            up.left?.trim().toLowerCase() === pair.leftLabel.trim().toLowerCase() &&
            up.right?.trim().toLowerCase() === pair.rightLabel.trim().toLowerCase(),
        );
        if (found) matchedCount++;
      }
      const score = (matchedCount / item.pairs.length) * item.points;
      return Math.round(score * 100) / 100;
    } catch {
      return 0;
    }
  }

  // 5. Câu có tiêu chí chấm (kể cả nói hoặc viết)
  if (item.criteria.length > 0) {
    let total = 0;
    for (const c of item.criteria) {
      const p = answer?.criterionPoints?.[c.id] ?? null;
      if (p === null) return null;
      total += p;
    }
    return total;
  }

  // 6. Câu viết, nộp tệp và câu nói do giáo viên cho điểm
  return answer?.points ?? null;
}

// Câu đã được làm: có đáp án, có chữ, có tệp, có điểm, hoặc có điểm ở một tiêu chí
function isAnswered(item: ScoringItem, answer: ScoringAnswer | undefined): boolean {
  if (!answer) return false;
  if (item.itemType === 'choice' || item.itemType === 'picture_choice') {
    return answer.selectedOptionId !== null;
  }
  const criterionDone = item.criteria.some((c) => (answer.criterionPoints?.[c.id] ?? null) !== null);
  return answer.answerText.trim() !== '' || answer.fileId !== null || answer.points !== null || criterionDone;
}

// Tổng hợp một bài làm: điểm từng câu, tổng, trạng thái và điểm theo kỹ năng.
// Chưa làm gì thì chưa nộp. Có làm mà còn câu chưa chấm thì đã nộp. Chấm đủ thì đã chấm.
export function summarizeSubmission(items: ScoringItem[], answers: ScoringAnswer[]): SubmissionSummary {
  const byItem = new Map(answers.map((a) => [a.itemId, a]));
  const points: Record<number, number | null> = {};
  let total = 0;
  let complete = true;
  let anyAnswered = false;

  for (const item of items) {
    const answer = byItem.get(item.id);
    const p = itemPoints(item, answer);
    points[item.id] = p;
    if (p === null) complete = false;
    else total += p;
    if (isAnswered(item, answer)) anyAnswered = true;
  }

  const skills = SKILLS.map((skill) => {
    const own = items.filter((i) => i.skill === skill);
    return {
      skill,
      raw: own.reduce((sum, i) => sum + (points[i.id] ?? 0), 0),
      max: own.reduce((sum, i) => sum + i.points, 0),
    };
  }).filter((s) => s.max > 0);

  const status: SubmissionStatus = !anyAnswered ? 'not_submitted' : complete ? 'graded' : 'submitted';
  return {
    status,
    total,
    maxTotal: items.reduce((sum, i) => sum + i.points, 0),
    complete,
    skills,
    points,
  };
}

// Điểm lưu vào bài nộp: chỉ khi đã chấm đủ mới có điểm, còn lại để trống như bài nhập tay.
// Cột điểm là số nguyên, còn ghép đôi đúng một phần cho điểm lẻ, nên làm tròn trước khi lưu.
export function storedScore(summary: SubmissionSummary): number | null {
  return summary.complete && summary.status === 'graded' ? Math.round(summary.total) : null;
}

// Chấm chéo (P23): lệch từ hai điểm trở lên thì đánh dấu để giáo viên xem lại
export const SECOND_MARK_GAP = 2;

// Độ lệch giữa điểm chính thức và điểm chấm lại của một câu. Thiếu một trong hai điểm thì không so sánh.
export function markGap(official: number | null, second: number | null): { gap: number; flagged: boolean } | null {
  if (official === null || second === null) return null;
  const gap = Math.abs(official - second);
  return { gap, flagged: gap >= SECOND_MARK_GAP };
}
