import { describe, expect, it } from 'vitest';
import { blankDraft, draftFromBank, draftToInput, snippet, toDraft, type Draft } from '@/components/assignments/item-draft';
import type { BankQuestion } from '@/lib/queries/question-bank';

const bank: BankQuestion = {
  id: 7,
  skill: 'listening',
  itemType: 'choice',
  prompt: 'Listen and choose the day.',
  passage: '',
  points: 2,
  audioFileId: 3,
  audioName: 'day.mp3',
  options: [
    { id: 71, position: 1, label: 'Monday', isCorrect: true },
    { id: 72, position: 2, label: 'Tuesday', isCorrect: false },
  ],
  criteria: [],
  usageCount: 2,
};

describe('bản nháp câu hỏi', () => {
  it('câu mới là trắc nghiệm hai đáp án, đáp án đầu đúng, không gắn ngân hàng', () => {
    const d = blankDraft();
    expect(d.itemType).toBe('choice');
    expect(d.options.map((o) => o.isCorrect)).toEqual([true, false]);
    expect(d.bankQuestionId).toBeNull();
  });

  it('chép từ ngân hàng: bỏ id gốc, giữ nội dung và nhớ câu gốc', () => {
    const d = draftFromBank(bank);
    expect(d.id).toBeNull();
    expect(d.bankQuestionId).toBe(7);
    expect(d.audioFileId).toBe(3);
    expect(d.audioName).toBe('day.mp3');
    expect(d.options).toEqual([
      expect.objectContaining({ id: null, label: 'Monday', isCorrect: true }),
      expect.objectContaining({ id: null, label: 'Tuesday', isCorrect: false }),
    ]);
  });

  it('sửa câu của bài: giữ id câu và giữ liên kết ngân hàng', () => {
    const d = toDraft({ ...bank, id: 15 }, 7);
    expect(d.id).toBe(15);
    expect(d.bankQuestionId).toBe(7);
    expect(d.options[0]?.id).toBe(71);
  });
});

describe('gửi dữ liệu câu hỏi lên máy chủ', () => {
  it('trắc nghiệm: điểm lấy từ ô điểm, không có tiêu chí dù bản nháp còn', () => {
    const d: Draft = { ...blankDraft(), points: '3', criteria: [{ key: 'x', id: null, name: 'Thừa', maxPoints: '5' }] };
    const input = draftToInput(d);
    expect(input.points).toBe(3);
    expect(input.criteria).toEqual([]);
    expect(input.options).toHaveLength(2);
  });

  it('câu có tiêu chí: điểm câu là tổng điểm tiêu chí', () => {
    const d: Draft = {
      ...blankDraft(),
      itemType: 'text',
      points: '1',
      options: [],
      criteria: [
        { key: 'a', id: 1, name: 'Task Response', maxPoints: '5' },
        { key: 'b', id: null, name: 'Lexical Resource', maxPoints: '4' },
      ],
    };
    const input = draftToInput(d);
    expect(input.points).toBe(9);
    expect(input.criteria).toEqual([
      { id: 1, name: 'Task Response', maxPoints: 5 },
      { id: null, name: 'Lexical Resource', maxPoints: 4 },
    ]);
  });
});

describe('nội dung ngắn để nhận diện câu', () => {
  it('gọn khoảng trắng và cắt dài hơn 80 ký tự', () => {
    expect(snippet('  Hello   world  ', null)).toBe('Hello world');
    const long = 'a'.repeat(100);
    expect(snippet(long, null)).toBe(`${'a'.repeat(80)}…`);
  });

  it('không có nội dung thì hiện tên âm thanh, hoặc ghi chú trống', () => {
    expect(snippet('', 'day.mp3')).toBe('(âm thanh: day.mp3)');
    expect(snippet('', null)).toBe('(không có nội dung)');
  });
});
