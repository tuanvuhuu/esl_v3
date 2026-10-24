import { describe, expect, it } from 'vitest';
import { correctAnswerText, hardQuestions, missingByStudent, waitingDays, type TrackedItem } from '@/lib/class-tracking';

const NOW = new Date('2026-10-24T03:00:00Z');
const day = (d: number) => new Date(NOW.getTime() + d * 86_400_000);

describe('bảng theo dõi lớp', () => {
  it('em chưa làm: gom theo học sinh, em thiếu nhiều trước; bài hạn sớm trước, đánh dấu quá hạn', () => {
    const out = missingByStudent(
      [
        { studentId: 1, fullName: 'An', assignmentId: 10, title: 'B1', dueAt: day(2) },
        { studentId: 2, fullName: 'Bình', assignmentId: 10, title: 'B1', dueAt: day(2) },
        { studentId: 2, fullName: 'Bình', assignmentId: 11, title: 'B0', dueAt: day(-3) },
      ],
      NOW,
    );
    expect(out.map((s) => s.fullName)).toEqual(['Bình', 'An']);
    expect(out[0].assignments.map((a) => [a.title, a.overdue])).toEqual([['B0', true], ['B1', false]]);
  });

  const choice: TrackedItem = {
    id: 1, assignmentId: 10, assignmentTitle: 'B1', skill: 'reading', itemType: 'choice', points: 1, prompt: 'Pick fruit', criteria: [],
    options: [{ id: 11, label: 'chair', isCorrect: false }, { id: 12, label: 'apple', isCorrect: true }],
  };
  const gap: TrackedItem = { id: 2, assignmentId: 10, assignmentTitle: 'B1', skill: 'reading', itemType: 'gap_fill', points: 1, prompt: 'I ___ a cat', referenceText: 'have|own', options: [], criteria: [] };
  const write: TrackedItem = { id: 3, assignmentId: 10, assignmentTitle: 'B1', skill: 'writing', itemType: 'text', points: 5, prompt: 'Write', options: [], criteria: [] };
  const ans = (itemId: number, selectedOptionId: number | null, answerText = '') => ({ itemId, selectedOptionId, answerText, fileId: null, points: null });

  it('câu hay sai: chỉ câu tự chấm, tỉ lệ sai cao trước, bỏ trống tính sai, kèm đáp án đúng', () => {
    const subs = [
      { assignmentId: 10, answers: [ans(1, 11), ans(2, null, 'have'), ans(3, null, 'x')] },
      { assignmentId: 10, answers: [ans(1, 12), ans(2, null, 'has')] },
      { assignmentId: 10, answers: [ans(2, null, 'own')] },
    ];
    const out = hardQuestions([choice, gap, write], subs);
    expect(out.map((q) => [q.itemId, q.wrong, q.answered])).toEqual([[1, 2, 3], [2, 1, 3]]);
    expect(out[0].answer).toBe('apple');
    expect(out[1].answer).toBe('have');
  });

  it('đáp án đúng theo dạng câu', () => {
    expect(correctAnswerText({ ...gap, referenceText: '' , options: [{ id: 1, label: 'own', isCorrect: true }] })).toBe('own');
    expect(correctAnswerText({ ...write, itemType: 'order', referenceText: 'I like cats.' })).toBe('I like cats.');
    expect(correctAnswerText({ ...write, itemType: 'match', pairs: [{ id: 1, leftLabel: 'cat', rightLabel: 'mèo' }] })).toBe('cat – mèo');
  });

  it('số ngày chờ chấm', () => {
    expect(waitingDays(day(-2.5), NOW)).toBe(2);
    expect(waitingDays(day(1), NOW)).toBe(0);
  });
});

describe('liên kết trong tin nhắn bot', () => {
  it('ghép APP_URL với đường dẫn; thiếu hoặc sai thì không kèm', async () => {
    const { appLink } = await import('@/lib/app-link');
    expect(appLink('/bai-tap/5', 'https://esl.example.vn/')).toBe('https://esl.example.vn/bai-tap/5');
    expect(appLink('/bai-tap/5', '')).toBe('');
    expect(appLink('/bai-tap/5', 'esl.example.vn')).toBe('');
  });
});
