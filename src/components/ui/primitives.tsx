// Thành phần nhỏ dùng chung, không có state. Theo docs/DESIGN.md.
import type { ReactNode } from 'react';

export type Tone = 'mint' | 'lav' | 'butter' | 'blush' | 'stone';

const TONE_CLASS: Record<Tone, string> = {
  mint: 'bg-mint text-mint-ink',
  lav: 'bg-lav text-lav-ink',
  butter: 'bg-butter text-butter-ink',
  blush: 'bg-blush text-blush-ink',
  stone: 'bg-stone text-stone-ink',
};

// Nhãn trạng thái: viên bo tròn có chấm màu
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-tight ${TONE_CLASS[tone]}`}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

const AVATAR_TONE: Tone[] = ['mint', 'lav', 'butter', 'blush'];

// Avatar chữ cái đầu: lấy hai chữ cuối của tên, màu theo id để cố định từng người
export function Avatar({ name, seed, size = 'md' }: { name: string; seed: number; size?: 'md' | 'lg' }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  const tone = AVATAR_TONE[Math.abs(seed) % AVATAR_TONE.length];
  const dims = size === 'lg' ? 'size-[68px] text-2xl' : 'size-10 text-sm';
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-extrabold ${dims} ${TONE_CLASS[tone]}`} aria-hidden>
      {initials}
    </span>
  );
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-stone ${className}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
    </div>
  );
}

// Thông điệp tạm trong trang trống
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <b className="text-lg text-ink">{title}</b>
      {hint && <p className="text-base text-muted">{hint}</p>}
    </div>
  );
}
