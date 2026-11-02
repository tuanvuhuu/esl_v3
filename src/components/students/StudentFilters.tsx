'use client';

import { FilterIcon, PlusIcon, SearchIcon, SlidersIcon } from '@primer/octicons-react';
import { CounterLabel } from '@primer/react';
import { useRouter } from 'next/navigation';
import { startTransition, useOptimistic, useState, type FormEvent } from 'react';
import { listParam } from '@/lib/list-param';
import { studentsHref, type ListParams } from '@/lib/student-url';
import type { ClassOption } from './StudentForm';
import { Btn } from '@/components/ui/Btn';
import { Chip, ChipGroup, TextInput } from '@/components/ui/controls';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Sheet } from '@/components/ui/Sheet';

// Lớp và học phí chọn nhiều, trên URL viết "1,2". Danh sách rỗng nghĩa là không lọc.
export type FilterState = {
  q: string;
  status: string;
  cls: string;
  tuition: string;
  sort?: string;
  order?: string;
};

const STATUS_CHIPS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang học' },
  { value: 'trial', label: 'Học thử' },
  { value: 'paused', label: 'Bảo lưu' },
  { value: 'finished', label: 'Đã nghỉ' },
];

const TUITION_OPTIONS = [
  { value: 'paid', label: 'Đã đóng' },
  { value: 'partial', label: 'Còn nợ' },
  { value: 'unpaid', label: 'Chưa đóng' },
];

// Thêm hoặc bớt một giá trị trong danh sách chọn nhiều
function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Thanh lọc: chip trạng thái, chọn lớp và học phí (máy tính), ô tìm kiếm và nút Bộ lọc (điện thoại).
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
  const [draftCls, setDraftCls] = useState<string[]>([]);
  const [draftTuition, setDraftTuition] = useState<string[]>([]);
  const [draftQ, setDraftQ] = useState(current.q);
  const selectedCls = listParam(current.cls);
  const selectedTuition = listParam(current.tuition);

  // Lớp và học phí hiện ngay khi chọn, không chờ trang tải lại (chọn liên tiếp không mất mục)
  const [clsView, setClsView] = useOptimistic(current.cls);
  const [tuitionView, setTuitionView] = useOptimistic(current.tuition);

  function go(next: Partial<ListParams>) {
    router.push(studentsHref({ ...current, ...next, p: 1, n: 1 }));
  }

  // Đổi lớp hoặc học phí ở thanh lọc: giữ các bộ lọc còn lại
  function changeDesktop(next: { cls?: string; tuition?: string }) {
    startTransition(() => {
      if (next.cls !== undefined) setClsView(next.cls);
      if (next.tuition !== undefined) setTuitionView(next.tuition);
      go({ cls: next.cls ?? clsView, tuition: next.tuition ?? tuitionView });
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    go({ q: draftQ });
  }

  function openSheet() {
    setDraftCls(selectedCls);
    setDraftTuition(selectedTuition);
    setSheetOpen(true);
  }

  function applySheet() {
    setSheetOpen(false);
    router.push(studentsHref({ ...current, q: draftQ, cls: draftCls.join(','), tuition: draftTuition.join(','), p: 1, n: 1 }));
  }

  // Huy hiệu trên nút Bộ lọc đếm số mục đang chọn
  const activeFilterCount = selectedCls.length + selectedTuition.length;

  return (
    <div className="mb-4 flex flex-col gap-3">
      {/* Điện thoại: tìm kiếm, Bộ lọc và Thêm mới cùng một hàng */}
      <div className="flex gap-2 min-[768px]:hidden">
        <form onSubmit={onSearch} role="search" className="relative min-w-0 flex-1">
          <label htmlFor="mobile-search" className="sr-only">Tìm học sinh</label>
          <TextInput
            id="mobile-search"
            type="search"
            leadingVisual={SearchIcon}
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Tìm học sinh"
            autoComplete="off"
            className="[&::-webkit-search-cancel-button]:hidden"
          />
        </form>
        <Btn onClick={openSheet} leadingVisual={SlidersIcon} className="relative shrink-0">
          Bộ lọc
          {activeFilterCount > 0 && (
            <CounterLabel className="ml-1 !font-normal">{activeFilterCount}</CounterLabel>
          )}
        </Btn>
        {onAdd && (
          <Btn variant="primary" leadingVisual={PlusIcon} onClick={onAdd} className="shrink-0">
            Thêm mới
          </Btn>
        )}
      </div>

      {/* Chip trạng thái (mọi màn hình). Máy tính: chip, bộ lọc và nút thêm nằm cùng một hàng */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ChipGroup tabs label="Lọc theo trạng thái">
          {STATUS_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              tab
              selected={current.status === chip.value}
              count={statusCounts[chip.value] ?? 0}
              onClick={() => go({ status: chip.value })}
            >
              {chip.label}
            </Chip>
          ))}
        </ChipGroup>

        {/* Máy tính và máy tính bảng: chọn nhiều lớp, nhiều học phí và thêm học sinh */}
        <div className="ml-auto hidden flex-wrap items-center gap-2 min-[768px]:flex">
          <SelectPanel
            multiple
            label="Lọc theo lớp"
            icon={<FilterIcon size={14} className="text-[var(--fgColor-muted)]" aria-hidden />}
            values={listParam(clsView)}
            onChange={(vs) => changeDesktop({ cls: vs.join(',') })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder="Mọi lớp"
          />
          <SelectPanel
            multiple
            label="Lọc theo học phí"
            values={listParam(tuitionView)}
            onChange={(vs) => changeDesktop({ tuition: vs.join(',') })}
            options={TUITION_OPTIONS}
            placeholder="Mọi học phí"
          />
          {onAdd && (
            <Btn variant="primary" leadingVisual={PlusIcon} onClick={onAdd}>
              Thêm học sinh
            </Btn>
          )}
        </div>
      </div>

      {/* Điện thoại: bảng Bộ lọc trượt từ đáy (DESIGN mục 3). Lớp và học phí đánh dấu nhiều mục. */}
      <Sheet
        open={sheetOpen}
        title="Bộ lọc"
        onClose={() => setSheetOpen(false)}
        labelledBy="filter-title"
        footer={
          <div className="flex gap-2.5">
            <Btn block onClick={() => { setDraftCls([]); setDraftTuition([]); }} className="flex-1">
              Đặt lại
            </Btn>
            <Btn block variant="primary" onClick={applySheet} className="flex-[2]">
              Xem học sinh
            </Btn>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pb-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">Lớp học</legend>
            {classes.map((c) => (
              <OptionCheck
                key={c.id}
                value={String(c.id)}
                label={`${c.name} · ${c.teacherName}`}
                checked={draftCls.includes(String(c.id))}
                onToggle={(v) => setDraftCls((list) => toggleValue(list, v))}
              />
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">Học phí</legend>
            {TUITION_OPTIONS.map((o) => (
              <OptionCheck
                key={o.value}
                value={o.value}
                label={o.label}
                checked={draftTuition.includes(o.value)}
                onToggle={(v) => setDraftTuition((list) => toggleValue(list, v))}
              />
            ))}
          </fieldset>
        </div>
      </Sheet>
    </div>
  );
}

// Dòng chọn nhiều trong bảng Bộ lọc: ô đánh dấu, không cần chọn xong mới áp dụng
function OptionCheck({
  value,
  label,
  checked,
  onToggle,
}: {
  value: string;
  label: string;
  checked: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <label
      className={`flex min-h-[var(--ctl-h-touch)] cursor-pointer items-center justify-between gap-3 rounded-[var(--borderRadius-medium)] border px-3 py-2 text-sm font-semibold text-[var(--fgColor-default)] ${
        checked
          ? 'border-[var(--borderColor-accent-emphasis)] bg-[var(--bgColor-accent-muted)]'
          : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)]'
      }`}
    >
      {label}
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={() => onToggle(value)}
        className="size-4 accent-[var(--control-checked-bgColor-rest)]"
      />
    </label>
  );
}
