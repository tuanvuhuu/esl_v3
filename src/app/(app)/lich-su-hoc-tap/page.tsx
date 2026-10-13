import { connection } from 'next/server';
import { Suspense } from 'react';
import { HistoryTimeline } from '@/components/learning/HistoryTimeline';
import { NoAccess } from '@/components/ui/NoAccess';
import { PageHeader } from '@/components/ui/PageHeader';
import { filterHistory, HISTORY_KIND_LABELS, HISTORY_KINDS, type HistoryKind } from '@/lib/learning-history';
import { hasPermission } from '@/lib/permissions';
import { listClassChoices } from '@/lib/queries/classes';
import { listHistoryAll } from '@/lib/queries/learning';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Lịch sử học tập của mọi học sinh. Lọc theo lớp và loại trên URL.
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
      <div className="h-9 w-56 animate-pulse rounded-xl bg-stone" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-stone" />
      <div className="h-[420px] w-full animate-pulse rounded-[24px] bg-stone" />
    </section>
  );
}

async function HistoryData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Lịch sử học tập" />;

  const clsRaw = first(sp.cls);
  const kindRaw = first(sp.kind) as HistoryKind;
  const kind: HistoryKind | '' = (HISTORY_KINDS as readonly string[]).includes(kindRaw) ? kindRaw : '';
  const classId = /^\d+$/.test(clsRaw) ? Number(clsRaw) : null;

  const [all, classes] = await Promise.all([listHistoryAll(), listClassChoices()]);
  const items = filterHistory(all, { classId, kind });


  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Lịch sử học tập']}
        title="Lịch sử học tập"
        subtitle="Gộp từ điểm danh, bài tập đã chấm, học phí và ghi chú. Mới nhất ở trên."
      />

      <form method="get" action="/lich-su-hoc-tap" role="search" className="mb-5 flex flex-wrap items-center gap-2">
        <select name="cls" defaultValue={classId ? String(classId) : ''} aria-label="Lọc theo lớp" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink min-[768px]:max-w-xs">
          <option value="">Mọi lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="kind" defaultValue={kind} aria-label="Lọc theo loại" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-base font-semibold text-ink min-[768px]:max-w-xs">
          <option value="">Mọi loại</option>
          {HISTORY_KINDS.map((k) => (
            <option key={k} value={k}>{HISTORY_KIND_LABELS[k]}</option>
          ))}
        </select>
        <button type="submit" className="h-11 rounded-xl bg-stone px-5 text-base font-bold text-ink">Lọc</button>
      </form>

      <div className="rounded-[24px] bg-surface p-5 shadow-card max-[767px]:p-4">
        <p className="mb-4 text-sm text-muted">{items.length} mục{all.length >= 400 ? ' (chỉ tải 400 mục gần nhất)' : ''}</p>
        <HistoryTimeline items={items} showStudent />
      </div>
    </section>
  );
}
