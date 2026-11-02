import { connection } from 'next/server';
import { Suspense } from 'react';
import { HistoryTimeline } from '@/components/learning/HistoryTimeline';
import { Btn } from '@/components/ui/Btn';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pill } from '@/components/ui/primitives';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Panel } from '@/components/ui/surfaces';
import { withCampusNames } from '@/lib/campus';
import { getCampusContext } from '@/lib/campus-context';
import { filterHistory, HISTORY_KIND_LABELS, HISTORY_KINDS, type HistoryKind } from '@/lib/learning-history';
import { idListParam, listParam } from '@/lib/list-param';
import { hasPermission } from '@/lib/permissions';
import { listClassChoices } from '@/lib/queries/classes';
import { listHistoryAll } from '@/lib/queries/learning';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

// Lịch sử học tập của mọi học sinh. Lọc theo nhiều lớp và nhiều loại, trên URL.
export default function LearningHistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryData searchParams={searchParams} />
    </Suspense>
  );
}

function HistorySkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải lịch sử học tập" className="flex flex-col gap-4">
      <div className="h-9 w-56 animate-pulse rounded-[var(--borderRadius-medium)] bg-[var(--bgColor-muted)]" />
      <div className="h-14 w-full animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
      <div className="h-[420px] w-full animate-pulse rounded-[var(--borderRadius-large)] bg-[var(--bgColor-muted)]" />
    </section>
  );
}

async function HistoryData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Lịch sử học tập" />;

  // Lớp và loại chọn nhiều. Danh sách rỗng nghĩa là không lọc.
  const classIds = idListParam(sp.cls);
  const kinds = listParam(sp.kind).filter((k): k is HistoryKind => (HISTORY_KINDS as readonly string[]).includes(k));

  const { scope } = await getCampusContext();
  const [all, classOptions] = await Promise.all([listHistoryAll(scope), listClassChoices(scope)]);
  const classes = withCampusNames(classOptions, scope === null);
  const items = filterHistory(all, { classIds, kinds });

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lịch sử học tập']}
        title="Lịch sử học tập"
        subtitle="Gộp từ điểm danh, bài tập đã chấm, học phí và ghi chú. Mới nhất ở trên."
      />

      <form
        method="get"
        action="/lich-su-hoc-tap"
        role="search"
        className="mb-4 flex flex-wrap items-center gap-2 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3"
      >
        <SelectPanel
          multiple
          name="cls"
          label="Lọc theo lớp"
          defaultValues={classIds.map(String)}
          options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
          placeholder="Mọi lớp"
          block
          className="flex-1 min-[768px]:max-w-xs"
        />
        <SelectPanel
          multiple
          name="kind"
          label="Lọc theo loại"
          defaultValues={kinds}
          options={HISTORY_KINDS.map((k) => ({ value: k, label: HISTORY_KIND_LABELS[k] }))}
          placeholder="Mọi loại"
          block
          className="flex-1 min-[768px]:max-w-xs"
        />
        <Btn type="submit" variant="ghost">
          Lọc
        </Btn>
      </form>

      <Panel
        title="Dòng thời gian sự kiện"
        action={
          <Pill tone="stone">
            {items.length} mục{all.length >= 400 ? ' (400 mục gần nhất)' : ''}
          </Pill>
        }
        className="tsukuba-rise"
      >
        <HistoryTimeline items={items} showStudent />
      </Panel>
    </section>
  );
}
