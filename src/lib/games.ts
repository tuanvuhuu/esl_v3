// Trò chơi từ vựng: logic thuần cho lật thẻ nhớ, đập chuột (nghe rồi chạm tranh), ghép chữ, xây câu (35.15)
// và bingo nghe, Simon nói, đoán chữ, đua xe trả lời nhanh (35.16).
// Xáo trộn theo hạt giống để kết quả lặp lại được trong test. Không đụng DB, không gọi dịch vụ ngoài.

export type GameWord = { word: string; meaningVi: string; emoji: string; sentence: string; imageFileId: number | null; audioFileId: number | null };
export type GameKind = 'memory' | 'whack' | 'spell' | 'sentence' | 'bingo' | 'simon' | 'hangman' | 'race';
export const GAME_LABELS: Record<GameKind, { name: string; hint: string; emoji: string }> = {
  memory: { name: 'Lật thẻ nhớ', hint: 'Lật hai thẻ, tìm tranh và chữ của cùng một từ', emoji: '🃏' },
  whack: { name: 'Đập chuột từ vựng', hint: 'Nghe từ rồi chạm đúng tranh', emoji: '🔨' },
  spell: { name: 'Ghép chữ', hint: 'Xếp các chữ cái thành từ đúng', emoji: '🔤' },
  sentence: { name: 'Xây câu', hint: 'Xếp các từ thành câu đúng', emoji: '🧱' },
  bingo: { name: 'Bingo nghe', hint: 'Nghe từ rồi đánh dấu trên bảng, đủ một hàng là thắng', emoji: '🎯' },
  simon: { name: 'Simon nói', hint: 'Nghe một chuỗi từ, chạm tranh đúng thứ tự', emoji: '🗣️' },
  hangman: { name: 'Đoán chữ', hint: 'Đoán từng chữ cái trước khi hết bóng bay', emoji: '🎈' },
  race: { name: 'Đua xe', hint: 'Nhìn tranh chọn đúng từ thật nhanh để xe về đích', emoji: '🏎️' },
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
  if (words.length >= 4) out.push('bingo');
  if (words.length >= 3) out.push('simon', 'race');
  if (words.some((w) => guessable(w.word).length >= 3)) out.push('hangman');
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

// ---------- Bingo nghe: bảng 3×3 (đủ 9 từ) hoặc 2×2; gọi lần lượt các ô theo thứ tự ngẫu nhiên ----------
export type BingoBoard = { size: number; cells: GameWord[]; calls: GameWord[] };
export function bingoBoard(words: GameWord[], rand: () => number): BingoBoard {
  const size = words.length >= 9 ? 3 : 2;
  const cells = shuffle(words, rand).slice(0, size * size);
  return { size, cells, calls: shuffle(cells, rand) };
}
// Đủ một hàng ngang, dọc hoặc chéo đã đánh dấu
export function bingoLine(marked: boolean[], size: number): boolean {
  const idx = (r: number, c: number) => r * size + c;
  const all = (f: (k: number) => number) => Array.from({ length: size }, (_, k) => marked[f(k)]).every(Boolean);
  for (let r = 0; r < size; r++) if (all((c) => idx(r, c))) return true;
  for (let c = 0; c < size; c++) if (all((r) => idx(r, c))) return true;
  return all((k) => idx(k, k)) || all((k) => idx(k, size - 1 - k));
}

// ---------- Simon nói: 4 tranh (hoặc 3), ba lượt chuỗi dài dần 2, 3, 4 từ, không lặp từ trong một chuỗi ----------
export type SimonGame = { choices: GameWord[]; sequences: GameWord[][] };
export function simonGame(words: GameWord[], rand: () => number): SimonGame {
  const choices = shuffle(words, rand).slice(0, 4);
  const sequences = [2, 3, 4].map((n) => shuffle(choices, rand).slice(0, Math.min(n, choices.length)));
  return { choices, sequences };
}

// ---------- Đoán chữ: 6 bóng bay, mỗi lần đoán sai nổ một bóng; ký tự không phải chữ cái hiện sẵn ----------
export const HANGMAN_LIVES = 6;
export function guessable(word: string): string[] {
  return [...new Set([...word.toLowerCase()].filter((ch) => /[a-z]/.test(ch)))];
}
export function maskWord(word: string, guessed: Set<string>): string[] {
  return [...word].map((ch) => (/[a-z]/i.test(ch) && !guessed.has(ch.toLowerCase()) ? '_' : ch));
}
export function hangmanState(word: string, guessed: Set<string>): { wrong: number; solved: boolean; lost: boolean } {
  const need = guessable(word);
  const wrong = [...guessed].filter((g) => !need.includes(g)).length;
  const solved = need.every((ch) => guessed.has(ch));
  return { wrong, solved, lost: !solved && wrong >= HANGMAN_LIVES };
}

// ---------- Đua xe: 8 câu, mỗi câu một tranh và 3 từ để chọn; danh sách ngắn thì từ lặp lại ----------
export const RACE_SECONDS = 8;
export type RaceQuestion = { target: GameWord; options: GameWord[] };
export function raceQuestions(words: GameWord[], rand: () => number, count = 8): RaceQuestion[] {
  const order: GameWord[] = [];
  while (order.length < count) order.push(...shuffle(words, rand));
  return order.slice(0, count).map((target) => ({
    target,
    options: shuffle([target, ...shuffle(words.filter((w) => w.word !== target.word), rand).slice(0, 2)], rand),
  }));
}
