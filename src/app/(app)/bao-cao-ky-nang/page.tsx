import { connection } from 'next/server';
import { Suspense } from 'react';
import { SkillReportView } from '@/components/skills/SkillReportView';
import { NoAccess } from '@/components/ui/NoAccess';
import { getCampusContext } from '@/lib/campus-context';
import { withCampusNames } from '@/lib/campus';
import { hasPermission } from '@/lib/permissions';
import { listClassChoices } from '@/lib/queries/classes';
import { classSkillReport } from '@/lib/queries/skills';
import { getCurrentPermissions } from '@/lib/session';

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Báo cáo kỹ năng của một lớp. Lớp nằm trên URL. Dữ liệu đọc trong Suspense (cacheComponents đang bật).
export default function SkillReportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportData searchParams={searchParams} />
    </Suspense>
  );
}

function ReportSkeleton() {
  return (
    <section aria-busy="true" aria-label="Đang tải báo cáo kỹ năng" className="flex flex-col gap-4">
      <div className="h-9 w-56 animate-pulse rounded-xl bg-stone" />
      <div className="h-[320px] animate-pulse rounded-[var(--radius-panel)] bg-stone" />
    </section>
  );
}

async function ReportData({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();
  const sp = await searchParams;
  const granted = new Set(await getCurrentPermissions());
  if (!hasPermission(granted, 'students.view')) return <NoAccess title="Báo cáo kỹ năng" />;

  const { scope } = await getCampusContext();
  const classes = withCampusNames(await listClassChoices(scope), scope === null);
  const clsRaw = first(sp.cls);
  const classId = classes.some((c) => String(c.id) === clsRaw) ? Number(clsRaw) : (classes[0]?.id ?? 0);
  const report = classId ? await classSkillReport(classId) : { assignmentCount: 0, rows: [] };

  return (
    <SkillReportView
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      classId={classId}
      assignmentCount={report.assignmentCount}
      rows={report.rows}
    />
  );
}
