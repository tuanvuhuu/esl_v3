'use client';

// Thành phần cơ bản dùng trực tiếp Core & Experimental của @primer/react v38:
// - Pill → @primer/react Label
// - ProgressBar → @primer/react ProgressBar
// - Alert → @primer/react Banner
// - EmptyState → @primer/react/experimental Blankslate
import { AlertIcon, CheckCircleIcon, InboxIcon } from '@primer/octicons-react';
import { Banner, Label, ProgressBar as PrimerProgressBar, type LabelColorOptions } from '@primer/react';
import { Blankslate } from '@primer/react/experimental';
import clsx from 'clsx';
import type { ReactNode } from 'react';

export type Tone = 'mint' | 'lav' | 'butter' | 'blush' | 'stone';

const PRIMER_LABEL_VARIANT: Record<Tone, LabelColorOptions> = {
  mint: 'success',
  lav: 'accent',
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

// Nhãn trạng thái dùng Label của @primer/react.
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <Label variant={PRIMER_LABEL_VARIANT[tone]} size="small" className="!font-normal">
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
  const dims = size === 'lg' ? 'size-16 text-xl' : 'size-9 text-xs';
  const color = quiet ? 'bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]' : AVATAR_TONE_CLASS[tone];
  return (
    <span
      className={clsx('grid shrink-0 place-items-center rounded-full border border-black/10 font-bold', dims, color)}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function ProgressBar({ value, max, className = '' }: { value: number; max: number; className?: string }) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const bg =
    percent < 25
      ? 'danger.emphasis'
      : percent < 50
        ? 'attention.emphasis'
        : percent < 75
          ? 'accent.emphasis'
          : 'success.emphasis';
  return <PrimerProgressBar progress={percent} bg={bg} barSize="default" className={clsx('w-full', className)} aria-valuenow={percent} />;
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
