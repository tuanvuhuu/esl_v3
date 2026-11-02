'use client';

import { ArrowDownIcon, ArrowSwitchIcon, ArrowUpIcon } from '@primer/octicons-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type SortHeaderProps = {
  columnKey: string;
  label: string;
  align?: 'start' | 'end';
  isSorted?: boolean;
  direction?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
};

export function SortHeader({
  columnKey,
  label,
  align,
  isSorted: controlledIsSorted,
  direction: controlledDirection,
  onSort,
}: SortHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isUrlMode = onSort === undefined && controlledIsSorted === undefined;
  const urlSort = isUrlMode ? searchParams?.get('sort') : null;
  const urlOrder = isUrlMode ? searchParams?.get('order') : null;

  const isSorted = isUrlMode ? urlSort === columnKey : Boolean(controlledIsSorted);
  const direction = isUrlMode ? (urlOrder === 'desc' ? 'desc' : 'asc') : controlledDirection;

  const isAsc = isSorted && direction === 'asc';
  const isDesc = isSorted && direction === 'desc';

  const nextActionLabel = !isSorted
    ? `Sắp xếp tăng dần theo ${label}`
    : isAsc
      ? `Sắp xếp giảm dần theo ${label}`
      : `Bỏ sắp xếp theo ${label}`;

  function handleClick() {
    if (onSort) {
      onSort(columnKey);
      return;
    }

    if (searchParams && router) {
      const params = new URLSearchParams(searchParams.toString());
      const currentSort = params.get('sort');
      const currentOrder = params.get('order') ?? 'asc';

      if (currentSort === columnKey) {
        if (currentOrder === 'asc') {
          params.set('order', 'desc');
        } else {
          params.delete('sort');
          params.delete('order');
        }
      } else {
        params.set('sort', columnKey);
        params.set('order', 'asc');
      }

      if (params.has('p')) params.set('p', '1');
      if (params.has('n')) params.set('n', '1');

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname || '', { scroll: false });
    }
  }

  return (
    <button
      type="button"
      data-link="true"
      onClick={handleClick}
      title={nextActionLabel}
      className={`group/sort -mx-1 inline-flex max-w-full cursor-pointer select-none items-center gap-1 rounded px-1 py-0.5 text-xs font-normal transition-colors ${
        align === 'end' ? 'flex-row-reverse' : ''
      } ${
        isSorted
          ? 'bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-default)]'
          : 'text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-default)] hover:text-[var(--fgColor-default)]'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className="flex shrink-0 items-center">
        {isAsc && <ArrowUpIcon size={12} className="text-[var(--fgColor-accent)]" aria-hidden />}
        {isDesc && <ArrowDownIcon size={12} className="text-[var(--fgColor-accent)]" aria-hidden />}
        {!isSorted && (
          <ArrowSwitchIcon
            size={12}
            className="rotate-90 text-[var(--fgColor-muted)]/50 transition-opacity group-hover/sort:text-[var(--fgColor-default)] group-hover/sort:opacity-100"
            aria-hidden
          />
        )}
      </span>
    </button>
  );
}
