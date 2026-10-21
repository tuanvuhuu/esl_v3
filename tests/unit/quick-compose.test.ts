import { describe, expect, it } from 'vitest';
import type { ItemInput } from '@/app/(app)/bai-tap/question-actions';
import { itemPoints, type ScoringItem } from '@/lib/assignment-scoring';
import { LEVEL_PARAMS, levelParams } from '@/lib/level-params';
import {
  defaultCounts,
  gapTarget,
  generateItems,
  parseWordList,
  QUICK_TYPES,
  rerollItem,
  sentencesForOrder,
  splitSentences,
  switchItem,
  typeAvailability,
  type QuickType,
} from '@/lib/quick-compose';
import { findStarterWord, STARTER_WORDS, starterWordsUpTo } from '@/lib/vocab-starter';
import { itemFormSchema, itemsPayloadSchema } from '@/lib/validation/assignment';

// Nguồn ngẫu nhiên cố định để kết quả lặp lại được
function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const WORDS = parseWordList('cat - con mèo - 🐱\ndog - con chó - 🐶\nfish | con cá\nbird\nrabbit - con thỏ\nduck, con vịt, 🦆\nelephant\nmonkey - con khỉ - 🐵');
const SENTENCES = splitSentences('I have a little dog. The monkey likes bananas. My cat is very small. Can you see the big grey elephant in the zoo?');
const ALL: Record<QuickType, number> = { picture: 10, match: 3, meaning: 10, repeat: 10, order: 5, gap: 5, read: 5, write: 3 };

// Đổi câu sinh ra sang dạng chấm điểm để chấm thử đáp án đúng
function toScoring(input: ItemInput, id: number): ScoringItem {
  return {
    id,
    skill: input.skill as ScoringItem['skill'],
    itemType: input.itemType as ScoringItem['itemType'],
    points: input.points,
    referenceText: input.referenceText ?? '',
    criteria: [],
    options: input.options.map((o, i) => ({ id: i + 1, isCorrect: o.isCorrect, label: o.label })),
    pairs: (input.pairs ?? []).map((p, i) => ({ id: i + 1, leftLabel: p.leftLabel, rightLabel: p.rightLabel })),
  };
}

describe('trình độ', () => {
  it('Pre-A1 dễ hơn A1, A1 dễ hơn A2', () => {
    expect(LEVEL_PARAMS['Pre-A1'].pictureOptions).toBe(3);
    expect(LEVEL_PARAMS.A1.pictureOptions).toBe(4);
    expect(LEVEL_PARAMS['Pre-A1'].orderWords[1]).toBeLessThan(LEVEL_PARAMS.A2.orderWords[0]);
    expect(LEVEL_PARAMS['Pre-A1'].pairs[1]).toBeLessThanOrEqual(LEVEL_PARAMS.A2.pairs[0]);
  });
  it('lớp chưa xếp trình độ dùng A1, từ B1 trở lên dùng A2', () => {
    expect(levelParams(null).code).toBe('A1');
    expect(levelParams('B2').code).toBe('A2');
    expect(levelParams('Pre-A1').code).toBe('Pre-A1');
  });
});

describe('bộ từ có sẵn', () => {
  it('mỗi từ có nghĩa, chủ đề, trình độ; đủ từ Pre-A1 cho mọi chủ đề hay dạy', () => {
    expect(STARTER_WORDS.length).toBeGreaterThan(150);
    for (const w of STARTER_WORDS) {
      expect(w.en.trim()).toBe(w.en);
      expect(w.vi.length).toBeGreaterThan(0);
    }
    expect(starterWordsUpTo('Pre-A1', 'Animals').length).toBeGreaterThanOrEqual(8);
    expect(starterWordsUpTo('A2').length).toBe(STARTER_WORDS.length);
  });
  it('tra từ không phân biệt hoa thường', () => {
    expect(findStarterWord(' Cat ')?.vi).toBe('con mèo');
  });
});

describe('tách đầu vào', () => {
  it('nhận tab, gạch ngang, gạch đứng, dấu phẩy; thiếu nghĩa hoặc emoji thì lấy từ bộ từ', () => {
    expect(WORDS.map((w) => w.en)).toEqual(['cat', 'dog', 'fish', 'bird', 'rabbit', 'duck', 'elephant', 'monkey']);
    const fish = WORDS.find((w) => w.en === 'fish')!;
    expect(fish).toMatchObject({ vi: 'con cá', viFromBank: false, emoji: '🐟', emojiFromBank: true });
    const bird = WORDS.find((w) => w.en === 'bird')!;
    expect(bird).toMatchObject({ vi: 'con chim', viFromBank: true });
    expect(parseWordList('apple\tquả táo')[0]).toMatchObject({ en: 'apple', vi: 'quả táo' });
    expect(parseWordList('T-shirt - áo phông')[0].en).toBe('T-shirt');
    expect(parseWordList('cat\nCat\n\n')).toHaveLength(1);
    expect(parseWordList('zorbix')[0]).toMatchObject({ vi: '', emoji: '' });
  });
  it('tách câu, bỏ câu quá ngắn', () => {
    expect(splitSentences('Hi. I like red apples! Do you?')).toEqual(['I like red apples!']);
  });
});

describe('sinh câu', () => {
  for (const code of ['Pre-A1', 'A1', 'A2'] as const) {
    it(`${code}: mọi câu qua kiểm tra của máy chủ và đáp án đúng được đủ điểm`, () => {
      const level = LEVEL_PARAMS[code];
      const items = generateItems({ words: WORDS, sentences: SENTENCES, level, counts: ALL, rng: seeded() });
      expect(items.length).toBeGreaterThan(10);
      items.forEach((g, i) => {
        const r = itemFormSchema.safeParse(g.input);
        expect(r.success, `${g.quickType}: ${r.success ? '' : r.error.issues[0]?.message}`).toBe(true);
        const s = toScoring(g.input, i + 1);
        const blank = { itemId: s.id, selectedOptionId: null, answerText: '', fileId: null, points: null };
        if (g.quickType === 'picture' || g.quickType === 'meaning') {
          expect(g.input.options.filter((o) => o.isCorrect)).toHaveLength(1);
          const correct = s.options.find((o) => o.isCorrect)!;
          expect(itemPoints(s, { ...blank, selectedOptionId: correct.id })).toBe(s.points);
          // Không có hai đáp án giống nhau
          expect(new Set(g.input.options.map((o) => o.label)).size).toBe(g.input.options.length);
        }
        if (g.quickType === 'picture') {
          expect(g.input.options).toHaveLength(level.pictureOptions);
          expect(new Set(g.input.options.map((o) => o.label.split(' ')[0])).size).toBe(level.pictureOptions);
        }
        if (g.quickType === 'match') {
          expect(g.input.pairs!.length).toBeGreaterThanOrEqual(2);
          expect(g.input.pairs!.length).toBeLessThanOrEqual(8);
          const answer = JSON.stringify(g.input.pairs!.map((p) => ({ left: p.leftLabel, right: p.rightLabel })));
          expect(itemPoints(s, { ...blank, answerText: answer })).toBe(s.points);
        }
        if (g.quickType === 'order') {
          const n = g.input.referenceText!.split(/\s+/).length;
          expect(n).toBeGreaterThanOrEqual(level.orderWords[0]);
          expect(n).toBeLessThanOrEqual(level.orderWords[1]);
          expect(itemPoints(s, { ...blank, answerText: g.input.referenceText! })).toBe(s.points);
        }
        if (g.quickType === 'gap') {
          expect(g.input.prompt).toContain('_____');
          expect(itemPoints(s, { ...blank, answerText: g.input.referenceText!.toUpperCase() })).toBe(s.points);
        }
      });
      expect(itemsPayloadSchema.safeParse(items.map((g) => g.input)).success).toBe(true);
    });
  }

  it('đục đúng từ có trong danh sách, kể cả số nhiều', () => {
    expect(gapTarget('The monkey likes bananas.', parseWordList('banana'))).toBe(3);
    expect(gapTarget('I have a little dog.', WORDS)).toBe(4);
  });

  it('sắp xếp câu chỉ lấy câu dài hợp trình độ', () => {
    expect(sentencesForOrder(SENTENCES, LEVEL_PARAMS['Pre-A1']).every((s) => s.split(' ').length <= 5)).toBe(true);
    expect(typeAvailability('order', WORDS, ['One two three four five six seven eight nine ten eleven.'], LEVEL_PARAMS['Pre-A1'])).toMatch(/Không có câu/);
  });

  it('dạng thiếu điều kiện nêu lý do; danh sách ít từ vẫn có đủ đáp án nhiễu từ bộ từ', () => {
    expect(typeAvailability('gap', WORDS, [], LEVEL_PARAMS.A1)).toMatch(/dán câu/);
    expect(typeAvailability('match', parseWordList('cat\ndog'), [], LEVEL_PARAMS.A1)).toMatch(/4 từ/);
    const one = generateItems({ words: parseWordList('cat'), sentences: [], level: LEVEL_PARAMS.A1, counts: { picture: 1 }, rng: seeded(7) });
    expect(one[0].input.options).toHaveLength(4);
  });

  it('bốc lại đổi đáp án nhiễu, đổi dạng giữa chọn tranh và nghĩa', () => {
    const level = LEVEL_PARAMS.A1;
    const [pic] = generateItems({ words: WORDS, sentences: [], level, counts: { picture: 1 }, rng: seeded(1) });
    const again = rerollItem(pic, WORDS, level, seeded(99));
    expect(again.input.options.find((o) => o.isCorrect)!.label).toBe(pic.input.options.find((o) => o.isCorrect)!.label);
    const switched = switchItem(pic, WORDS, level, seeded(3))!;
    expect(switched.quickType).toBe('meaning');
    expect(itemFormSchema.safeParse(switched.input).success).toBe(true);
    expect(switchItem({ ...pic, word: { ...pic.word!, vi: '' } }, WORDS, level)).toBeNull();
  });

  it('số câu mặc định vừa với cỡ bài của trình độ', () => {
    const c = defaultCounts(WORDS, [], LEVEL_PARAMS['Pre-A1']);
    const total = (Object.keys(c) as QuickType[]).reduce((s, k) => s + c[k], 0);
    expect(total).toBeGreaterThanOrEqual(LEVEL_PARAMS['Pre-A1'].lessonSize[0]);
    expect(c.order + c.gap + c.read).toBe(0);
    expect(QUICK_TYPES).toHaveLength(8);
  });
});
