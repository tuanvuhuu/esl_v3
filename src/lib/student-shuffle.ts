// Xáo câu hỏi và đáp án cho từng học sinh: mỗi em một thứ tự khác nhau, nhưng cùng em mở lại bài thì giữ nguyên thứ tự
// (hạt giống theo mã học sinh và mã bài). Dữ liệu bài trong DB không đổi, nên áp dụng cho mọi bài cũ và mới.
// Kèm bỏ đáp án khỏi dữ liệu gửi xuống trình duyệt: câu sắp xếp chỉ gửi các từ đã xáo, điền chỗ trống không gửi đáp án,
// ghép đôi gửi hai cột xáo riêng. Logic thuần, không đụng DB.
import { seeded, shuffle } from '@/lib/games';

// Băm FNV-1a 32 bit thành hạt giống
export function shuffleSeed(studentId: number, assignmentId: number, salt = ''): number {
  let h = 0x811c9dc5;
  for (const ch of `${studentId}:${assignmentId}:${salt}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

// Xáo và tránh trùng thứ tự ban đầu khi có từ hai phần tử khác nhau trở lên (không thì vẫn "dễ đoán")
export function shuffleApart<T>(items: readonly T[], rand: () => number, key: (t: T) => string = String): T[] {
  if (new Set(items.map(key)).size < 2) return [...items];
  const original = items.map(key).join('\u0001');
  for (let i = 0; i < 10; i++) {
    const out = shuffle(items, rand);
    if (out.map(key).join('\u0001') !== original) return out;
  }
  return [...items].reverse();
}

type Side = { label: string; imageFileId: number | null };
export type ArrangeInput<O> = {
  id: number;
  itemType: string;
  referenceText: string | null;
  options: O[];
  pairs: { leftLabel: string; leftImageFileId: number | null; rightLabel: string; rightImageFileId: number | null }[];
};
export type Arranged<T, O> = Omit<T, 'pairs' | 'referenceText' | 'options' | 'position'> & {
  position: number;
  referenceText: string | null;
  options: O[];
  orderWords: string[];
  matchLeft: Side[];
  matchRight: Side[];
};

const isSpeak = (t: string) => t.startsWith('speak_');

// Thứ tự câu và đáp án của một học sinh. position đánh lại 1..n theo thứ tự mới để "Câu 1, Câu 2" vẫn liền nhau.
export function arrangeForStudent<O extends { label: string }, T extends ArrangeInput<O>>(items: T[], studentId: number, assignmentId: number): Arranged<T, O>[] {
  const order = shuffle(items, seeded(shuffleSeed(studentId, assignmentId)));
  return order.map((it, idx) => {
    const rand = seeded(shuffleSeed(studentId, assignmentId, String(it.id)));
    const { pairs, referenceText, options, ...rest } = it;
    const words = it.itemType === 'order' ? (referenceText ?? '').trim().split(/\s+/).filter(Boolean) : [];
    const lefts = pairs.map((p) => ({ label: p.leftLabel, imageFileId: p.leftImageFileId }));
    const rights = pairs.map((p) => ({ label: p.rightLabel, imageFileId: p.rightImageFileId }));
    return {
      ...(rest as Omit<T, 'pairs' | 'referenceText' | 'options' | 'position'>),
      position: idx + 1,
      // Câu nói cần câu mẫu để đọc theo; các dạng khác câu mẫu là đáp án nên không gửi
      referenceText: isSpeak(it.itemType) ? referenceText : null,
      // Điền chỗ trống: các lựa chọn đúng là đáp án chấp nhận được, không gửi
      options: it.itemType === 'gap_fill' ? [] : it.itemType === 'choice' || it.itemType === 'picture_choice' ? shuffle(options, rand) : options,
      orderWords: shuffleApart(words, rand),
      matchLeft: shuffle(lefts, rand),
      matchRight: shuffleApart(rights, rand, (s) => s.label),
    };
  });
}
