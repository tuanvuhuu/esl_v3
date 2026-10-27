'use client';

// Ô sửa tại chỗ trên bảng phụ huynh: bấm để sửa, Enter hoặc rời ô để lưu, Esc để huỷ.
// Lỗi hiện ngay dưới ô và ô vẫn mở để sửa tiếp. Không có quyền thì chỉ hiện chữ.
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type ChangeEvent, type KeyboardEvent } from 'react';
import type { ActionResult } from '@/lib/validation/student';
import { Alert } from '@/components/ui/primitives';

const INPUT = 'h-[var(--ctl-h)] w-full min-w-0 rounded-[var(--radius-ctl)] border border-primary-deep bg-surface px-2 text-sm text-ink outline-none';
const AREA = 'w-full min-w-0 rounded-[var(--radius-ctl)] border border-primary-deep bg-surface px-2 py-1 text-sm text-ink outline-none';

export function InlineText({
  value,
  label,
  placeholder,
  multiline = false,
  wrap = false,
  inputType = 'text',
  canEdit,
  className = '',
  onSave,
}: {
  value: string;
  label: string; // tên ô, cho trình đọc màn hình
  placeholder: string; // chữ khi ô trống
  multiline?: boolean;
  wrap?: boolean; // hiện tối đa hai dòng thay vì một dòng cắt bớt (cột ghi chú bảng phụ huynh)
  inputType?: 'text' | 'tel' | 'email';
  canEdit: boolean;
  className?: string;
  onSave: (next: string) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Đã lưu hoặc đã huỷ thì không lưu thêm lần nữa: Enter rồi rời ô chỉ lưu một lần
  const finished = useRef(false);

  function start() {
    setDraft(value);
    setError(null);
    finished.current = false;
    setEditing(true);
  }

  function cancel() {
    finished.current = true;
    setEditing(false);
    setError(null);
  }

  function commit() {
    if (finished.current || pending) return;
    if (draft.trim() === value.trim()) {
      cancel();
      return;
    }
    finished.current = true;
    startTransition(async () => {
      const r = await onSave(draft);
      if (r.ok) {
        setEditing(false);
        setError(null);
        router.refresh();
      } else {
        // Lỗi: giữ ô mở và chữ đang gõ, để sửa rồi lưu lại
        finished.current = false;
        setError(r.message ?? 'Không lưu được');
      }
    });
  }

  function onKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    } else if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commit();
    }
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        {multiline ? (
          <textarea
            aria-label={label}
            rows={2}
            value={draft}
            autoFocus
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            className={AREA}
          />
        ) : (
          <input
            aria-label={label}
            type={inputType}
            value={draft}
            autoFocus
            onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKey}
            className={INPUT}
          />
        )}
        {pending && <span className="text-xs text-muted">Đang lưu…</span>}
        {error && (
          <Alert inline>
            {error}
          </Alert>
        )}
      </div>
    );
  }

  const isEmpty = !value.trim();
  // Không có quyền: ô trống để trống, không hiện gợi ý
  if (!canEdit) return isEmpty ? null : <span className={`block min-w-0 ${wrap ? 'line-clamp-2 break-words' : 'truncate'} ${className}`} title={value}>{value}</span>;
  // Nút cao đúng chuẩn ô (32px), chữ căn giữa. Ô trống không hiện chữ: gợi ý (Thêm email…) hiện khi rê chuột hoặc Tab vào ô.
  // Ghi chú dài hiện một dòng; bấm để sửa và xem đủ.
  return (
    <button
      type="button"
      onClick={start}
      aria-label={`Sửa ${label}`}
      className={`group -mx-1 flex h-[var(--ctl-h)] max-w-full min-w-0 items-center rounded-[var(--radius-ctl)] px-1 text-left hover:bg-stone ${isEmpty ? '' : className}`}
    >
      {isEmpty ? (
        <span className="min-w-0 truncate text-sm text-muted opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{placeholder}</span>
      ) : (
        <span className={`min-w-0 ${wrap ? 'line-clamp-2 break-words' : 'truncate'}`} title={value}>{value}</span>
      )}
    </button>
  );
}
