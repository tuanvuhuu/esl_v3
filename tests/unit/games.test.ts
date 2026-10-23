import { describe, expect, it } from 'vitest';
import { gameStars, letters, memoryDeck, playableGames, sameSequence, seeded, sentenceTiles, sentenceWords, shuffle, spellTiles, whackRounds, type GameWord } from '@/lib/games';

const w = (word: string, sentence = ''): GameWord => ({ word, meaningVi: '', emoji: '', sentence, imageFileId: null, audioFileId: null });
const WORDS = ['cat', 'dog', 'bird', 'fish', 'lion', 'duck', 'frog', 'bear'].map((x) => w(x));

describe('trò chơi từ vựng', () => {
  it('xáo trộn theo hạt giống: cùng hạt cùng kết quả, đủ phần tử', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7))).toEqual(shuffle([1, 2, 3, 4, 5], seeded(7)));
    expect([...shuffle([1, 2, 3, 4, 5], seeded(9))].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('lật thẻ: tối đa 6 cặp, mỗi cặp một thẻ tranh một thẻ chữ', () => {
    const deck = memoryDeck(WORDS, seeded(1));
    expect(deck).toHaveLength(12);
    for (let p = 0; p < 6; p++) {
      const pair = deck.filter((c) => c.pair === p);
      expect(pair.map((c) => c.face).sort()).toEqual(['picture', 'word']);
      expect(pair[0].word.word).toBe(pair[1].word.word);
    }
    expect(memoryDeck(WORDS.slice(0, 3), seeded(1))).toHaveLength(6);
  });

  it('đập chuột: mỗi lượt có từ đích trong 4 ô, không lặp ô', () => {
    const rounds = whackRounds(WORDS, seeded(3), 5);
    expect(rounds).toHaveLength(5);
    for (const r of rounds) {
      expect(r.choices).toHaveLength(4);
      expect(r.choices.map((c) => c.word)).toContain(r.target.word);
      expect(new Set(r.choices.map((c) => c.word)).size).toBe(4);
    }
  });

  it('ghép chữ: đủ chữ cái và khác thứ tự đúng', () => {
    const tiles = spellTiles('Rabbit', seeded(5));
    expect([...tiles].sort()).toEqual([...letters('rabbit')].sort());
    expect(tiles.join('')).not.toBe('rabbit');
  });

  it('xây câu: đủ từ, khác thứ tự đúng; so đáp án không phân biệt hoa thường', () => {
    const tiles = sentenceTiles('The cat is on the mat.', seeded(2));
    expect([...tiles].sort()).toEqual([...sentenceWords('The cat is on the mat.')].sort());
    expect(tiles.join(' ')).not.toBe('The cat is on the mat.');
    expect(sameSequence(['the', 'CAT'], ['The', 'cat'])).toBe(true);
    expect(sameSequence(['cat', 'the'], ['The', 'cat'])).toBe(false);
  });

  it('trò chơi được tuỳ danh sách; sao theo tỉ lệ đúng', () => {
    expect(playableGames([w('a')])).toEqual([]);
    expect(playableGames([w('cat'), w('dog')])).toEqual(['memory', 'whack', 'spell']);
    expect(playableGames([w('cat', 'I have a cat.'), w('dog')])).toContain('sentence');
    expect(gameStars(5, 5)).toBe(3);
    expect(gameStars(3, 5)).toBe(2);
    expect(gameStars(1, 5)).toBe(1);
  });
});
