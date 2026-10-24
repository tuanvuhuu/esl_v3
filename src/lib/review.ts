// Ôn lặp lại ngắt quãng cho hộp từ (35.18), dùng ts-fsrs (MIT, chạy trên máy chủ, không gọi dịch vụ ngoài).
// Mỗi ngày ôn một lần nên tắt bước học theo phút: nhớ đúng thì 2 ngày sau ôn lại rồi giãn dần, quên thì ôn lại ngày mai.
// Khoảng cách tối đa 90 ngày cho trẻ. Thẻ lưu dạng JSON (ngày là chuỗi ISO).
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs';
import { addDaysKey, todayKeyVN, vnDayBounds } from '@/lib/datetime';

export const DAILY_REVIEW_LIMIT = 10;

const MAX_DAYS = 90;
const scheduler = fsrs(generatorParameters({ enable_fuzz: false, learning_steps: [], relearning_steps: [], maximum_interval: MAX_DAYS }));

export type StoredCard = Omit<Card, 'due' | 'last_review'> & { due: string; last_review: string | null };

function toStored(card: Card): StoredCard {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review ? card.last_review.toISOString() : null };
}

function fromStored(s: StoredCard): Card {
  return { ...s, due: new Date(s.due), last_review: s.last_review ? new Date(s.last_review) : undefined };
}

// Thẻ mới cho từ vừa vào hộp: đến hạn ngay
export function newReviewCard(now: Date): { card: StoredCard; due: Date } {
  const card = createEmptyCard(now);
  return { card: toStored(card), due: card.due };
}

// Chấm một lần ôn: chọn đúng là "nhớ" (Good), chọn sai là "quên" (Again). Không có điểm trừ, chỉ đổi ngày ôn tới.
export function applyReview(stored: StoredCard, correct: boolean, now: Date): { card: StoredCard; due: Date } {
  const { card } = scheduler.next(fromStored(stored), now, correct ? Rating.Good : Rating.Again);
  // ts-fsrs có lúc trả 91 ngày dù đặt tối đa 90: tự kẹp lại cho đúng mốc
  if (card.scheduled_days > MAX_DAYS) {
    card.scheduled_days = MAX_DAYS;
    card.due = new Date(now.getTime() + MAX_DAYS * 86_400_000);
  }
  return { card: toStored(card), due: card.due };
}

// Hết ngày hôm nay theo giờ Việt Nam: từ có hạn trước mốc này là từ cần ôn hôm nay
export function endOfTodayVN(now: Date): Date {
  return vnDayBounds(todayKeyVN(now)).end;
}

// Từ cần ôn hôm nay: đến hạn trong hôm nay, hạn sớm trước, tối đa 10 từ
export function pickDueWords<T extends { due: Date }>(rows: T[], now: Date, limit = DAILY_REVIEW_LIMIT): T[] {
  const end = endOfTodayVN(now).getTime();
  return rows
    .filter((r) => r.due.getTime() < end)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, limit);
}

// "ngày mai", "3 ngày nữa" cho lần ôn tới
export function nextReviewLabel(due: Date, now: Date): string {
  const today = todayKeyVN(now);
  const key = todayKeyVN(due);
  if (key <= today) return 'hôm nay';
  if (key === addDaysKey(today, 1)) return 'ngày mai';
  let n = 1;
  while (addDaysKey(today, n) < key && n < 400) n += 1;
  return `${n} ngày nữa`;
}
