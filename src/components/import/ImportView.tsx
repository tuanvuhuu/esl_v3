'use client';

import { Download, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { commitImportAction, previewImportAction, type PreviewResponse } from '@/app/(app)/nhap-du-lieu/actions';
import type { Action, EntityKind, ImportSummary, RowResult } from '@/lib/import/plan';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { FileInput } from '@/components/ui/Field';
import { Alert, Pill, type Tone } from '@/components/ui/primitives';
import { Card, Panel } from '@/components/ui/surfaces';

type Preview = Extract<PreviewResponse, { ok: true }>;

const KINDS: { kind: EntityKind; label: string }[] = [
  { kind: 'campus', label: 'Cơ sở' },
  { kind: 'teacher', label: 'Giáo viên' },
  { kind: 'class', label: 'Lớp' },
  { kind: 'student', label: 'Học sinh' },
  { kind: 'parent', label: 'Phụ huynh' },
  { kind: 'link', label: 'Liên kết phụ huynh' },
];
const ACTION_PILL: Record<Action, { label: string; tone: Tone }> = {
  create: { label: 'Thêm', tone: 'mint' },
  update: { label: 'Cập nhật', tone: 'butter' },
  same: { label: 'Giữ nguyên', tone: 'stone' },
};
const KIND_LABEL: Record<EntityKind, string> = Object.fromEntries(KINDS.map((k) => [k.kind, k.label])) as Record<EntityKind, string>;

const COLUMNS: GridColumn<RowResult>[] = [
  { key: 'row', label: 'Dòng', width: '72px', sortValue: (r) => r.rowNumber },
  { key: 'place', label: 'Cơ sở · Lớp', width: 'minmax(160px, 1fr)', sortValue: (r) => `${r.campus} ${r.className}` },
  { key: 'student', label: 'Học sinh', width: 'minmax(150px, 1fr)', sortValue: (r) => r.student },
  { key: 'actions', label: 'Thay đổi', width: 'minmax(260px, 2fr)', sortable: false },
  { key: 'issues', label: 'Lỗi và ghi chú', width: 'minmax(220px, 1.6fr)', sortValue: (r) => r.errors.length },
];

function ActionList({ row }: { row: RowResult }) {
  if (row.actions.length === 0) return row.errors.length > 0 ? null : <span className="text-sm text-muted">Đã có ở dòng trước</span>;
  return (
    <ul className="flex flex-col gap-1">
      {row.actions.map((a, i) => (
        <li key={i} className="flex min-w-0 items-center gap-2 text-sm text-ink-2">
          <Pill tone={ACTION_PILL[a.action].tone}>{ACTION_PILL[a.action].label}</Pill>
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {KIND_LABEL[a.kind]}: {a.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Issues({ row }: { row: RowResult }) {
  if (row.errors.length === 0 && row.notes.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {row.errors.map((e, i) => (
        <Alert key={`e${i}`} inline>
          {e}
        </Alert>
      ))}
      {row.notes.map((n, i) => (
        <p key={`n${i}`} className="text-sm text-muted">
          {n}
        </p>
      ))}
    </div>
  );
}

function SummaryCards({ summary }: { summary: ImportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 min-[768px]:grid-cols-3 min-[1200px]:grid-cols-6">
      {KINDS.map(({ kind, label }) => {
        const s = summary[kind];
        return (
          <Card key={kind} as="section" aria-label={label}>
            <b className="text-sm font-normal text-ink-2">{label}</b>
            <dl className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-0.5 text-sm">
              <dt className="text-muted">Thêm</dt>
              <dd className="font-semibold text-ink">{s.create}</dd>
              <dt className="text-muted">Cập nhật</dt>
              <dd className="font-semibold text-ink">{s.update}</dd>
              <dt className="text-muted">Giữ nguyên</dt>
              <dd className="font-semibold text-ink">{s.same}</dd>
            </dl>
          </Card>
        );
      })}
    </div>
  );
}

// Nhập dữ liệu từ Excel: tải file mẫu, chọn file, xem trước từng dòng, rồi nhập. Xem trước không ghi gì.
export function ImportView() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [pending, startTransition] = useTransition();

  function formOf(f: File): FormData {
    const data = new FormData();
    data.set('file', f);
    return data;
  }

  function runPreview(f: File) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const r = await previewImportAction(formOf(f));
      if (!r.ok) {
        setPreview(null);
        setError(r.message);
        return;
      }
      setPreview(r);
      setOnlyErrors(r.errorCount > 0);
    });
  }

  function choose(f: File | undefined) {
    setFile(f ?? null);
    setPreview(null);
    if (f) runPreview(f);
  }

  function commit() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const r = await commitImportAction(formOf(file));
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setDone(r.message);
      setPreview(null);
      setFile(null);
      setInputKey((k) => k + 1);
      router.refresh();
    });
  }

  const rows = preview ? (onlyErrors ? preview.rows.filter((r) => r.errors.length > 0) : preview.rows) : [];
  const canCommit = !!preview && preview.errorCount === 0 && !pending;

  return (
    <div className="flex flex-col gap-4">
      <Panel title="1. Tải file mẫu">
        <div className="flex flex-col gap-3">
          <p className="text-base text-ink-2">
            Mỗi dòng là một học sinh, kèm cơ sở, lớp, giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài và một phụ huynh. Dòng chỉ có lớp (bỏ trống phần học sinh) thì chỉ tạo hoặc cập nhật lớp. Rê chuột vào tiêu đề cột trong Excel để xem cách ghi.
          </p>
          <p className="text-sm text-muted">
            Bản ghi đã có thì cập nhật, chưa có thì thêm. Cơ sở và lớp nhận theo tên; giáo viên và phụ huynh theo số điện thoại; học sinh theo mã HS, không có mã thì theo họ tên và ngày sinh. Ô trống giữ giá trị cũ. Không xoá bản ghi nào.
          </p>
          <div>
            <a href="/api/nhap-du-lieu/mau" download className={`${BTN_BASE} ${BTN_GHOST}`}>
              <Download className="size-4" aria-hidden />
              Tải file mẫu
            </a>
          </div>
        </div>
      </Panel>

      <Panel title="2. Chọn file và xem trước">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <FileInput key={inputKey} label="File Excel cần nhập" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={pending} onFile={choose} />
            {file && (
              <Btn onClick={() => runPreview(file)} disabled={pending}>
                Xem trước lại
              </Btn>
            )}
          </div>
          {pending && <p className="text-sm text-muted">Đang xử lý file…</p>}
          {error && <Alert>{error}</Alert>}
          {done && <Alert tone="ok">{done}</Alert>}
        </div>
      </Panel>

      {preview && (
        <Panel title={`3. Kết quả xem trước · ${preview.fileName}`}>
          <div className="flex flex-col gap-4">
            <SummaryCards summary={preview.summary} />
            {preview.errorCount > 0 ? (
              <Alert>
                Có {preview.errorCount} dòng lỗi. Sửa trong file rồi chọn lại file. Chưa có gì được ghi vào hệ thống.
              </Alert>
            ) : (
              <Alert tone="ok">Không có lỗi. Kiểm tra các thay đổi bên dưới rồi bấm Nhập dữ liệu.</Alert>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <ChipGroup label="Lọc dòng">
                <Chip selected={!onlyErrors} count={preview.rows.length} onClick={() => setOnlyErrors(false)}>
                  Tất cả
                </Chip>
                <Chip selected={onlyErrors} count={preview.errorCount} onClick={() => setOnlyErrors(true)}>
                  Có lỗi
                </Chip>
              </ChipGroup>
              <Btn variant="primary" onClick={commit} disabled={!canCommit} className="max-[767px]:w-full">
                <Upload className="size-4" aria-hidden />
                {pending ? 'Đang nhập…' : `Nhập dữ liệu (${preview.rows.length} dòng)`}
              </Btn>
            </div>

            <DataGrid
              label="Xem trước từng dòng"
              columns={COLUMNS}
              rows={rows}
              rowKey={(r) => r.rowNumber}
              from="xl"
              empty={<p className="text-sm text-muted">Không có dòng nào.</p>}
              cell={(r, k) => {
                if (k === 'row') return <span className="text-sm text-ink-2">{r.rowNumber}</span>;
                if (k === 'place') return <span className="text-sm text-ink [overflow-wrap:anywhere]">{r.campus || '—'} · {r.className || '—'}</span>;
                if (k === 'student') return <span className="text-sm text-ink [overflow-wrap:anywhere]">{r.student}</span>;
                if (k === 'actions') return <ActionList row={r} />;
                return <Issues row={r} />;
              }}
              card={(r) => (
                <Card>
                  <b className="text-base font-normal text-ink [overflow-wrap:anywhere]">
                    Dòng {r.rowNumber}
                    {r.student ? ` · ${r.student}` : ''}
                  </b>
                  <small className="block text-sm text-ink-2 [overflow-wrap:anywhere]">
                    {r.campus || '—'} · {r.className || '—'}
                  </small>
                  <ActionList row={r} />
                  <Issues row={r} />
                </Card>
              )}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
