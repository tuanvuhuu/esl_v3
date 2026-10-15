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
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-normal leading-tight ${TONE_CLASS[tone]}`}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

const AVATAR_TONE: Tone[] = ['mint', 'lav', 'butter', 'blush'];

// Avatar chữ cái đầu: lấy hai chữ cuối của tên, màu theo id để cố định từng người.
// quiet: nền trung tính, dùng trong bảng.
export function Avatar({ name, seed, size = 'md', quiet = false }: { name: string; seed: number; size?: 'md' | 'lg'; quiet?: boolean }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();
  const tone = AVATAR_TONE[Math.abs(seed) % AVATAR_TONE.length];
  const dims = size === 'lg' ? 'size-[68px] text-2xl' : 'size-10 text-sm';
  const color = quiet ? 'bg-stone text-ink-2' : TONE_CLASS[tone];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-extrabold ${dims} ${color}`} aria-hidden>
      {initials}
    </span>
  );
}

// Màu thanh theo mốc 25, 50, 75, 100%: đỏ nhạt, vàng đất, vàng, xanh
function progressFill(percent: number): string {
  if (percent < 25) return 'bg-blush-ink';
  if (percent < 50) return 'bg-butter-ink';
  if (percent < 75) return 'bg-primary-deep';
  return 'bg-accent';
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-stone ${className}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${progressFill(percent)}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

// Thông báo lỗi hoặc đã xong. Khối (mặc định) đặt đầu form; inline đặt ngay dưới ô hoặc trong dòng.
// Lỗi có role=alert, thành công có role=status. Mọi thông báo trong app dùng thành phần này.
export function Alert({ children, tone = 'error', inline = false, className = '' }: { children: ReactNode; tone?: 'error' | 'ok'; inline?: boolean; className?: string }) {
  const role = tone === 'error' ? 'alert' : 'status';
  if (inline) {
    return <p role={role} className={`text-sm font-semibold ${tone === 'error' ? 'text-blush-ink' : 'text-mint-ink'} ${className}`}>{children}</p>;
  }
  return (
    <div role={role} className={`rounded-xl px-3.5 py-2.5 text-base font-semibold ${tone === 'error' ? 'bg-blush text-blush-ink' : 'bg-mint text-mint-ink'} ${className}`}>
      {children}
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
