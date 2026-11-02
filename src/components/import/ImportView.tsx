'use client';

import { CheckCircleIcon, DownloadIcon, FileIcon, SyncIcon, UploadIcon } from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type DragEvent } from 'react';
import { commitImportAction, previewImportAction, type PreviewResponse } from '@/app/(app)/nhap-du-lieu/actions';
import { Steps } from '@/components-ui';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { DataGrid, type GridColumn } from '@/components/ui/datagrid';
import { FileInput } from '@/components/ui/Field';
import { Alert, Pill, type Tone } from '@/components/ui/primitives';
import { Card, Panel } from '@/components/ui/surfaces';
import type { Action, EntityKind, ImportSummary, RowResult } from '@/lib/import/plan';

type Preview = Extract<PreviewResponse, { ok: true }>;

const KINDS: { kind: EntityKind; label: string; accent: string }[] = [
  { kind: 'campus', label: 'Cơ sở', accent: 'border-l-[var(--primary)]' },
  { kind: 'teacher', label: 'Giáo viên', accent: 'border-l-[#2a78d6]' },
  { kind: 'class', label: 'Lớp', accent: 'border-l-[#1baf7a]' },
  { kind: 'student', label: 'Học sinh', accent: 'border-l-[#eb6834]' },
  { kind: 'parent', label: 'Phụ huynh', accent: 'border-l-[#8250df]' },
  { kind: 'link', label: 'Liên kết phụ huynh', accent: 'border-l-[#2a78d6]' },
];
const ACTION_PILL: Record<Action, { label: string; tone: Tone }> = {
  create: { label: 'Thêm', tone: 'mint' },
  update: { label: 'Cập nhật', tone: 'butter' },
  same: { label: 'Giữ nguyên', tone: 'stone' },
};
const KIND_LABEL: Record<EntityKind, string> = Object.fromEntries(KINDS.map((k) => [k.kind, k.label])) as Record<EntityKind, string>;

const COLUMNS: GridColumn<RowResult>[] = [
  { key: 'row', label: 'Dòng', width: '64px', sortValue: (r) => r.rowNumber },
  { key: 'place', label: 'Cơ sở · Lớp', width: 'minmax(160px, 1fr)', sortValue: (r) => `${r.campus} ${r.className}` },
  { key: 'student', label: 'Học sinh', width: 'minmax(150px, 1fr)', sortValue: (r) => r.student },
  { key: 'actions', label: 'Thay đổi', width: 'minmax(260px, 2fr)', sortable: false },
  { key: 'issues', label: 'Lỗi và ghi chú', width: 'minmax(220px, 1.6fr)', sortValue: (r) => r.errors.length },
];

function ActionList({ row }: { row: RowResult }) {
  if (row.actions.length === 0)
    return row.errors.length > 0 ? null : <span className="text-sm text-[var(--fgColor-muted)]">Đã có ở dòng trước</span>;
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {row.actions.map((a, i) => (
        <li key={i} className="flex min-w-0 items-center gap-2 text-sm text-[var(--fgColor-default)]">
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
        <p key={`n${i}`} className="m-0 text-xs text-[var(--fgColor-muted)]">
          {n}
        </p>
      ))}
    </div>
  );
}

// Lưu ý giữ <section aria-label={label}> và <dt>Thêm</dt><dd>{s.create}</dd> liền kề để E2E kiểm textContent "Thêm2" khớp chính xác
function SummaryCards({ summary }: { summary: ImportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-3 min-[1200px]:grid-cols-6">
      {KINDS.map(({ kind, label, accent }) => {
        const s = summary[kind];
        return (
          <Card key={kind} as="section" aria-label={label} className={`!gap-2 border-l-[3px] ${accent} !p-3`}>
            <b className="text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">{label}</b>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 text-xs">
              <dt className="border-b border-dashed border-[var(--borderColor-muted)] pb-1 text-[var(--fgColor-muted)]">Thêm</dt>
              <dd className="m-0 border-b border-dashed border-[var(--borderColor-muted)] pb-1 font-semibold tabular-nums text-[#1baf7a]">{s.create}</dd>
              <dt className="border-b border-dashed border-[var(--borderColor-muted)] pb-1 text-[var(--fgColor-muted)]">Cập nhật</dt>
              <dd className="m-0 border-b border-dashed border-[var(--borderColor-muted)] pb-1 font-semibold tabular-nums text-[#eb6834]">{s.update}</dd>
              <dt className="text-[var(--fgColor-muted)]">Giữ nguyên</dt>
              <dd className="m-0 font-semibold tabular-nums text-[var(--fgColor-default)]">{s.same}</dd>
            </dl>
          </Card>
        );
      })}
    </div>
  );
}

// Nhập dữ liệu từ Excel chuẩn 01. TSUKUBA: thang bước tiến trình + khung kéo thả nét đứt + bảng xem trước từng dòng.
export function ImportView() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
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

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (pending) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) choose(dropped);
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
    <div className="tsukuba-rise flex flex-col gap-4">
      <Panel>
        <Steps
          steps={[
            { id: 1, name: 'Tải file mẫu', is_active: !file && !done },
            { id: 2, name: 'Xem trước & kiểm tra', is_active: !!file && !done },
            { id: 3, name: 'Hoàn tất nhập', is_active: !!done },
          ]}
        />
      </Panel>

      <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-2">
        <Panel title="1. Tải file mẫu" action={<Pill tone="stone">Excel .xlsx</Pill>}>
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm leading-relaxed text-[var(--fgColor-default)]">
              Mỗi dòng là một học sinh, kèm cơ sở, lớp, giáo viên chủ nhiệm, trợ giảng, giáo viên nước ngoài và một phụ huynh. Dòng chỉ có lớp (bỏ trống phần học sinh) sẽ chỉ tạo hoặc cập nhật lớp.
            </p>
            <ul className="m-0 flex list-none flex-col gap-1.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/60 px-3 py-2.5 text-xs text-[var(--fgColor-muted)]">
              <li className="flex items-start gap-2">
                <CheckCircleIcon size={14} className="mt-0.5 shrink-0 text-[#1baf7a]" aria-hidden />
                <span>Cơ sở & lớp đối chiếu theo tên; giáo viên & phụ huynh đối chiếu theo số điện thoại.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircleIcon size={14} className="mt-0.5 shrink-0 text-[#1baf7a]" aria-hidden />
                <span>Học sinh nhận theo mã HS (hoặc họ tên + ngày sinh). Ô trống giữ nguyên dữ liệu cũ, không xoá bản ghi.</span>
              </li>
            </ul>
            <div>
              <a href="/api/nhap-du-lieu/mau" download className={`${BTN_BASE} ${BTN_GHOST}`}>
                <DownloadIcon size={16} aria-hidden />
                <span>Tải file mẫu</span>
              </a>
            </div>
          </div>
        </Panel>

        <Panel
          title="2. Chọn file và xem trước"
          action={
            file ? (
              <Pill tone="lav">{file.name}</Pill>
            ) : (
              <Pill tone="stone">Chưa chọn tệp</Pill>
            )
          }
        >
          <div className="flex flex-col gap-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!pending) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-start gap-3 rounded-[var(--borderRadius-large)] border-2 border-dashed p-4 transition-colors ${
                dragging
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)]/35'
                  : 'border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/50 hover:border-[var(--primary)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-[var(--borderRadius-medium)] bg-[var(--primary-soft)] text-[var(--primary)]">
                  {file ? <FileIcon size={16} aria-hidden /> : <UploadIcon size={16} aria-hidden />}
                </span>
                <div className="min-w-0">
                  <b className="block text-sm font-medium text-[var(--fgColor-default)]">
                    {file ? file.name : 'Kéo thả file .xlsx vào đây hoặc bấm chọn tệp'}
                  </b>
                  <small className="block text-xs text-[var(--fgColor-muted)]">
                    Bước xem trước chỉ kiểm tra hợp lệ, chưa ghi bất kỳ thay đổi nào vào cơ sở dữ liệu.
                  </small>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <FileInput
                  key={inputKey}
                  label="File Excel cần nhập"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={pending}
                  onFile={choose}
                />
                {file && (
                  <Btn leadingVisual={SyncIcon} onClick={() => runPreview(file)} disabled={pending}>
                    Xem trước lại
                  </Btn>
                )}
              </div>
            </div>

            {pending && <p className="m-0 text-xs text-[var(--fgColor-muted)]">Đang phân tích và đối chiếu dữ liệu…</p>}
            {error && <Alert>{error}</Alert>}
            {done && <Alert tone="ok">{done}</Alert>}
          </div>
        </Panel>
      </div>

      {preview && (
        <Panel
          title={`3. Kết quả xem trước · ${preview.fileName}`}
          action={
            preview.errorCount > 0 ? (
              <Pill tone="blush">{preview.errorCount} dòng lỗi</Pill>
            ) : (
              <Pill tone="mint">Sẵn sàng nhập ({preview.rows.length} dòng)</Pill>
            )
          }
          className="tsukuba-rise"
        >
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
              <Btn
                variant="primary"
                leadingVisual={UploadIcon}
                loading={pending}
                onClick={commit}
                disabled={!canCommit}
                className="max-[767px]:w-full"
              >
                {pending ? 'Đang nhập…' : `Nhập dữ liệu (${preview.rows.length} dòng)`}
              </Btn>
            </div>

            <DataGrid
              label="Xem trước từng dòng"
              columns={COLUMNS}
              rows={rows}
              rowKey={(r) => r.rowNumber}
              from="xl"
              fill={false}
              empty={<p className="m-0 text-sm text-[var(--fgColor-muted)]">Không có dòng nào.</p>}
              cell={(r, k) => {
                if (k === 'row')
                  return (
                    <span className="inline-block rounded bg-[var(--bgColor-neutral-muted)] px-1.5 py-0.5 font-mono text-xs tabular-nums text-[var(--fgColor-muted)]">
                      #{r.rowNumber}
                    </span>
                  );
                if (k === 'place')
                  return (
                    <span className="text-sm text-[var(--fgColor-default)] [overflow-wrap:anywhere]">
                      {r.campus || '—'} · {r.className || '—'}
                    </span>
                  );
                if (k === 'student')
                  return <span className="text-sm font-medium text-[var(--fgColor-default)] [overflow-wrap:anywhere]">{r.student}</span>;
                if (k === 'actions') return <ActionList row={r} />;
                return <Issues row={r} />;
              }}
              card={(r) => (
                <Card>
                  <div className="flex items-baseline justify-between gap-2">
                    <b className="text-sm font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">
                      Dòng {r.rowNumber}
                      {r.student ? ` · ${r.student}` : ''}
                    </b>
                  </div>
                  <small className="block text-xs text-[var(--fgColor-muted)] [overflow-wrap:anywhere]">
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
