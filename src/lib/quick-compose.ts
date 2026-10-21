// Soạn nhanh (P36.2): sinh câu hỏi từ danh sách từ và câu tiếng Anh theo trình độ của lớp.
// Hàm thuần, không đụng CSDL: dùng được ở giao diện và unit test. Đầu ra là ItemInput, đi qua đúng kiểm tra lưu câu như câu tự soạn.
import type { ItemInput } from '@/app/(app)/bai-tap/question-actions';
import type { ItemType, Skill } from './assignment-scoring';
import type { LevelParams } from './level-params';
import { findStarterWord, starterWordsUpTo, type StarterWord } from './vocab-starter';

export type QuickWord = {
  en: string;
  vi: string;
  emoji: string;
  viFromBank: boolean; // nghĩa lấy từ bộ từ có sẵn, giáo viên không gõ
  emojiFromBank: boolean;
  topic: string | null;
};

export type QuickType = 'picture' | 'match' | 'meaning' | 'repeat' | 'order' | 'gap' | 'read' | 'write';

export const QUICK_TYPES: { id: QuickType; itemType: ItemType; icon: string; label: string; perWord: boolean }[] = [
  { id: 'picture', itemType: 'picture_choice', icon: '🖼️', label: 'Nghe chọn tranh', perWord: true },
  { id: 'match', itemType: 'match', icon: '🔗', label: 'Ghép đôi', perWord: false },
  { id: 'meaning', itemType: 'choice', icon: '☑️', label: 'Trắc nghiệm nghĩa', perWord: true },
  { id: 'repeat', itemType: 'speak_repeat', icon: '🔁', label: 'Nghe nhắc lại', perWord: true },
  { id: 'order', itemType: 'order', icon: '🧩', label: 'Sắp xếp câu', perWord: false },
  { id: 'gap', itemType: 'gap_fill', icon: '✏️', label: 'Điền chỗ trống', perWord: false },
  { id: 'read', itemType: 'speak_read', icon: '📖', label: 'Đọc to', perWord: false },
  { id: 'write', itemType: 'text', icon: '📝', label: 'Viết câu với từ', perWord: true },
];

export type GeneratedItem = {
  key: string;
  quickType: QuickType;
  word: QuickWord | null; // từ gốc của câu (để bốc lại đáp án nhiễu hoặc đổi dạng)
  sentence: string | null; // câu gốc với dạng theo câu
  input: ItemInput;
};

type Rng = () => number;

// ---------- Tách đầu vào ----------

const EMOJI = /\p{Extended_Pictographic}/u;
const isEmojiPart = (s: string) => EMOJI.test(s) || /^[\d#*]️?⃣$/u.test(s) || /^\u{1F51F}$/u.test(s);

// Mỗi dòng một từ: "từ - nghĩa - emoji". Ngăn bằng tab, " - ", "|" hoặc dấu phẩy. Thứ tự nghĩa và emoji tuỳ ý.
// Thiếu nghĩa hoặc emoji thì lấy từ bộ từ có sẵn. Từ lặp lại chỉ giữ lần đầu.
export function parseWordList(raw: string): QuickWord[] {
  const seen = new Set<string>();
  const out: QuickWord[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const parts = line
      .split(/\t| +- +| *\| *|,/)
      .map((p) => p.trim())
      .filter(Boolean);
    const texts = parts.filter((p) => !isEmojiPart(p));
    const en = (texts[0] ?? '').replace(/\s+/g, ' ');
    if (!en || en.length > 60 || seen.has(en.toLowerCase())) continue;
    seen.add(en.toLowerCase());
    const bank = findStarterWord(en);
    const vi = texts.slice(1).join(', ').slice(0, 120);
    const emoji = parts.find(isEmojiPart) ?? '';
    out.push({
      en,
      vi: vi || bank?.vi || '',
      emoji: emoji || bank?.emoji || '',
      viFromBank: !vi && !!bank?.vi,
      emojiFromBank: !emoji && !!bank?.emoji,
      topic: bank?.topic ?? null,
    });
  }
  return out;
}

export function fromStarter(w: StarterWord): QuickWord {
  return { en: w.en, vi: w.vi, emoji: w.emoji, viFromBank: true, emojiFromBank: true, topic: w.topic };
}

// Tách đoạn văn thành câu; bỏ câu dưới 3 từ và câu quá dài cho trẻ (trên 16 từ)
export function splitSentences(raw: string): string[] {
  return raw
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const n = wordCount(s);
      return n >= 3 && n <= 16;
    });
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;
const stripEnd = (s: string) => s.replace(/[.!?]+$/, '').trim();
const bare = (s: string) => s.toLowerCase().replace(/[^a-z'-]/g, '');

// ---------- Điều kiện của từng dạng ----------

export function sentencesForOrder(sentences: string[], level: LevelParams): string[] {
  const [min, max] = level.orderWords;
  return sentences.filter((s) => {
    const n = wordCount(stripEnd(s));
    return n >= min && n <= max;
  });
}

// true khi sinh được; ngược lại là lý do để hiện cho giáo viên
export function typeAvailability(type: QuickType, words: QuickWord[], sentences: string[], level: LevelParams): true | string {
  switch (type) {
    case 'picture':
      return words.some((w) => w.emoji) ? true : 'Cần ít nhất 1 từ có emoji';
    case 'meaning':
      return words.some((w) => w.vi) ? true : 'Cần ít nhất 1 từ có nghĩa tiếng Việt';
    case 'match':
      return words.filter((w) => w.vi).length >= level.pairs[0] ? true : `Cần ít nhất ${level.pairs[0]} từ có nghĩa`;
    case 'repeat':
    case 'write':
      return words.length > 0 ? true : 'Cần ít nhất 1 từ';
    case 'order':
      if (sentences.length === 0) return 'Cần dán câu ở bước 1 (thẻ "Dán câu")';
      return sentencesForOrder(sentences, level).length > 0 ? true : `Không có câu dài ${level.orderWords[0]}–${level.orderWords[1]} từ hợp trình độ`;
    case 'gap':
    case 'read':
      return sentences.length > 0 ? true : 'Cần dán câu ở bước 1 (thẻ "Dán câu")';
  }
}

// Số câu tối đa sinh được của từng dạng
export function maxCount(type: QuickType, words: QuickWord[], sentences: string[], level: LevelParams): number {
  switch (type) {
    case 'picture':
      return words.filter((w) => w.emoji).length;
    case 'meaning':
      return words.filter((w) => w.vi).length;
    case 'match':
      return Math.max(1, Math.floor(words.filter((w) => w.vi).length / level.pairs[0]));
    case 'repeat':
    case 'write':
      return words.length;
    case 'order':
      return sentencesForOrder(sentences, level).length;
    case 'gap':
    case 'read':
      return sentences.length;
  }
}

// ---------- Sinh câu ----------

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let keySeq = 0;
const nextKey = () => `q${++keySeq}`;

function base(itemType: ItemType, skill: Skill, prompt: string, promptVi: string, points: number): ItemInput {
  return {
    id: null,
    skill,
    itemType,
    prompt,
    promptVi,
    passage: '',
    points,
    audioFileId: null,
    imageFileId: null,
    modelAudioFileId: null,
    referenceText: '',
    maxSeconds: 10,
    sourceLicense: '',
    bankQuestionId: null,
    options: [],
    pairs: [],
    criteria: [],
  };
}

// Đáp án nhiễu: ưu tiên từ giáo viên đưa vào, thiếu thì lấy bộ từ có sẵn cùng chủ đề rồi cùng trình độ.
// Không trùng đáp án đúng theo khoá (emoji hoặc nghĩa) để trẻ không gặp hai tranh giống nhau.
function distractors(word: QuickWord, words: QuickWord[], level: LevelParams, n: number, keyOf: (w: QuickWord) => string, rng: Rng): QuickWord[] {
  const used = new Set([keyOf(word), word.en.toLowerCase()]);
  const pick: QuickWord[] = [];
  const take = (pool: QuickWord[]) => {
    for (const w of shuffle(pool, rng)) {
      if (pick.length >= n) return;
      const k = keyOf(w);
      if (!k || used.has(k) || used.has(w.en.toLowerCase())) continue;
      used.add(k);
      used.add(w.en.toLowerCase());
      pick.push(w);
    }
  };
  take(words);
  const starter = starterWordsUpTo(level.code).map(fromStarter);
  if (pick.length < n && word.topic) take(starter.filter((w) => w.topic === word.topic));
  if (pick.length < n) take(starter);
  return pick;
}

function pictureItem(word: QuickWord, words: QuickWord[], level: LevelParams, rng: Rng): ItemInput {
  const others = distractors(word, words, level, level.pictureOptions - 1, (w) => w.emoji, rng);
  const item = base('picture_choice', 'listening', `Listen and touch: ${word.en}`, 'Nghe và chạm vào tranh đúng', 1);
  item.options = shuffle([word, ...others], rng).map((w) => ({ id: null, label: `${w.emoji} ${w.en}`, isCorrect: w === word, imageFileId: null, audioFileId: null }));
  return item;
}

function meaningItem(word: QuickWord, words: QuickWord[], level: LevelParams, rng: Rng): ItemInput {
  const others = distractors(word, words, level, level.meaningOptions - 1, (w) => w.vi.toLowerCase(), rng);
  const item = base('choice', 'reading', `What does “${word.en}” mean?`, 'Chọn nghĩa đúng', 1);
  item.options = shuffle([word, ...others], rng).map((w) => ({ id: null, label: w.vi, isCorrect: w === word, imageFileId: null, audioFileId: null }));
  return item;
}

function matchItems(words: QuickWord[], level: LevelParams, count: number, rng: Rng): ItemInput[] {
  const withVi = shuffle(words.filter((w) => w.vi), rng);
  const [min, max] = level.pairs;
  const groups: QuickWord[][] = [];
  for (let i = 0; i < withVi.length && groups.length < count; i += max) groups.push(withVi.slice(i, i + max));
  // Nhóm cuối quá ít cặp thì gộp vào nhóm trước (tối đa 8 cặp một câu) hoặc bỏ
  const last = groups[groups.length - 1];
  if (last && last.length < min && groups.length > 1) {
    groups.pop();
    if (groups[groups.length - 1].length + last.length <= 8) groups[groups.length - 1].push(...last);
  } else if (last && last.length < Math.min(min, 2)) groups.pop();
  return groups.map((g) => {
    const item = base('match', 'reading', 'Match the words.', 'Ghép từ tiếng Anh với nghĩa tiếng Việt', 2);
    item.pairs = g.map((w, i) => ({ id: null, position: i + 1, leftLabel: `${w.emoji} ${w.en}`.trim(), leftImageFileId: null, rightLabel: w.vi, rightImageFileId: null }));
    return item;
  });
}

function repeatItem(word: QuickWord, level: LevelParams): ItemInput {
  const item = base('speak_repeat', 'speaking', 'Listen and say.', 'Nghe rồi nói lại', 1);
  item.referenceText = word.en;
  item.maxSeconds = level.speakSeconds;
  return item;
}

function writeItem(word: QuickWord): ItemInput {
  return base('text', 'writing', `Write a sentence with the word “${word.en}”.`, `Viết một câu tiếng Anh có từ “${word.en}”${word.vi ? ` (${word.vi})` : ''}`, 1);
}

function orderItem(sentence: string): ItemInput {
  const item = base('order', 'writing', 'Put the words in order.', 'Sắp xếp các từ thành câu đúng', 1);
  item.referenceText = stripEnd(sentence);
  return item;
}

const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'am', 'and', 'or', 'to', 'of', 'in', 'on', 'at', 'it', 'he', 'she', 'i', 'you', 'we', 'they', 'my', 'your', 'his', 'her', 'this', 'that', 'can', 'do', 'does', 'have', 'has']);

// Từ được đục: ưu tiên từ có trong danh sách (kể cả số nhiều -s, -es), không có thì từ nội dung dài nhất
export function gapTarget(sentence: string, words: QuickWord[]): number {
  const tokens = sentence.split(/\s+/);
  const listed = new Set(words.map((w) => w.en.toLowerCase()));
  const inList = tokens.findIndex((t) => {
    const b = bare(t);
    return listed.has(b) || listed.has(b.replace(/e?s$/, ''));
  });
  if (inList >= 0) return inList;
  let best = -1;
  tokens.forEach((t, i) => {
    const b = bare(t);
    if (b.length >= 3 && !STOP.has(b) && (best < 0 || b.length > bare(tokens[best]).length)) best = i;
  });
  return best >= 0 ? best : Math.min(1, tokens.length - 1);
}

function gapItem(sentence: string, words: QuickWord[]): ItemInput {
  const tokens = sentence.split(/\s+/);
  const i = gapTarget(sentence, words);
  const answer = bare(tokens[i]);
  // Giữ dấu câu dính sau từ bị đục (ví dụ "dog." thành "_____.")
  const tail = tokens[i].replace(/^.*?([.,!?;:]*)$/, '$1');
  const prompt = tokens.map((t, k) => (k === i ? `_____${tail}` : t)).join(' ');
  const item = base('gap_fill', 'writing', prompt, 'Điền từ còn thiếu vào chỗ trống', 1);
  item.referenceText = answer;
  return item;
}

function readItem(sentence: string, level: LevelParams): ItemInput {
  const item = base('speak_read', 'speaking', 'Read aloud.', 'Đọc to câu sau', 1);
  item.referenceText = sentence;
  item.maxSeconds = Math.min(60, Math.max(level.speakSeconds, Math.ceil(wordCount(sentence) * 1.5)));
  return item;
}

export type GenerateInput = {
  words: QuickWord[];
  sentences: string[];
  level: LevelParams;
  counts: Partial<Record<QuickType, number>>; // dạng nào không có hoặc 0 thì không sinh
  rng?: Rng;
};

// Sinh câu theo thứ tự dạng trong QUICK_TYPES. Dạng không đủ điều kiện thì bỏ qua.
export function generateItems({ words, sentences, level, counts, rng = Math.random }: GenerateInput): GeneratedItem[] {
  const out: GeneratedItem[] = [];
  const push = (quickType: QuickType, input: ItemInput, word: QuickWord | null, sentence: string | null) => out.push({ key: nextKey(), quickType, word, sentence, input });
  for (const t of QUICK_TYPES) {
    const want = Math.min(counts[t.id] ?? 0, maxCount(t.id, words, sentences, level));
    if (want <= 0 || typeAvailability(t.id, words, sentences, level) !== true) continue;
    switch (t.id) {
      case 'picture':
        words.filter((w) => w.emoji).slice(0, want).forEach((w) => push('picture', pictureItem(w, words, level, rng), w, null));
        break;
      case 'meaning':
        words.filter((w) => w.vi).slice(0, want).forEach((w) => push('meaning', meaningItem(w, words, level, rng), w, null));
        break;
      case 'match':
        matchItems(words, level, want, rng).forEach((it) => push('match', it, null, null));
        break;
      case 'repeat':
        words.slice(0, want).forEach((w) => push('repeat', repeatItem(w, level), w, null));
        break;
      case 'write':
        words.slice(0, want).forEach((w) => push('write', writeItem(w), w, null));
        break;
      case 'order':
        sentencesForOrder(sentences, level).slice(0, want).forEach((s) => push('order', orderItem(s), null, s));
        break;
      case 'gap':
        sentences.slice(0, want).forEach((s) => push('gap', gapItem(s, words), null, s));
        break;
      case 'read':
        sentences.slice(0, want).forEach((s) => push('read', readItem(s, level), null, s));
        break;
    }
  }
  return out;
}

// Bốc lại đáp án nhiễu của câu chọn tranh hoặc trắc nghiệm nghĩa
export function rerollItem(item: GeneratedItem, words: QuickWord[], level: LevelParams, rng: Rng = Math.random): GeneratedItem {
  if (!item.word) return item;
  if (item.quickType === 'picture') return { ...item, input: pictureItem(item.word, words, level, rng) };
  if (item.quickType === 'meaning') return { ...item, input: meaningItem(item.word, words, level, rng) };
  return item;
}

// Đổi qua lại giữa chọn tranh và trắc nghiệm nghĩa; null khi từ không đủ dữ liệu cho dạng kia
export function switchItem(item: GeneratedItem, words: QuickWord[], level: LevelParams, rng: Rng = Math.random): GeneratedItem | null {
  const w = item.word;
  if (!w) return null;
  if (item.quickType === 'picture' && w.vi) return { ...item, quickType: 'meaning', input: meaningItem(w, words, level, rng) };
  if (item.quickType === 'meaning' && w.emoji) return { ...item, quickType: 'picture', input: pictureItem(w, words, level, rng) };
  return null;
}

export const canReroll = (item: GeneratedItem) => item.quickType === 'picture' || item.quickType === 'meaning';
export const canSwitch = (item: GeneratedItem) => (item.quickType === 'picture' && !!item.word?.vi) || (item.quickType === 'meaning' && !!item.word?.emoji);

// Số câu gợi ý mặc định khi mở bước chọn dạng: các dạng theo từ bật sẵn, vừa với cỡ bài của trình độ
export function defaultCounts(words: QuickWord[], sentences: string[], level: LevelParams): Record<QuickType, number> {
  const n = Math.min(words.length, Math.max(3, Math.round(level.lessonSize[0] / 2)));
  return {
    picture: Math.min(n, maxCount('picture', words, sentences, level)),
    match: words.filter((w) => w.vi).length >= level.pairs[0] ? 1 : 0,
    meaning: Math.min(Math.max(0, n - 1), maxCount('meaning', words, sentences, level)),
    repeat: Math.min(3, words.length),
    order: Math.min(2, sentencesForOrder(sentences, level).length),
    gap: Math.min(2, sentences.length),
    read: Math.min(2, sentences.length),
    write: 0,
  };
}
