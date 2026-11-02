'use client';

import { useRouter } from 'next/navigation';
import { SKILL_LABELS, SKILLS, type Skill } from '@/lib/assignment-scoring';
import { BAND_LABEL, bandOf, totalPercent, type Band, type SkillTotals } from '@/lib/skill-stats';
import { skillCellClass } from './SkillScore';
import { ComboBox } from '@/components-ui';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { Card, EmptyPanel } from '@/components/ui/surfaces';

export type SkillReportRow = { studentId: number; fullName: string; totals: SkillTotals; gradedCount: number };

const COLUMNS: GridColumn[] = [
  { key: 'student', label: 'Học sinh', width: 'minmax(180px,1.5fr)' },
  { key: 'listening', label: SKILL_LABELS.listening, width: 'minmax(112px,1fr)' },
  { key: 'speaking', label: SKILL_LABELS.speaking, width: 'minmax(112px,1fr)' },
  { key: 'reading', label: SKILL_LABELS.reading, width: 'minmax(112px,1fr)' },
  { key: 'writing', label: SKILL_LABELS.writing, width: 'minmax(112px,1fr)' },
  { key: 'graded', label: 'Số bài đã chấm', width: 'minmax(120px,0.9fr)', align: 'end' },
];

const LEGEND: Band[] = ['good', 'mid', 'low', 'none'];

const SKILL_ACCENT: Record<Skill, { border: string; color: string }> = {
  listening: { border: 'border-l-[#2a78d6]', color: '#2a78d6' },
  speaking: { border: 'border-l-[#eb6834]', color: '#eb6834' },
  reading: { border: 'border-l-[#1baf7a]', color: '#1baf7a' },
  writing: { border: 'border-l-[#8250df]', color: '#8250df' },
};

function barFillColor(percent: number | null): string {
  const b = bandOf(percent);
  if (b === 'good') return '#1baf7a';
  if (b === 'mid') return '#eb6834';
  if (b === 'low') return '#cf222e';
  return 'transparent';
}

function classSkillAverage(rows: SkillReportRow[], skill: Skill): number | null {
  let raw = 0;
  let max = 0;
  let count = 0;
  for (const r of rows) {
    raw += r.totals[skill].raw;
    max += r.totals[skill].max;
    count += r.totals[skill].count;
  }
  return totalPercent({ raw, max, count });
}

// Báo cáo kỹ năng của lớp: dải KPI trung bình 4 kỹ năng + bảng học sinh × kỹ năng kèm thanh tỷ lệ chuẩn 01. TSUKUBA
export function SkillReportView({
  classes,
  classId,
  assignmentCount,
  rows,
}: {
  classes: { id: number; name: string }[];
  classId: number;
  assignmentCount: number;
  rows: SkillReportRow[];
}) {
  const router = useRouter();
  const cls = classes.find((c) => c.id === classId);
  const activeRows = assignmentCount === 0 ? [] : rows;

  const cell = (r: SkillReportRow, key: string) => {
    if (key === 'student') return <span className="min-w-0 truncate text-sm font-medium text-[var(--fgColor-default)]">{r.fullName}</span>;
    if (key === 'graded') return <span className="text-sm tabular-nums text-[var(--fgColor-muted)]">{r.gradedCount} bài</span>;
    const percent = totalPercent(r.totals[key as Skill]);
    return (
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex min-w-[52px] justify-center rounded-[var(--borderRadius-small)] px-2 py-0.5 text-xs font-normal tabular-nums ${skillCellClass(percent)}`}
        >
          {percent === null ? '—' : `${percent}%`}
        </span>
        <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bgColor-neutral-muted)] min-[1024px]:block">
          {percent !== null && (
            <span
              className="block h-full rounded-full transition-all"
              style={{ width: `${Math.max(4, percent)}%`, backgroundColor: barFillColor(percent) }}
            />
          )}
        </span>
      </div>
    );
  };

  return (
    <section className="tsukuba-rise flex flex-col">
      <PageCrumbs crumbs={['Đào tạo', 'Bài tập', 'Báo cáo kỹ năng']} />

      <dl
        aria-label="Trung bình kỹ năng toàn lớp"
        className="mb-3 grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4"
      >
        {SKILLS.map((s) => {
          const avg = activeRows.length > 0 ? classSkillAverage(activeRows, s) : null;
          const accent = SKILL_ACCENT[s];
          return (
            <div
              key={s}
              className={`rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] border-l-[3px] ${accent.border} bg-[var(--bgColor-default)] px-3.5 py-2.5`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-xs font-medium text-[var(--fgColor-muted)]">{SKILL_LABELS[s]}</dt>
                <dd className="m-0 text-lg font-semibold tabular-nums text-[var(--fgColor-default)]">
                  {avg === null ? '—' : `${avg}%`}
                </dd>
              </div>
              <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-[var(--bgColor-neutral-muted)]">
                <span
                  className="block h-full rounded-full transition-all duration-200"
                  style={{ width: `${avg ?? 0}%`, backgroundColor: accent.color }}
                />
              </span>
            </div>
          );
        })}
      </dl>

      <DataGrid
        label="Điểm kỹ năng của học sinh trong lớp"
        columns={COLUMNS}
        rows={activeRows}
        rowKey={(r) => r.studentId}
        cell={cell}
        from="md"
        fill={false}
        title={
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="m-0 text-base font-semibold text-[var(--fgColor-default)]">Báo cáo kỹ năng</h1>
            <span className="text-xs tabular-nums text-[var(--fgColor-muted)]">
              ({cls?.name ?? 'Lớp'} · {assignmentCount} bài có câu hỏi)
            </span>
          </div>
        }
        actionComponent={
          <>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--fgColor-muted)]" aria-label="Chú thích dải màu">
              {LEGEND.map((b) => (
                <span
                  key={b}
                  className={`inline-flex rounded-[var(--borderRadius-small)] px-2 py-0.5 ${
                    b === 'good' ? skillCellClass(80) : b === 'mid' ? skillCellClass(60) : b === 'low' ? skillCellClass(0) : skillCellClass(null)
                  }`}
                >
                  {BAND_LABEL[b]}
                </span>
              ))}
            </div>
            <ComboBox
              label="Chọn lớp"
              auto
              variant="bar"
              value={String(classId)}
              onChange={(v) => {
                if (v) router.push(`/bao-cao-ky-nang?cls=${v}`, { scroll: false });
              }}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            />
          </>
        }
        empty={
          assignmentCount === 0 ? (
            <EmptyPanel title="Lớp chưa có bài có câu hỏi" hint="Soạn câu hỏi cho bài tập để có điểm kỹ năng." />
          ) : (
            <EmptyPanel title="Lớp chưa có học sinh đang học" />
          )
        }
        card={(r) => (
          <Card className="tsukuba-rise">
            <div className="flex items-baseline justify-between gap-2">
              <b className="text-sm font-medium text-[var(--fgColor-default)]">{r.fullName}</b>
              <small className="text-xs tabular-nums text-[var(--fgColor-muted)]">{r.gradedCount} bài đã chấm</small>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SKILLS.map((s) => {
                const percent = totalPercent(r.totals[s]);
                return (
                  <div
                    key={s}
                    className="flex flex-col gap-1.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/50 px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="text-[var(--fgColor-muted)]">{SKILL_LABELS[s]}</span>
                      <span className={`rounded-[var(--borderRadius-small)] px-1.5 py-0.5 tabular-nums ${skillCellClass(percent)}`}>
                        {percent === null ? '—' : `${percent}%`}
                      </span>
                    </div>
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[var(--bgColor-neutral-muted)]">
                      {percent !== null && (
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${Math.max(4, percent)}%`, backgroundColor: barFillColor(percent) }}
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      />
    </section>
  );
}
