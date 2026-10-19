import { describe, expect, it } from 'vitest';
import { itemPoints, markGap, RUBRIC_PRESETS, storedScore, summarizeSubmission, type ScoringAnswer, type ScoringItem } from '@/lib/assignment-scoring';

const listening: ScoringItem = {
  id: 1,
  skill: 'listening',
  itemType: 'choice',
  points: 2,
  criteria: [],
  options: [
    { id: 11, isCorrect: false },
    { id: 12, isCorrect: true },
  ],
};
const writing: ScoringItem = { id: 2, skill: 'writing', itemType: 'text', points: 5, criteria: [], options: [] };
const speaking: ScoringItem = { id: 3, skill: 'speaking', itemType: 'file', points: 4, criteria: [], options: [] };
// Bài viết có hai tiêu chí, mỗi tiêu chí 3 điểm: câu đủ 6 điểm
const rubricWriting: ScoringItem = {
  id: 4,
  skill: 'writing',
  itemType: 'text',
  points: 6,
  criteria: [
    { id: 41, maxPoints: 3 },
    { id: 42, maxPoints: 3 },
  ],
  options: [],
};

const blank = (itemId: number): ScoringAnswer => ({ itemId, selectedOptionId: null, answerText: '', fileId: null, points: null });

describe('chấm từng câu', () => {
  it('trắc nghiệm: chọn đúng được đủ điểm, chọn sai hoặc không chọn thì 0', () => {
    expect(itemPoints(listening, { ...blank(1), selectedOptionId: 12 })).toBe(2);
    expect(itemPoints(listening, { ...blank(1), selectedOptionId: 11 })).toBe(0);
    expect(itemPoints(listening, undefined)).toBe(0);
  });

  it('viết và nộp tệp: chưa có điểm giáo viên thì chưa chấm được', () => {
    expect(itemPoints(writing, { ...blank(2), answerText: 'Bài viết của em' })).toBeNull();
    expect(itemPoints(writing, { ...blank(2), answerText: 'Bài viết của em', points: 4 })).toBe(4);
  });

  it('câu có tiêu chí: đủ mọi tiêu chí thì bằng tổng, thiếu một tiêu chí thì chưa chấm', () => {
    expect(itemPoints(rubricWriting, { ...blank(4), criterionPoints: { 41: 3, 42: null } })).toBeNull();
    expect(itemPoints(rubricWriting, { ...blank(4), criterionPoints: { 41: 3, 42: 2 } })).toBe(5);
    expect(itemPoints(rubricWriting, { ...blank(4), criterionPoints: { 41: 3, 42: 3 } })).toBe(6);
  });

  it('mẫu IELTS: viết và nói đều có bốn tiêu chí', () => {
    expect(RUBRIC_PRESETS.writing.criteria).toHaveLength(4);
    expect(RUBRIC_PRESETS.speaking.criteria).toHaveLength(4);
  });
});

describe('trạng thái và tổng điểm của bài làm', () => {
  it('chưa làm gì thì chưa nộp, điểm để trống', () => {
    const s = summarizeSubmission([listening, writing], []);
    expect(s.status).toBe('not_submitted');
    expect(storedScore(s)).toBeNull();
  });

  it('có bài làm nhưng còn câu chưa chấm thì đã nộp, tổng là điểm đã có', () => {
    const s = summarizeSubmission([listening, writing], [
      { ...blank(1), selectedOptionId: 12 },
      { ...blank(2), answerText: 'Bài viết' },
    ]);
    expect(s.status).toBe('submitted');
    expect(s.complete).toBe(false);
    expect(s.total).toBe(2);
    expect(storedScore(s)).toBeNull();
  });

  it('chấm đủ mọi câu thì đã chấm, điểm là tổng và tách theo kỹ năng', () => {
    const s = summarizeSubmission([listening, writing, speaking], [
      { ...blank(1), selectedOptionId: 12 },
      { ...blank(2), answerText: 'Bài viết', points: 3 },
      { ...blank(3), fileId: 7, points: 4 },
    ]);
    expect(s.status).toBe('graded');
    expect(s.total).toBe(9);
    expect(s.maxTotal).toBe(11);
    expect(storedScore(s)).toBe(9);
    expect(s.skills).toEqual([
      { skill: 'listening', raw: 2, max: 2 },
      { skill: 'speaking', raw: 4, max: 4 },
      { skill: 'writing', raw: 3, max: 5 },
    ]);
  });

  it('chấm theo tiêu chí: chỉ chấm một tiêu chí thì bài còn đã nộp, điểm kỹ năng tính điểm đã có', () => {
    const answers: ScoringAnswer[] = [{ ...blank(4), criterionPoints: { 41: 3, 42: null } }];
    const s = summarizeSubmission([rubricWriting], answers);
    expect(s.status).toBe('submitted');
    expect(s.total).toBe(0);
    expect(s.skills).toEqual([{ skill: 'writing', raw: 0, max: 6 }]);
  });

  it('chấm theo tiêu chí đủ thì bài đã chấm và điểm bằng tổng các tiêu chí', () => {
    const answers: ScoringAnswer[] = [{ ...blank(4), criterionPoints: { 41: 3, 42: 2 } }];
    const s = summarizeSubmission([rubricWriting], answers);
    expect(s.status).toBe('graded');
    expect(storedScore(s)).toBe(5);
  });

  it('chỉ có trắc nghiệm được chọn thì tự chấm xong', () => {
    const s = summarizeSubmission([listening], [{ ...blank(1), selectedOptionId: 11 }]);
    expect(s.status).toBe('graded');
    expect(s.total).toBe(0);
    expect(storedScore(s)).toBe(0);
  });

  it('kỹ năng không có câu nào thì không hiện trong bảng điểm kỹ năng', () => {
    const s = summarizeSubmission([listening], []);
    expect(s.skills.map((x) => x.skill)).toEqual(['listening']);
  });
});

describe('chấm chéo', () => {
  it('thiếu một trong hai điểm thì không so sánh', () => {
    expect(markGap(null, 4)).toBeNull();
    expect(markGap(4, null)).toBeNull();
  });

  it('lệch dưới 2 điểm thì không đánh dấu, từ 2 điểm trở lên thì đánh dấu', () => {
    expect(markGap(5, 4)).toEqual({ gap: 1, flagged: false });
    expect(markGap(5, 5)).toEqual({ gap: 0, flagged: false });
    expect(markGap(5, 3)).toEqual({ gap: 2, flagged: true });
    expect(markGap(3, 6)).toEqual({ gap: 3, flagged: true });
  });
});

describe('các dạng câu hỏi online mới P35', () => {
  it('nghe chọn tranh (picture_choice): chọn đúng được điểm, sai được 0', () => {
    const item: ScoringItem = {
      id: 10,
      skill: 'listening',
      itemType: 'picture_choice',
      points: 2,
      criteria: [],
      options: [
        { id: 101, isCorrect: false },
        { id: 102, isCorrect: true },
      ],
    };
    expect(itemPoints(item, { ...blank(10), selectedOptionId: 102 })).toBe(2);
    expect(itemPoints(item, { ...blank(10), selectedOptionId: 101 })).toBe(0);
    expect(itemPoints(item, undefined)).toBe(0);
  });

  it('sắp xếp câu (order): so khớp chính xác câu sau khi chuẩn hoá bỏ dấu câu', () => {
    const item: ScoringItem = {
      id: 20,
      skill: 'reading',
      itemType: 'order',
      points: 3,
      referenceText: 'My father can cook.',
      criteria: [],
      options: [],
    };
    expect(itemPoints(item, { ...blank(20), answerText: 'My father can cook.' })).toBe(3);
    expect(itemPoints(item, { ...blank(20), answerText: 'my father can cook' })).toBe(3);
    expect(itemPoints(item, { ...blank(20), answerText: 'My father cook can' })).toBe(0);
  });

  it('điền chỗ trống (gap_fill): khớp một trong các đáp án đúng', () => {
    const item: ScoringItem = {
      id: 30,
      skill: 'reading',
      itemType: 'gap_fill',
      points: 2,
      referenceText: 'cat | a cat',
      criteria: [],
      options: [],
    };
    expect(itemPoints(item, { ...blank(30), answerText: 'cat' })).toBe(2);
    expect(itemPoints(item, { ...blank(30), answerText: 'A Cat' })).toBe(2);
    expect(itemPoints(item, { ...blank(30), answerText: 'dog' })).toBe(0);
  });

  it('ghép đôi (match): tính điểm theo tỷ lệ cặp ghép đúng', () => {
    const item: ScoringItem = {
      id: 40,
      skill: 'reading',
      itemType: 'match',
      points: 4,
      criteria: [],
      options: [],
      pairs: [
        { id: 1, leftLabel: 'mother', rightLabel: 'mẹ' },
        { id: 2, leftLabel: 'father', rightLabel: 'bố' },
        { id: 3, leftLabel: 'baby', rightLabel: 'em bé' },
        { id: 4, leftLabel: 'grandma', rightLabel: 'bà' },
      ],
    };

    // Đúng cả 4 cặp -> 4 điểm
    const allCorrect = JSON.stringify([
      { left: 'mother', right: 'mẹ' },
      { left: 'father', right: 'bố' },
      { left: 'baby', right: 'em bé' },
      { left: 'grandma', right: 'bà' },
    ]);
    expect(itemPoints(item, { ...blank(40), answerText: allCorrect })).toBe(4);

    // Đúng 2/4 cặp -> 2 điểm
    const halfCorrect = JSON.stringify([
      { left: 'mother', right: 'mẹ' },
      { left: 'father', right: 'bố' },
      { left: 'baby', right: 'sai' },
    ]);
    expect(itemPoints(item, { ...blank(40), answerText: halfCorrect })).toBe(2);

    // Dữ liệu JSON hỏng hoặc chưa làm -> 0 điểm
    expect(itemPoints(item, { ...blank(40), answerText: 'invalid json' })).toBe(0);
    expect(itemPoints(item, undefined)).toBe(0);
  });
});
