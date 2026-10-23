import { describe, expect, it } from 'vitest';
import { bingoBoard, bingoLine, gameStars, guessable, hangmanState, HANGMAN_LIVES, letters, maskWord, raceQuestions, simonGame, memoryDeck, playableGames, sameSequence, seeded, sentenceTiles, sentenceWords, shuffle, spellTiles, whackRounds, type GameWord } from '@/lib/games';

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
    expect(playableGames([w('cat'), w('dog')])).toEqual(['memory', 'whack', 'spell', 'hangman']);
    expect(playableGames([w('cat', 'I have a cat.'), w('dog')])).toContain('sentence');
    expect(gameStars(5, 5)).toBe(3);
    expect(gameStars(3, 5)).toBe(2);
    expect(gameStars(1, 5)).toBe(1);
  });

  it('trò mới tuỳ số từ: bingo từ 4 từ, Simon và đua xe từ 3 từ, đoán chữ cần từ từ 3 chữ cái', () => {
    expect(playableGames(WORDS.slice(0, 3))).toEqual(['memory', 'whack', 'spell', 'simon', 'race', 'hangman']);
    expect(playableGames(WORDS.slice(0, 4))).toContain('bingo');
    expect(playableGames([w('ox'), w('go'), w('up')])).not.toContain('hangman');
  });

  it('bingo: 9 từ thành bảng 3×3, ít hơn thì 2×2; gọi đủ mọi ô; nhận đủ hàng ngang, dọc, chéo', () => {
    const big = bingoBoard([...WORDS, w('ant')], seeded(4));
    expect(big.size).toBe(3);
    expect(big.cells).toHaveLength(9);
    expect([...big.calls].map((c) => c.word).sort()).toEqual(big.cells.map((c) => c.word).sort());
    expect(bingoBoard(WORDS.slice(0, 5), seeded(4)).cells).toHaveLength(4);
    const m = (on: number[]) => Array.from({ length: 9 }, (_, i) => on.includes(i));
    expect(bingoLine(m([3, 4, 5]), 3)).toBe(true);
    expect(bingoLine(m([1, 4, 7]), 3)).toBe(true);
    expect(bingoLine(m([2, 4, 6]), 3)).toBe(true);
    expect(bingoLine(m([0, 1, 5, 6]), 3)).toBe(false);
  });

  it('Simon: ba chuỗi dài 2, 3, 4 lấy trong các tranh, không lặp trong một chuỗi', () => {
    const g = simonGame(WORDS, seeded(6));
    expect(g.choices).toHaveLength(4);
    expect(g.sequences.map((s) => s.length)).toEqual([2, 3, 4]);
    for (const s of g.sequences) {
      expect(new Set(s.map((x) => x.word)).size).toBe(s.length);
      for (const x of s) expect(g.choices).toContain(x);
    }
    expect(simonGame(WORDS.slice(0, 3), seeded(6)).sequences.map((s) => s.length)).toEqual([2, 3, 3]);
  });

  it('đoán chữ: che chữ cái chưa đoán, giữ dấu gạch nối; sai đủ 6 lần thì thua', () => {
    expect(guessable('Ice-cream')).toEqual(['i', 'c', 'e', 'r', 'a', 'm']);
    expect(maskWord('Ice-cream', new Set(['c', 'e']))).toEqual(['_', 'c', 'e', '-', 'c', '_', 'e', '_', '_']);
    expect(hangmanState('cat', new Set(['c', 'a', 't', 'z']))).toEqual({ wrong: 1, solved: true, lost: false });
    expect(hangmanState('cat', new Set('bdefgh'))).toEqual({ wrong: HANGMAN_LIVES, solved: false, lost: true });
  });

  it('đua xe: 8 câu, mỗi câu 3 lựa chọn khác nhau có đáp án; danh sách ngắn thì lặp từ', () => {
    const qs = raceQuestions(WORDS.slice(0, 3), seeded(8));
    expect(qs).toHaveLength(8);
    for (const q of qs) {
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options.map((o) => o.word)).size).toBe(3);
      expect(q.options.map((o) => o.word)).toContain(q.target.word);
    }
  });
});
