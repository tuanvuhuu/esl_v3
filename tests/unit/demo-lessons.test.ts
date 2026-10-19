import { describe, expect, it } from 'vitest';
import { itemPoints, type ScoringItem } from '@/lib/assignment-scoring';
import { DEMO_LESSONS } from '@/lib/demo-lessons';
import { itemFormSchema, itemsPayloadSchema } from '@/lib/validation/assignment';

// Bộ bài học thử phải qua được đúng kiểm tra như câu giáo viên soạn, và đáp án mẫu phải được chấm đúng
describe('bộ bài học thử', () => {
  const inputs = (lessonIndex: number) =>
    DEMO_LESSONS[lessonIndex].items.map((i) => ({
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

  it('có ít nhất năm bài, mỗi bài từ mười câu, tên bài không trùng', () => {
    expect(DEMO_LESSONS.length).toBeGreaterThanOrEqual(5);
    for (const l of DEMO_LESSONS) expect(l.items.length).toBeGreaterThanOrEqual(10);
    expect(new Set(DEMO_LESSONS.map((l) => l.title)).size).toBe(DEMO_LESSONS.length);
  });

  it.each(DEMO_LESSONS.map((l, i) => [l.title, i] as const))('%s qua được kiểm tra của máy chủ', (_title, index) => {
    for (const input of inputs(index)) {
      const r = itemFormSchema.safeParse(input);
      expect(r.success, `${input.prompt}: ${r.success ? '' : r.error.issues[0]?.message}`).toBe(true);
    }
    expect(itemsPayloadSchema.safeParse(inputs(index)).success).toBe(true);
  });

  it('đáp án mẫu được chấm đủ điểm cho mọi câu tự chấm', () => {
    for (const lesson of DEMO_LESSONS) {
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
        if (i.itemType === 'order') expect(itemPoints(item, { ...blank, answerText: i.referenceText! })).toBe(i.points);
        if (i.itemType === 'gap_fill') {
          expect(i.prompt).toContain('_____');
          expect(itemPoints(item, { ...blank, answerText: i.referenceText!.split('|')[0].toUpperCase() })).toBe(i.points);
        }
        if (i.itemType === 'match') {
          const answer = JSON.stringify(i.pairs!.map((p) => ({ left: p.left, right: p.right })));
          expect(itemPoints(item, { ...blank, answerText: answer })).toBe(i.points);
        }
      });
    }
  });
});
