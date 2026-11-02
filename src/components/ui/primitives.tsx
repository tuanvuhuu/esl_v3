'use client';

// Thành phần cơ bản dùng chung trên nền @primer/react v38 + @primer/octicons-react (theo mẫu ui.tsx của 01. TSUKUBA).
import { AlertIcon, CheckCircleIcon, InboxIcon } from '@primer/octicons-react';
import { Flash, Label, type LabelColorOptions } from '@primer/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

export type Tone = 'mint' | 'lav' | 'butter' | 'blush' | 'stone';

const PRIMER_LABEL_VARIANT: Record<Tone, LabelColorOptions> = {
  mint: 'success',
  lav: 'done',
  butter: 'attention',
  blush: 'danger',
  stone: 'secondary',
};

const AVATAR_TONE_CLASS: Record<Tone, string> = {
  mint: 'bg-mint text-mint-ink',
  lav: 'bg-lav text-lav-ink',
  butter: 'bg-butter text-butter-ink',
  blush: 'bg-blush text-blush-ink',
  stone: 'bg-stone text-stone-ink',
};

// Nhãn trạng thái dùng Label của @primer/react (giữ font-normal 400 theo chuẩn thiết kế).
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Label variant={PRIMER_LABEL_VARIANT[tone]} size="small" className="!font-normal">
      <span className="mr-1 inline-block size-1.5 shrink-0 rounded-full bg-current align-middle" aria-hidden />
      {children}
    </Label>
  );
}

const AVATAR_TONES: Tone[] = ['mint', 'lav', 'butter', 'blush'];

export function Avatar({
  name,
  seed,
  size = 'md',
  quiet = false,
}: {
  name: string;
  seed: number;
  size?: 'md' | 'lg';
  quiet?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  const tone = AVATAR_TONES[Math.abs(seed) % AVATAR_TONES.length];
  const dims = size === 'lg' ? 'size-[68px] text-2xl' : 'size-10 text-sm';
  const color = quiet ? 'bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]' : AVATAR_TONE_CLASS[tone];
  return (
    <span className={clsx('grid shrink-0 place-items-center rounded-full font-bold', dims, color)} aria-hidden>
      {initials}
    </span>
  );
}

// Màu thanh tiến độ theo mốc 25, 50, 75, 100%
function progressFill(percent: number): string {
  if (percent < 25) return 'bg-blush-ink';
  if (percent < 50) return 'bg-butter-ink';
  if (percent < 75) return 'bg-primary-deep';
  return 'bg-accent';
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-[var(--bgColor-neutral-muted)]', className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={clsx('h-full rounded-full transition-all', progressFill(percent))} style={{ width: `${percent}%` }} />
    </div>
  );
}

// Thông báo lỗi hoặc thành công dùng Flash của @primer/react.
export function Alert({
  children,
  tone = 'error',
  inline = false,
  className = '',
}: {
  children: ReactNode;
  tone?: 'error' | 'ok';
  inline?: boolean;
  className?: string;
}) {
  const role = tone === 'error' ? 'alert' : 'status';
  if (inline) {
    return (
      <p
        role={role}
        className={clsx(
          'inline-flex items-center gap-1.5 text-sm font-semibold',
          tone === 'error' ? 'text-[var(--fgColor-danger)]' : 'text-[var(--fgColor-success)]',
          className,
        )}
      >
        {tone === 'error' ? <AlertIcon size={14} aria-hidden /> : <CheckCircleIcon size={14} aria-hidden />}
        <span>{children}</span>
      </p>
    );
  }
  return (
    <Flash role={role} variant={tone === 'error' ? 'danger' : 'success'} className={clsx('!flex items-center gap-2 text-sm font-medium', className)}>
      {tone === 'error' ? <AlertIcon size={16} aria-hidden /> : <CheckCircleIcon size={16} aria-hidden />}
      <span>{children}</span>
    </Flash>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]" aria-hidden>
        <InboxIcon size={20} />
      </span>
      <b className="text-base font-semibold text-[var(--fgColor-default)]">{title}</b>
      {hint && <p className="max-w-md text-sm text-[var(--fgColor-muted)]">{hint}</p>}
    </div>
  );
}
