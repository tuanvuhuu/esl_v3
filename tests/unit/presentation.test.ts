import { describe, expect, it } from 'vitest';
import type { GameWord } from '@/lib/games';
import { slidesFromItems, slidesFromWords, stepPresentation } from '@/lib/presentation';

const w = (word: string, meaningVi = ''): GameWord => ({ word, meaningVi, emoji: '', sentence: '', imageFileId: null, audioFileId: null });
const WORDS = [w('cat', 'con mèo'), w('dog', 'con chó'), w('bird', 'con chim'), w('fish', 'con cá')];

describe('trình chiếu', () => {
  it('thẻ từ: mỗi từ một trang, đáp án là từ và nghĩa', () => {
    const s = slidesFromWords(WORDS, 'flash', 1);
    expect(s).toHaveLength(4);
    expect(s[0]).toMatchObject({ kind: 'flash', answer: 'cat', answerVi: 'con mèo', speakText: 'cat', options: [] });
  });

  it('đố cả lớp: mỗi trang 3 từ khác nhau, đúng một từ đúng là từ của trang', () => {
    for (const s of slidesFromWords(WORDS, 'quiz', 7)) {
      expect(s.options).toHaveLength(3);
      expect(new Set(s.options.map((o) => o.label)).size).toBe(3);
      expect(s.options.filter((o) => o.correct).map((o) => o.label)).toEqual([s.answer]);
    }
  });

  it('câu hỏi của bài: trắc nghiệm thành câu đố; ghép đôi, điền chỗ trống, sắp xếp, câu nói có đáp án mẫu', () => {
    const base = { promptVi: null, passage: '', imageFileId: null, audioFileId: null, referenceText: null, options: [], pairs: [] };
    const s = slidesFromItems([
      { ...base, itemType: 'choice', prompt: 'Pick', options: [{ label: 'A', imageFileId: null, isCorrect: false }, { label: 'B', imageFileId: null, isCorrect: true }] },
      { ...base, itemType: 'match', prompt: 'Match', pairs: [{ leftLabel: 'cat', rightLabel: 'mèo' }, { leftLabel: 'dog', rightLabel: 'chó' }] },
      { ...base, itemType: 'gap_fill', prompt: 'I ___ a cat', referenceText: 'have|own' },
      { ...base, itemType: 'order', prompt: 'Order', referenceText: 'I like cats.' },
      { ...base, itemType: 'speak_repeat', prompt: 'Repeat', referenceText: 'Hello!' },
      { ...base, itemType: 'text', prompt: 'Write' },
    ]);
    expect(s.map((x) => x.kind)).toEqual(['quiz', 'info', 'info', 'info', 'info', 'info']);
    expect(s[0].answer).toBe('B');
    expect(s[1].answer).toBe('cat – mèo · dog – chó');
    expect(s[2].answer).toBe('have');
    expect(s[3].answer).toBe('I like cats.');
    expect(s[4]).toMatchObject({ answer: 'Hello!', speakText: 'Hello!' });
    expect(s[5].answer).toBe('');
  });

  it('chuyển trang: Tiếp hiện đáp án trước rồi mới sang trang; sang trang thì ẩn đáp án; không ra ngoài khoảng', () => {
    let st = { slide: 0, revealed: false };
    st = stepPresentation(st, { op: 'next' }, 3);
    expect(st).toEqual({ slide: 0, revealed: true });
    st = stepPresentation(st, { op: 'next' }, 3);
    expect(st).toEqual({ slide: 1, revealed: false });
    expect(stepPresentation({ slide: 2, revealed: true }, { op: 'next' }, 3)).toEqual({ slide: 2, revealed: true });
    expect(stepPresentation({ slide: 0, revealed: true }, { op: 'prev' }, 3)).toEqual({ slide: 0, revealed: false });
    expect(stepPresentation({ slide: 1, revealed: false }, { op: 'goto', to: 99 }, 3)).toEqual({ slide: 2, revealed: false });
    expect(stepPresentation({ slide: 1, revealed: true }, { op: 'hide' }, 3)).toEqual({ slide: 1, revealed: false });
  });
});
