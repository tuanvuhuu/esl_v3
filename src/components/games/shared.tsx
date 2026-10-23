'use client';

// Phần dùng chung của các trò chơi từ vựng (35.15, 35.16): nút lớn, đọc từ, tranh của từ.
import type { GameWord } from '@/lib/games';

export const BIG_BASE = 'flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 px-4 text-lg font-extrabold transition-transform active:scale-95 disabled:opacity-50';
export const BIG = `${BIG_BASE} border-line bg-surface text-ink`;

export type GameProps = { words: GameWord[]; seed: number; onFinish: (correct: number, total: number) => void };

// Đọc từ: tệp âm thanh của từ, không có thì giọng đọc tiếng Anh có sẵn trên máy (không gửi đi đâu)
export function say(w: GameWord) {
  if (w.audioFileId) {
    void new Audio(`/api/files/${w.audioFileId}`).play().catch(() => undefined);
    return;
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(w.word);
  u.lang = 'en-US';
  u.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

// Tranh của từ: ảnh tải lên, không có thì emoji, không có nữa thì nghĩa tiếng Việt
export function Picture({ w, size = 'md' }: { w: GameWord; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 'size-24' : 'size-16';
  if (w.imageFileId) {
    // eslint-disable-next-line @next/next/no-img-element -- ảnh do giáo viên tải lên, phục vụ qua /api/files
    return <img src={`/api/files/${w.imageFileId}`} alt={w.meaningVi || w.word} className={`${box} rounded-xl object-cover`} />;
  }
  if (w.emoji) return <span className={size === 'lg' ? 'text-6xl' : 'text-4xl'} aria-label={w.meaningVi || 'tranh'}>{w.emoji}</span>;
  return <span className="text-center text-base font-bold text-ink-2">{w.meaningVi || '?'}</span>;
}
