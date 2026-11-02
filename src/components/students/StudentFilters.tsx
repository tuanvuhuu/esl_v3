'use client';

import { FilterIcon, PlusIcon, SearchIcon, SlidersIcon } from '@primer/octicons-react';
import { CounterLabel } from '@primer/react';
import { useRouter } from 'next/navigation';
import { startTransition, useOptimistic, useState, type FormEvent } from 'react';
import { ComboBox } from '@/components-ui/combo-box';
import { SelectBox } from '@/components-ui/select-box';
import TextInput from '@/components-ui/text-input';
import { Btn } from '@/components/ui/Btn';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { Sheet } from '@/components/ui/Sheet';
import { listParam } from '@/lib/list-param';
import { studentsHref, type ListParams } from '@/lib/student-url';
import type { ClassOption } from './StudentForm';

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

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// Thanh chip trạng thái gọn đặt bên trái thanh công cụ của DataGrid.
export function StudentStatusTabs({
  current,
  statusCounts,
}: {
  current: FilterState;
  statusCounts: Record<string, number>;
}) {
  const router = useRouter();
  return (
    <ChipGroup label="Lọc theo trạng thái">
      {STATUS_CHIPS.map((chip) => (
        <Chip
          key={chip.value}
          tab
          selected={current.status === chip.value}
          count={statusCounts[chip.value] ?? 0}
          onClick={() => router.push(studentsHref({ ...current, status: chip.value, p: 1, n: 1 }))}
        >
          {chip.label}
        </Chip>
      ))}
    </ChipGroup>
  );
}

// Nhóm bộ lọc lớp, học phí và nút Thêm học sinh đặt thẳng vào `actionComponent` của DataGrid (1 hàng duy nhất).
export function StudentToolbarActions({
  current,
  classes,
  onAdd,
}: {
  current: FilterState;
  classes: ClassOption[];
  onAdd?: () => void;
}) {
  const router = useRouter();
  const selectedTuition = listParam(current.tuition);
  const [clsView, setClsView] = useOptimistic(current.cls);
  const [tuitionView, setTuitionView] = useOptimistic(current.tuition);

  function changeDesktop(next: { cls?: string; tuition?: string }) {
    startTransition(() => {
      if (next.cls !== undefined) setClsView(next.cls);
      if (next.tuition !== undefined) setTuitionView(next.tuition);
      router.push(
        studentsHref({
          ...current,
          cls: next.cls ?? clsView,
          tuition: next.tuition ?? tuitionView,
          p: 1,
          n: 1,
        }),
      );
    });
  }

  return (
    <>
      <ComboBox
        multiple
        auto
        variant="bar"
        label="Lọc theo lớp"
        icon={<FilterIcon size={14} className="text-[var(--fgColor-muted)]" aria-hidden />}
        values={listParam(clsView)}
        onChange={(vs) => changeDesktop({ cls: vs.join(',') })}
        options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
        placeholder="Mọi lớp"
        allowClear
      />
      <SelectBox
        auto
        variant="bar"
        label="Lọc theo học phí"
        value={tuitionView}
        onChange={(v) => changeDesktop({ tuition: v })}
        options={[{ value: '', label: 'Mọi học phí' }, ...TUITION_OPTIONS]}
        placeholder={
          selectedTuition.length > 1
            ? TUITION_OPTIONS.filter((o) => selectedTuition.includes(o.value))
                .map((o) => o.label)
                .join(', ')
            : 'Mọi học phí'
        }
      />
      {onAdd && (
        <Btn variant="primary" leadingVisual={PlusIcon} onClick={onAdd}>
          Thêm học sinh
        </Btn>
      )}
    </>
  );
}

// Thanh lọc riêng cho màn điện thoại (< 768px): tìm kiếm + Sheet Bộ lọc + chip trạng thái.
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
  const activeFilterCount = selectedCls.length + selectedTuition.length;

  function go(next: Partial<ListParams>) {
    router.push(studentsHref({ ...current, ...next, p: 1, n: 1 }));
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

  return (
    <div className="mb-2.5 flex flex-col gap-2 min-[768px]:hidden">
      <div className="flex gap-2">
        <form onSubmit={onSearch} role="search" className="relative min-w-0 flex-1">
          <label htmlFor="mobile-search" className="sr-only">
            Tìm học sinh
          </label>
          <TextInput
            block
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
          {activeFilterCount > 0 && <CounterLabel className="ml-1 !font-normal">{activeFilterCount}</CounterLabel>}
        </Btn>
        {onAdd && (
          <Btn variant="primary" leadingVisual={PlusIcon} onClick={onAdd} className="shrink-0">
            Thêm mới
          </Btn>
        )}
      </div>

      <StudentStatusTabs current={current} statusCounts={statusCounts} />

      <Sheet
        open={sheetOpen}
        title="Bộ lọc"
        onClose={() => setSheetOpen(false)}
        labelledBy="filter-title"
        footer={
          <div className="flex gap-2.5">
            <Btn
              block
              onClick={() => {
                setDraftCls([]);
                setDraftTuition([]);
              }}
              className="flex-1"
            >
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
