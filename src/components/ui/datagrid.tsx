'use client';

// Bảng dữ liệu dùng chung (docs/DESIGN.md mục 8, quyết định D17).
// Từ mốc `from` hiện bảng: 'md' (768px) cho bảng ít cột, 'xl' (1200px) cho bảng nhiều cột. Dưới mốc đó hiện thẻ.
// Tiêu đề cột không đậm, dính khi cuộn. Dòng cao 44px (py-2.5), rê chuột có nền row-hover.
// Mặc định hỗ trợ sắp xếp theo cột khi người dùng bấm vào tiêu đề cột.
//
// Lưu ý: mọi lớp theo breakpoint viết nguyên văn trong bảng dưới đây, không ghép chuỗi lúc chạy.
// Tailwind chỉ tạo CSS cho lớp nó thấy trong mã nguồn; ghép `${bp}:block` sẽ làm mất lớp.
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { sortRows } from '@/lib/sort';
import { SortHeader } from './SortHeader';

export type GridSort = { column: string; direction: 'asc' | 'desc' };

export type GridColumn<T = unknown> = {
  key: string;
  label: string;
  width: string;
  align?: 'start' | 'end';
  srOnly?: boolean;
  sortable?: boolean;
  sortValue?: (row: T) => unknown;
};

type Props<T> = {
  label: string; // tên bảng cho trình đọc màn hình
  columns: GridColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  cell: (row: T, key: string) => ReactNode;
  card?: (row: T) => ReactNode; // thẻ hiện dưới mốc của bảng. Bỏ trống thì dưới mốc không hiện gì (màn có giao diện riêng cho điện thoại)
  cardsFrom?: 'all' | 'md'; // 'all': thẻ hiện từ 0 đến mốc bảng. 'md': chỉ từ 768px (điện thoại tự có danh sách riêng)
  from?: 'md' | 'xl';
  fill?: boolean; // thân bảng lấp đầy chiều cao còn lại và tự cuộn, tiêu đề cột vẫn dính (chỉ khi bảng hiện)
  stickyEnd?: boolean; // cột cuối (Thao tác) dính ở mép phải khi bảng cuộn ngang. Dòng có độ rộng tối thiểu bằng tổng cột để ô dính có chỗ bám
  footer?: ReactNode; // phân trang hoặc ghi chú dưới bảng
  empty?: ReactNode; // hiện thay cho bảng khi không có dòng nào
  sort?: GridSort | null;
  onSort?: (column: string) => void;
  sortable?: boolean; // Cho phép sắp xếp mặc định trên toàn bảng cho các cột không phải actions / srOnly
};

// Lớp hiển thị bảng theo mốc. Mỗi mốc là chuỗi đầy đủ để Tailwind tạo CSS.
const TABLE_SHOW = {
  md: 'hidden min-[768px]:block',
  xl: 'hidden min-[1200px]:block',
} as const;
const TABLE_SHOW_FILL = {
  md: 'hidden min-[768px]:flex min-[768px]:min-h-0 min-[768px]:flex-1 min-[768px]:flex-col',
  xl: 'hidden min-[1200px]:flex min-[1200px]:min-h-0 min-[1200px]:flex-1 min-[1200px]:flex-col',
} as const;
const BODY_FILL = {
  md: 'min-[768px]:min-h-0 min-[768px]:flex-1 min-[768px]:overflow-y-auto scroll-quiet',
  xl: 'min-[1200px]:min-h-0 min-[1200px]:flex-1 min-[1200px]:overflow-y-auto scroll-quiet',
} as const;
// Bảng không fill vẫn cuộn ngang trong khung khi thiếu chỗ, để các cột ở mép phải (nút ⋯) không bị cắt
const BODY_X = {
  md: 'min-[768px]:overflow-x-auto',
  xl: 'min-[1200px]:overflow-x-auto',
} as const;
const CARDS_HIDE_ABOVE = {
  md: 'min-[768px]:hidden',
  xl: 'min-[1200px]:hidden',
} as const;
const CARDS_MD_ONLY = 'hidden min-[768px]:flex';
const CARDS_ALL = 'flex';

// Độ rộng tối thiểu (px) của một cột, đọc từ chuỗi width: "Npx" hoặc "minmax(Npx, …)". Cột khác tính 0.
function minPx(width: string): number {
  const m = /^(?:minmax\()?(\d+)px/.exec(width);
  return m ? Number(m[1]) : 0;
}

export function DataGrid<T>({
  label,
  columns,
  rows,
  rowKey,
  cell,
  card,
  cardsFrom = 'all',
  from = 'xl',
  fill = false,
  stickyEnd = false,
  footer,
  empty,
  sort: controlledSort,
  onSort: controlledOnSort,
  sortable = true,
}: Props<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Trạng thái sắp xếp nội bộ khi không có prop sort từ ngoài (uncontrolled)
  const [internalSort, setInternalSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  const isControlled = controlledSort !== undefined;
  const urlSort = !isControlled && searchParams ? searchParams.get('sort') : null;
  const urlOrder = !isControlled && searchParams ? searchParams.get('order') : null;

  // Xác định trạng thái sort đang áp dụng: ưu tiên controlled -> URL -> internal state
  const activeSort: { column: string; direction: 'asc' | 'desc' } | null = useMemo(() => {
    if (isControlled) return controlledSort;
    if (urlSort) {
      return {
        column: urlSort,
        direction: urlOrder === 'desc' ? 'desc' : 'asc',
      };
    }
    return internalSort;
  }, [isControlled, controlledSort, urlSort, urlOrder, internalSort]);

  // Xử lý khi nhấn vào tiêu đề cột để sắp xếp
  const handleSort = useCallback(
    (columnKey: string) => {
      if (controlledOnSort) {
        controlledOnSort(columnKey);
        return;
      }

      const isCurrent = activeSort?.column === columnKey;
      const nextDir: 'asc' | 'desc' | null = !isCurrent
        ? 'asc'
        : activeSort.direction === 'asc'
        ? 'desc'
        : null;

      setInternalSort(nextDir ? { column: columnKey, direction: nextDir } : null);

      // Nếu là trang server-side sort (như hoc-sinh) hoặc URL đang có searchParams liên quan sort/page
      const isServerUrlSync = pathname === '/hoc-sinh' || (searchParams?.has('sort') ?? false);
      if (isServerUrlSync && searchParams && router) {
        const params = new URLSearchParams(searchParams.toString());
        if (nextDir) {
          params.set('sort', columnKey);
          params.set('order', nextDir);
        } else {
          params.delete('sort');
          params.delete('order');
        }
        if (params.has('p')) params.set('p', '1');
        if (params.has('n')) params.set('n', '1');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : (pathname || ''), { scroll: false });
      }
    },
    [controlledOnSort, activeSort, searchParams, router, pathname],
  );

  // Sắp xếp các dòng hiển thị tự động bằng sortRows
  const displayRows = useMemo(() => {
    if (!activeSort || !sortable) return rows;
    const col = columns.find((c) => c.key === activeSort.column);
    return sortRows(rows, activeSort.column, activeSort.direction, col?.sortValue);
  }, [rows, activeSort, sortable, columns]);

  if (rows.length === 0 && empty) return <>{empty}</>;

  const template = columns.map((c) => c.width).join(' ');
  // Dòng ít nhất bằng tổng cột (gap-x-3 là 12px, lề trái 16px) để ô dính có khung bám khi cuộn ngang
  const rowMin = stickyEnd ? columns.reduce((sum, c) => sum + minPx(c.width), 0) + (columns.length - 1) * 12 + 16 : undefined;
  const pinIndex = stickyEnd ? columns.length - 1 : -1;
  const frame = fill ? TABLE_SHOW_FILL[from] : TABLE_SHOW[from];

  return (
    <>
      <div className={`overflow-hidden rounded-[var(--radius-panel)] bg-surface shadow-card ${frame}`}>
        <div role="table" aria-label={label} className={fill ? BODY_FILL[from] : BODY_X[from]}>
          <div role="row" style={{ gridTemplateColumns: template, minWidth: rowMin }} className={`sticky top-0 z-10 grid items-center gap-x-3 border-b border-line bg-surface py-2 text-xs font-normal text-muted ${stickyEnd ? 'pl-4' : 'px-4'}`}>
            {columns.map((c) => {
              if (c.srOnly) {
                // Ô giữ chỗ trong lưới: chữ chỉ đọc được bằng trình đọc màn hình. sr-only tự nó nằm ngoài luồng lưới, làm lệch các tiêu đề sau nó.
                return (
                  <span key={c.key} role="columnheader" className="min-w-0">
                    <span className="sr-only">{c.label}</span>
                  </span>
                );
              }
              const isColumnSortable = sortable && c.sortable !== false && c.key !== 'actions';
              if (isColumnSortable) {
                const isSorted = activeSort?.column === c.key;
                const direction = isSorted ? activeSort.direction : undefined;
                return (
                  <span
                    key={c.key}
                    role="columnheader"
                    aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`min-w-0 ${c.align === 'end' ? 'text-right' : ''}`}
                  >
                    <SortHeader
                      columnKey={c.key}
                      label={c.label}
                      align={c.align}
                      isSorted={isSorted}
                      direction={direction}
                      onSort={handleSort}
                    />
                  </span>
                );
              }
              return (
                <span key={c.key} role="columnheader" className={`${c.align === 'end' ? 'text-right' : ''}`}>
                  {c.label}
                </span>
              );
            })}
          </div>
          {displayRows.map((row) => (
            <div key={rowKey(row)} role="row" style={{ gridTemplateColumns: template, minWidth: rowMin }} className={`group grid items-center gap-x-3 border-b border-line py-2.5 transition-colors last:border-0 hover:bg-row-hover ${stickyEnd ? 'pl-4' : 'px-4'}`}>
              {columns.map((c, i) => (
                <div key={c.key} role="cell" className={`min-w-0 ${c.align === 'end' ? 'flex justify-end' : ''} ${i === pinIndex ? 'sticky right-0 z-[1] bg-surface pr-4 group-hover:bg-row-hover' : ''}`}>
                  {cell(row, c.key)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {card && (
        <div className={`${cardsFrom === 'md' ? CARDS_MD_ONLY : CARDS_ALL} flex-col gap-3 ${CARDS_HIDE_ABOVE[from]}`}>
          {displayRows.map((row) => (
            <div key={rowKey(row)}>{card(row)}</div>
          ))}
        </div>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </>
  );
}
