'use client';

import { Filter, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { studentsHref, type ListParams } from '@/lib/student-url';
import type { ClassOption } from './StudentForm';
import { Sheet } from '@/components/ui/Sheet';

export type FilterState = { q: string; status: string; cls: string; tuition: string };

const STATUS_CHIPS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang học' },
  { value: 'trial', label: 'Học thử' },
  { value: 'paused', label: 'Bảo lưu' },
  { value: 'finished', label: 'Đã nghỉ' },
];

const TUITION_OPTIONS = [
  { value: 'all', label: 'Mọi học phí' },
  { value: 'paid', label: 'Đã đóng' },
  { value: 'partial', label: 'Còn nợ' },
  { value: 'unpaid', label: 'Chưa đóng' },
];

// Thanh lọc: chip trạng thái, chọn lớp và học phí (máy tính), ô tìm kiếm và nút Bộ lọc (điện thoại)
export function StudentFilters({
  current,
  classes,
  statusCounts,
  onAdd,
}: {
  current: FilterState;
  classes: ClassOption[];
  statusCounts: Record<string, number>;
  onAdd?: () => void;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftCls, setDraftCls] = useState(current.cls);
  const [draftTuition, setDraftTuition] = useState(current.tuition);
  const [draftQ, setDraftQ] = useState(current.q);

  function go(next: Partial<ListParams>) {
    router.push(studentsHref({ ...current, ...next, p: 1, n: 1 }));
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    go({ q: draftQ });
  }

  function applySheet() {
    setSheetOpen(false);
    router.push(studentsHref({ q: draftQ, status: current.status, cls: draftCls, tuition: draftTuition, p: 1, n: 1 }));
  }

  const activeFilterCount = (current.cls ? 1 : 0) + (current.tuition !== 'all' ? 1 : 0);

  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Điện thoại: tìm kiếm và Bộ lọc, cùng hàng */}
      <div className="flex gap-2 min-[768px]:hidden">
        <form onSubmit={onSearch} role="search" className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] border border-line bg-surface px-3.5 focus-within:border-primary-deep">
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <label htmlFor="mobile-search" className="sr-only">Tìm học sinh</label>
          <input
            id="mobile-search"
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Tìm học sinh"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-input text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
        </form>
        <button
          type="button"
          onClick={() => {
            setDraftCls(current.cls);
            setDraftTuition(current.tuition);
            setSheetOpen(true);
          }}
          className="relative flex h-11 shrink-0 items-center gap-1.5 rounded-[14px] border border-line bg-surface px-3 text-sm font-bold text-ink"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Bộ lọc
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-deep px-1 text-2xs font-extrabold text-on-primary">
              {activeFilterCount}
            </span>
          )}
        </button>
        {onAdd && (
          <button type="button" onClick={onAdd} className="flex h-11 shrink-0 items-center gap-1.5 rounded-[14px] bg-primary-deep px-3 text-sm font-extrabold text-on-primary">
            <Plus className="size-4" aria-hidden />
            Thêm mới
          </button>
        )}
      </div>

      {/* Chip trạng thái (mọi màn hình) */}
      <div role="tablist" aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => {
          const on = current.status === chip.value || (chip.value === 'all' && current.status === 'all');
          return (
            <button
              key={chip.value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => go({ status: chip.value })}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${on ? 'bg-primary text-on-primary' : 'bg-stone text-stone-ink hover:bg-line'} max-[767px]:h-9 max-[767px]:text-xs`}
            >
              {chip.label}
              <b className={`text-xs font-bold ${on ? 'opacity-80' : 'opacity-60'}`}>{statusCounts[chip.value] ?? 0}</b>
            </button>
          );
        })}
      </div>

      {/* Máy tính và máy tính bảng: chọn lớp và học phí */}
      <div className="hidden flex-wrap gap-2 min-[768px]:flex">
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface py-2 pl-3 pr-2 text-sm font-semibold text-ink">
          <Filter className="size-3.5 text-muted" aria-hidden />
          <span className="sr-only">Lọc theo lớp</span>
          <select value={current.cls} onChange={(e) => go({ cls: e.target.value })} className="bg-transparent text-sm font-semibold text-ink outline-none">
            <option value="">Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface py-2 pl-3 pr-2 text-sm font-semibold text-ink">
          <span className="sr-only">Lọc theo học phí</span>
          <select value={current.tuition} onChange={(e) => go({ tuition: e.target.value })} className="bg-transparent text-sm font-semibold text-ink outline-none">
            {TUITION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Điện thoại: bảng Bộ lọc trượt từ đáy (DESIGN mục 3) */}
      <Sheet open={sheetOpen} title="Bộ lọc" onClose={() => setSheetOpen(false)} labelledBy="filter-title" footer={
        <div className="flex gap-2.5">
          <button type="button" onClick={() => { setDraftCls(''); setDraftTuition('all'); }} className="h-11 flex-1 rounded-xl border border-line bg-surface text-base font-bold text-ink">
            Đặt lại
          </button>
          <button type="button" onClick={applySheet} className="h-11 flex-[2] rounded-xl bg-primary text-base font-bold text-on-primary">
            Xem học sinh
          </button>
        </div>
      }>
        <div className="flex flex-col gap-5 pb-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Lớp học</legend>
            <OptionRadio name="cls" value="" label="Tất cả lớp" checked={draftCls === ''} onChange={setDraftCls} />
            {classes.map((c) => (
              <OptionRadio key={c.id} name="cls" value={String(c.id)} label={`${c.name} · ${c.teacherName}`} checked={draftCls === String(c.id)} onChange={setDraftCls} />
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Học phí</legend>
            {TUITION_OPTIONS.map((o) => (
              <OptionRadio key={o.value} name="tuition" value={o.value} label={o.label} checked={draftTuition === o.value} onChange={setDraftTuition} />
            ))}
          </fieldset>
        </div>
      </Sheet>
    </div>
  );
}

function OptionRadio({ name, value, label, checked, onChange }: { name: string; value: string; label: string; checked: boolean; onChange: (v: string) => void }) {
  return (
    <label className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-[14px] border px-3.5 py-2.5 text-base font-semibold text-ink ${checked ? 'border-primary-deep bg-primary-soft' : 'border-line bg-bg'}`}>
      {label}
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="size-4 accent-[var(--primary-deep)]" />
    </label>
  );
}
