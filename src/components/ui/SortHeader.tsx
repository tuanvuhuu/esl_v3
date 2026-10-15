'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
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

  // Tự động kiểm tra trạng thái sắp xếp từ URL nếu không truyền prop điều khiển từ ngoài
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

    // Tự động cập nhật tham số trên URL nếu dùng chế độ mặc định (URL mode)
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

      // Quay về trang đầu tiên khi đổi thứ tự sắp xếp
      if (params.has('p')) params.set('p', '1');
      if (params.has('n')) params.set('n', '1');

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : (pathname || ''), { scroll: false });
    }
  }

  return (
    <button
      type="button"
      data-link="true"
      onClick={handleClick}
      title={nextActionLabel}
      className={`group/sort -mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors cursor-pointer select-none ${
        align === 'end' ? 'flex-row-reverse' : ''
      } ${
        isSorted
          ? 'font-medium text-ink bg-stone/40'
          : 'font-normal text-muted hover:bg-stone/50 hover:text-ink'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className="flex shrink-0 items-center">
        {isAsc && <ArrowUp className="size-3 text-ink" aria-hidden="true" />}
        {isDesc && <ArrowDown className="size-3 text-ink" aria-hidden="true" />}
        {!isSorted && (
          <ArrowUpDown
            className="size-3 text-muted/40 transition-opacity group-hover/sort:text-ink group-hover/sort:opacity-100"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}
