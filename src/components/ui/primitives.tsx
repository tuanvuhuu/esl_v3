'use client';

// Thành phần cơ bản dùng trực tiếp bộ `@/components-ui` (01. TSUKUBA) + `@primer/react` v38:
// - Pill → `@/components-ui` Tag (nhãn trạng thái semantic muted-bg + fg)
// - Avatar → `@/components-ui` UserAvatar (avatar gradient theo tên)
// - ProgressBar → `@/components-ui` ProgressBarView (màu xanh lá chuẩn .barFill của 01. TSUKUBA)
// - Alert / EmptyState → `@primer/react` Banner + Blankslate
import { AlertIcon, CheckCircleIcon, InboxIcon } from '@primer/octicons-react';
import { Banner, type LabelColorOptions } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import UiTag from '@/components-ui/tag';
import UserAvatar from '@/components-ui/user-avatar';

export type Tone = 'mint' | 'lav' | 'butter' | 'blush' | 'stone';

const TAG_VARIANT: Record<Tone, NonNullable<LabelColorOptions>> = {
  mint: 'success',
  lav: 'accent',
  butter: 'attention',
  blush: 'danger',
  stone: 'secondary',
};

const PILL_DOT: Record<Tone, string> = {
  mint: 'bg-[#16a34a]',
  lav: 'bg-[#2563eb]',
  butter: 'bg-[#d97706]',
  blush: 'bg-[#dc2626]',
  stone: 'bg-[#64748b]',
};

// Nhãn trạng thái dùng `Tag` của `@/components-ui` kèm chấm màu ngữ nghĩa sắc nét.
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const lavStyle =
    tone === 'lav'
      ? {
          backgroundColor: 'var(--lav)',
          color: 'var(--lav-ink)',
          borderColor: 'color-mix(in srgb, var(--lav-ink) 28%, var(--surface))',
        }
      : undefined;
  return (
    <UiTag variant={TAG_VARIANT[tone]} size="small" style={lavStyle} className="!inline-flex !items-center !gap-1.5 !font-medium">
      <span className={clsx('size-1.5 shrink-0 rounded-full', PILL_DOT[tone])} aria-hidden />
      <span>{children}</span>
    </UiTag>
  );
}

export const AVATAR_TONES = [
  'bg-[#eef2ff] text-[#4338ca] ring-[#c7d2fe] dark:bg-[#1e1b4b] dark:text-[#a5b4fc] dark:ring-[#3730a3]',
  'bg-[#ecfdf5] text-[#047857] ring-[#a7f3d0] dark:bg-[#064e3b] dark:text-[#6ee7b7] dark:ring-[#065f46]',
  'bg-[#fff1f2] text-[#be123c] ring-[#fecdd3] dark:bg-[#4c0519] dark:text-[#fda4af] dark:ring-[#881337]',
  'bg-[#f0f9ff] text-[#0369a1] ring-[#bae6fd] dark:bg-[#082f49] dark:text-[#7dd3fc] dark:ring-[#075985]',
  'bg-[#f5f3ff] text-[#6d28d9] ring-[#ddd6fe] dark:bg-[#2e1065] dark:text-[#c4b5fd] dark:ring-[#5b21b6]',
  'bg-[#fffbeb] text-[#b45309] ring-[#fde68a] dark:bg-[#451a03] dark:text-[#fcd34d] dark:ring-[#92400e]',
] as const;

export function personInitials(fullName: string): string {
  const parts = fullName
    .replace(/^(Cô|Thầy|GV|Ms\.?|Mr\.?)\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter((p) => Boolean(p) && Number.isNaN(Number(p)));
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function hashSeed(name: string, seed?: number): number {
  if (typeof seed === 'number' && Number.isFinite(seed) && seed !== 0) return Math.abs(seed);
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

// Vòng tròn chữ cái đầu tông ngọc sắc nét (aria-hidden để không ảnh hưởng tên liên kết/sắp xếp/xuất Excel).
export function InitialBadge({
  name,
  seed,
  size = 'sm',
  className = '',
}: {
  name: string;
  seed?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const toneCls = AVATAR_TONES[hashSeed(name, seed) % AVATAR_TONES.length];
  const dims =
    size === 'lg' ? 'size-11 text-sm' : size === 'md' ? 'size-8 text-[11px]' : 'size-6 text-[10px]';
  return (
    <span
      aria-hidden
      className={clsx(
        'grid shrink-0 place-items-center rounded-full font-semibold tracking-tight ring-1 ring-inset',
        dims,
        toneCls,
        className,
      )}
    >
      {personInitials(name)}
    </span>
  );
}

export function Avatar({
  name,
  seed,
  size = 'md',
  quiet = false,
}: {
  name: string;
  seed: number;
  size?: 'sm' | 'md' | 'lg';
  quiet?: boolean;
}) {
  if (quiet) {
    return <InitialBadge name={name} seed={seed} size={size} />;
  }
  return <UserAvatar fullName={name} size={size === 'lg' ? 'xlarge' : size === 'sm' ? 'medium' : 'large'} />;
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx(
        'h-1.5 overflow-hidden rounded-full bg-[#e6ebf2] ring-1 ring-inset ring-black/[0.04] dark:bg-[#21262d] dark:ring-white/[0.06]',
        className || 'w-full',
      )}
    >
      <div
        className={clsx(
          'h-full rounded-full bg-[var(--primary)] transition-[width] duration-300',
          value > 0 && percent < 8 && 'min-w-[5px]',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

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
    <Banner
      role={role}
      title={tone === 'error' ? 'Thông báo lỗi' : 'Thành công'}
      hideTitle
      variant={tone === 'error' ? 'critical' : 'success'}
      layout="compact"
      description={children}
      className={className}
    />
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Blankslate spacious>
      <Blankslate.Visual>
        <InboxIcon size={24} />
      </Blankslate.Visual>
      <Blankslate.Heading as="h3">{title}</Blankslate.Heading>
      {hint && <Blankslate.Description>{hint}</Blankslate.Description>}
    </Blankslate>
  );
}
