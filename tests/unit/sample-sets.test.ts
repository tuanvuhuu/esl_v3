import { describe, expect, it } from 'vitest';
import { itemPoints, type ScoringItem } from '@/lib/assignment-scoring';
import { STARTERS_SET } from '@/lib/sample-sets';
import { itemFormSchema, itemsPayloadSchema } from '@/lib/validation/assignment';
import { wordListSchema } from '@/lib/validation/word-list';

// Bộ bài mẫu Starters (35.21): qua đúng kiểm tra như câu giáo viên soạn, đủ các dạng câu, đáp án mẫu chấm đủ điểm
describe('bộ bài mẫu Starters', () => {
  const inputs = (lessonIndex: number) =>
    STARTERS_SET.lessons[lessonIndex].items.map((i) => ({
      id: null,
      skill: i.skill,
      itemType: i.itemType,
      prompt: i.prompt,
      promptVi: i.promptVi,
      passage: i.passage ?? '',
      points: i.points,
      audioFileId: null,
      imageFileId: null,
      modelAudioFileId: null,
      referenceText: i.referenceText ?? '',
      maxSeconds: i.maxSeconds ?? 10,
      sourceLicense: 'Bài mẫu ESL Center',
      options: (i.options ?? []).map((o) => ({ id: null, label: o.label, isCorrect: o.isCorrect ?? false })),
      pairs: (i.pairs ?? []).map((p) => ({ id: null, leftLabel: p.left, rightLabel: p.right })),
      criteria: [],
      bankQuestionId: null,
    }));

  it('3 bài, tên không trùng, mỗi bài đủ 9 dạng câu', () => {
    expect(STARTERS_SET.lessons).toHaveLength(3);
    expect(new Set(STARTERS_SET.lessons.map((l) => l.title)).size).toBe(3);
    const all = ['picture_choice', 'choice', 'match', 'gap_fill', 'order', 'speak_repeat', 'speak_read', 'speak_picture', 'text'];
    for (const l of STARTERS_SET.lessons) expect(new Set(l.items.map((i) => i.itemType))).toEqual(new Set(all));
  });

  it.each(STARTERS_SET.lessons.map((l, i) => [l.title, i] as const))('%s qua được kiểm tra của máy chủ', (_title, index) => {
    for (const input of inputs(index)) {
      const r = itemFormSchema.safeParse(input);
      expect(r.success, `${input.prompt}: ${r.success ? '' : r.error.issues[0]?.message}`).toBe(true);
    }
    expect(itemsPayloadSchema.safeParse(inputs(index)).success).toBe(true);
  });

  it('đáp án mẫu được chấm đủ điểm cho mọi câu tự chấm', () => {
    for (const lesson of STARTERS_SET.lessons) {
      lesson.items.forEach((i, idx) => {
        const item: ScoringItem = {
          id: idx + 1,
          skill: i.skill,
          itemType: i.itemType,
          points: i.points,
          referenceText: i.referenceText ?? '',
          criteria: [],
          options: (i.options ?? []).map((o, oi) => ({ id: oi + 1, isCorrect: o.isCorrect ?? false, label: o.label })),
          pairs: (i.pairs ?? []).map((p, pi) => ({ id: pi + 1, leftLabel: p.left, rightLabel: p.right })),
        };
        const blank = { itemId: item.id, selectedOptionId: null, answerText: '', fileId: null, points: null, criterionPoints: {} };
        if (i.itemType === 'choice' || i.itemType === 'picture_choice') {
          expect(i.options?.filter((o) => o.isCorrect)).toHaveLength(1);
          expect(itemPoints(item, { ...blank, selectedOptionId: 1 })).toBe(i.points);
        }
        if (i.itemType === 'order') expect(itemPoints(item, { ...blank, answerText: i.referenceText ?? '' })).toBe(i.points);
        if (i.itemType === 'gap_fill') expect(itemPoints(item, { ...blank, answerText: (i.referenceText ?? '').split('|')[0] })).toBe(i.points);
        if (i.itemType === 'match') {
          const all = JSON.stringify((i.pairs ?? []).map((p) => ({ left: p.left, right: p.right })));
          expect(itemPoints(item, { ...blank, answerText: all })).toBe(i.points);
        }
      });
    }
  });

  it('danh sách từ qua kiểm tra, mỗi từ có câu mẫu cho trò Xây câu', () => {
    const r = wordListSchema.safeParse({
      name: STARTERS_SET.wordList.name,
      classId: null,
      lessonId: null,
      items: STARTERS_SET.wordList.words.map((w) => ({ ...w, imageFileId: null, audioFileId: null, vocabItemId: null })),
    });
    expect(r.success, r.success ? '' : r.error.issues[0]?.message).toBe(true);
    for (const w of STARTERS_SET.wordList.words) {
      expect(w.sentence.toLowerCase()).toContain(w.word.slice(0, 3));
    }
  });
});
