'use client';

import { useRouter } from 'next/navigation';
import { SKILL_LABELS, SKILLS, type Skill } from '@/lib/assignment-scoring';
import { BAND_LABEL, totalPercent, type Band, type SkillTotals } from '@/lib/skill-stats';
import { skillCellClass } from './SkillScore';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Card, EmptyPanel } from '@/components/ui/surfaces';

export type SkillReportRow = { studentId: number; fullName: string; totals: SkillTotals; gradedCount: number };

const COLUMNS: GridColumn[] = [
  { key: 'student', label: 'Học sinh', width: 'minmax(180px,1.6fr)' },
  { key: 'listening', label: SKILL_LABELS.listening, width: 'minmax(90px,1fr)' },
  { key: 'speaking', label: SKILL_LABELS.speaking, width: 'minmax(90px,1fr)' },
  { key: 'reading', label: SKILL_LABELS.reading, width: 'minmax(90px,1fr)' },
  { key: 'writing', label: SKILL_LABELS.writing, width: 'minmax(90px,1fr)' },
  { key: 'graded', label: 'Số bài đã chấm', width: 'minmax(120px,1fr)' },
];

const LEGEND: Band[] = ['good', 'mid', 'low', 'none'];

// Báo cáo kỹ năng của lớp: học sinh × kỹ năng, ô tô màu theo dải điểm (token có sẵn)
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

  const cell = (r: SkillReportRow, key: string) => {
    if (key === 'student') return <span className="min-w-0 truncate text-base font-bold text-ink">{r.fullName}</span>;
    if (key === 'graded') return <span className="text-base text-ink">{r.gradedCount} bài</span>;
    const percent = totalPercent(r.totals[key as Skill]);
    return (
      <span className={`inline-flex min-w-[56px] justify-center rounded-lg px-2.5 py-1 text-base font-normal ${skillCellClass(percent)}`}>
        {percent === null ? '—' : `${percent}%`}
      </span>
    );
  };

  return (
    <section className="flex flex-col">
      <PageHeader
        crumbs={['Đào tạo', 'Bài tập', 'Báo cáo kỹ năng']}
        title="Báo cáo kỹ năng"
        subtitle={`${cls?.name ?? 'Lớp'} · ${assignmentCount} bài có câu hỏi`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SelectPanel
          label="Chọn lớp"
          auto
          value={String(classId)}
          onChange={(v) => router.push(`/bao-cao-ky-nang?cls=${v}`, { scroll: false })}
          options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
        />
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2" aria-label="Chú thích dải màu">
          {LEGEND.map((b) => (
            <span key={b} className={`inline-flex rounded-lg px-2 py-0.5 ${b === 'good' ? skillCellClass(80) : b === 'mid' ? skillCellClass(60) : b === 'low' ? skillCellClass(0) : skillCellClass(null)}`}>
              {BAND_LABEL[b]}
            </span>
          ))}
        </div>
      </div>

      {assignmentCount === 0 ? (
        <EmptyPanel title="Lớp chưa có bài có câu hỏi" hint="Soạn câu hỏi cho bài tập để có điểm kỹ năng." />
      ) : rows.length === 0 ? (
        <EmptyPanel title="Lớp chưa có học sinh đang học" />
      ) : (
        // Điện thoại: thẻ của DataGrid, mỗi học sinh một thẻ, bốn kỹ năng là bốn ô màu
        <DataGrid
          label="Điểm kỹ năng của học sinh trong lớp"
          columns={COLUMNS}
          rows={rows}
          rowKey={(r) => r.studentId}
          cell={cell}
          from="md"
          card={(r) => (
            <Card>
              <b className="text-base font-normal text-ink">{r.fullName}</b>
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map((s) => {
                  const percent = totalPercent(r.totals[s]);
                  return (
                    <span key={s} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${skillCellClass(percent)}`}>
                      {SKILL_LABELS[s]} <b className="font-normal">{percent === null ? '—' : `${percent}%`}</b>
                    </span>
                  );
                })}
              </div>
              <small className="text-sm text-muted">{r.gradedCount} bài đã chấm</small>
            </Card>
          )}
        />
      )}
    </section>
  );
}
