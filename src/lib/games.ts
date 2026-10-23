// Trò chơi từ vựng (35.15): logic thuần cho bốn trò lật thẻ nhớ, đập chuột (nghe rồi chạm tranh), ghép chữ, xây câu.
// Xáo trộn theo hạt giống để kết quả lặp lại được trong test. Không đụng DB, không gọi dịch vụ ngoài.

export type GameWord = { word: string; meaningVi: string; emoji: string; sentence: string; imageFileId: number | null; audioFileId: number | null };
export type GameKind = 'memory' | 'whack' | 'spell' | 'sentence';
export const GAME_LABELS: Record<GameKind, { name: string; hint: string; emoji: string }> = {
  memory: { name: 'Lật thẻ nhớ', hint: 'Lật hai thẻ, tìm tranh và chữ của cùng một từ', emoji: '🃏' },
  whack: { name: 'Đập chuột từ vựng', hint: 'Nghe từ rồi chạm đúng tranh', emoji: '🔨' },
  spell: { name: 'Ghép chữ', hint: 'Xếp các chữ cái thành từ đúng', emoji: '🔤' },
  sentence: { name: 'Xây câu', hint: 'Xếp các từ thành câu đúng', emoji: '🧱' },
};

// Bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32)
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Trò nào chơi được với danh sách này: xây câu cần từ có câu mẫu; ghép chữ cần từ có ít nhất 2 chữ cái
export function playableGames(words: GameWord[]): GameKind[] {
  const out: GameKind[] = [];
  if (words.length >= 2) out.push('memory', 'whack');
  if (words.some((w) => letters(w.word).length >= 2)) out.push('spell');
  if (words.some((w) => sentenceWords(w.sentence).length >= 3)) out.push('sentence');
  return out;
}

// ---------- Lật thẻ nhớ: mỗi từ hai thẻ (tranh và chữ), tối đa 6 cặp ----------
export type MemoryCard = { id: number; pair: number; face: 'picture' | 'word'; word: GameWord };
export function memoryDeck(words: GameWord[], rand: () => number, pairs = 6): MemoryCard[] {
  const picked = shuffle(words, rand).slice(0, pairs);
  const cards = picked.flatMap((w, i) => [
    { pair: i, face: 'picture' as const, word: w },
    { pair: i, face: 'word' as const, word: w },
  ]);
  return shuffle(cards, rand).map((c, id) => ({ ...c, id }));
}

// ---------- Đập chuột: mỗi lượt một từ đích và 4 ô (đích và 3 từ khác) ----------
export type WhackRound = { target: GameWord; choices: GameWord[] };
export function whackRounds(words: GameWord[], rand: () => number, rounds = 5): WhackRound[] {
  const order = shuffle(words, rand).slice(0, Math.min(rounds, words.length));
  return order.map((target) => {
    const others = shuffle(
      words.filter((w) => w.word !== target.word),
      rand,
    ).slice(0, 3);
    return { target, choices: shuffle([target, ...others], rand) };
  });
}

// ---------- Ghép chữ: chữ cái của từ, xáo trộn (khác thứ tự đúng nếu được) ----------
export function letters(word: string): string[] {
  return [...word.trim().toLowerCase()].filter((ch) => ch !== ' ');
}
export function spellTiles(word: string, rand: () => number): string[] {
  const target = letters(word);
  if (new Set(target).size < 2) return target;
  for (let i = 0; i < 10; i++) {
    const tiles = shuffle(target, rand);
    if (tiles.join('') !== target.join('')) return tiles;
  }
  return [...target].reverse();
}

// ---------- Xây câu: tách câu thành từ (giữ dấu câu đi kèm từ), xáo trộn ----------
export function sentenceWords(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}
export function sentenceTiles(sentence: string, rand: () => number): string[] {
  const target = sentenceWords(sentence);
  for (let i = 0; i < 10; i++) {
    const tiles = shuffle(target, rand);
    if (tiles.join(' ') !== target.join(' ')) return tiles;
  }
  return [...target].reverse();
}

// So đáp án học sinh xếp với đáp án đúng (không phân biệt hoa thường)
export function sameSequence(answer: string[], target: string[]): boolean {
  return answer.length === target.length && answer.every((a, i) => a.toLowerCase() === target[i].toLowerCase());
}

// Sao cuối trò theo tỉ lệ đúng: từ 90% ba sao, từ 60% hai sao, còn lại một sao
export function gameStars(correct: number, total: number): 1 | 2 | 3 {
  const ratio = total === 0 ? 0 : correct / total;
  return ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
}
