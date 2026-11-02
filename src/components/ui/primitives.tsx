'use client';

// Thành phần cơ bản dùng trực tiếp bộ `@/components-ui` (01. TSUKUBA) + `@primer/react` v38:
// - Pill → `@/components-ui` Tag (nhãn trạng thái semantic muted-bg + fg)
// - Avatar → `@/components-ui` UserAvatar (avatar gradient theo tên)
// - ProgressBar → `@/components-ui` ProgressBarView
// - Alert / EmptyState → `@primer/react` Banner + Blankslate
import { AlertIcon, CheckCircleIcon, InboxIcon } from '@primer/octicons-react';
import { Banner, type LabelColorOptions } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import ProgressBarView from '@/components-ui/progress-bar-view';
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

// Nhãn trạng thái dùng `Tag` của `@/components-ui` (nền mờ + chữ màu ngữ nghĩa Primer).
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <UiTag variant={TAG_VARIANT[tone]} size="small" className="!font-normal">
      {children}
    </UiTag>
  );
}

export function Avatar({
  name,
  seed: _seed,
  size = 'md',
  quiet = false,
}: {
  name: string;
  seed: number;
  size?: 'md' | 'lg';
  quiet?: boolean;
}) {
  void _seed;
  if (quiet) {
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(-2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    const dims = size === 'lg' ? 'size-12 text-base' : 'size-8 text-xs';
    return (
      <span
        className={clsx(
          'grid shrink-0 place-items-center rounded-full border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] font-medium text-[var(--fgColor-muted)]',
          dims,
        )}
        aria-hidden
      >
        {initials}
      </span>
    );
  }
  return <UserAvatar fullName={name} size={size === 'lg' ? 'xlarge' : 'large'} />;
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const bg = percent >= 100 ? 'success.emphasis' : 'accent.emphasis';
  return <ProgressBarView progress={percent} bg={bg} barSize="default" className={clsx('w-full', className)} aria-valuenow={percent} />;
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
