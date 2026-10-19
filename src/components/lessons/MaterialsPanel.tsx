'use client';

import { Link2, Paperclip, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { deleteMaterialAction, saveMaterialAction, attachDriveMaterialAction } from '@/app/(app)/bai-giang/actions';
import { uploadFileAction } from '@/app/(app)/bai-tap/question-actions';
import type { LessonRow } from '@/lib/queries/lessons';
import { MATERIAL_KIND_LABELS } from '@/lib/validation/lesson';

type UiMaterialKind = 'link' | 'file' | 'drive';
const UI_MATERIAL_OPTIONS: { value: UiMaterialKind; label: string }[] = [
  { value: 'link', label: 'Liên kết' },
  { value: 'file', label: 'Tệp tải lên (Supabase)' },
  { value: 'drive', label: 'Google Drive (Tệp lớn / Video)' },
];
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, inputClass, FileInput } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';
import { UPLOAD_ACCEPT } from '@/lib/upload-types';

// Các loại tệp được tải lên làm tài liệu. Khớp với danh sách máy chủ kiểm khi tải lên.
// Tài liệu của một bài giảng: danh sách liên kết và tệp, thêm và xoá (có xác nhận)
export function MaterialsPanel({ lesson, canManage, onChanged }: { lesson: LessonRow; canManage: boolean; onChanged: (message: string) => void }) {
  const [kind, setKind] = useState<UiMaterialKind>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [driveInput, setDriveInput] = useState('');
  const [fileId, setFileId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<LessonRow['materials'][number] | null>(null);
  const [pending, startTransition] = useTransition();

  function resetForm() {
    setTitle('');
    setUrl('');
    setDriveInput('');
    setFileId(null);
    setFileName(null);
  }

  function uploadFile(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const r = await uploadFileAction(fd);
      if (!r.ok) return setError(r.message);
      setFileId(r.fileId);
      setFileName(r.name);
      // Tên do giáo viên đã gõ trong lúc tải lên thì giữ nguyên; chỉ điền tên tệp khi ô còn trống
      setTitle((prev) => (prev.trim() === '' ? r.name : prev));
      setError(null);
    });
  }

  function add() {
    startTransition(async () => {
      if (kind === 'drive') {
        const r = await attachDriveMaterialAction(lesson.id, { title, driveUrlOrId: driveInput });
        if (!r.ok) return setError(r.message ?? 'Không thêm được tài liệu Google Drive');
        setError(null);
        resetForm();
        onChanged(r.message ?? 'Đã thêm tài liệu từ Google Drive');
        return;
      }

      const r = await saveMaterialAction(lesson.id, { kind, title, url, fileId });
      if (!r.ok) return setError(r.message ?? 'Không thêm được tài liệu');
      setError(null);
      resetForm();
      onChanged(r.message ?? 'Đã thêm tài liệu');
    });
  }

  function confirmDelete() {
    if (!toDelete) return;
    const id = toDelete.id;
    startTransition(async () => {
      const r = await deleteMaterialAction(id);
      setToDelete(null);
      onChanged(r.message ?? (r.ok ? 'Đã xoá tài liệu' : 'Không xoá được'));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert>
          {error}
        </Alert>
      )}

      {lesson.materials.length === 0 ? (
        <Notice>Bài giảng chưa có tài liệu.</Notice>
      ) : (
        <ul className="flex flex-col gap-2">
          {lesson.materials.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-ctl)] border border-line px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {m.kind === 'link' ? <Link2 className="size-4 shrink-0 text-muted" aria-hidden /> : <Paperclip className="size-4 shrink-0 text-muted" aria-hidden />}
                <div className="min-w-0">
                  {m.kind === 'link' ? (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="block truncate text-base font-normal text-link underline underline-offset-2">
                      {m.title}
                    </a>
                  ) : (
                    <a href={`/api/files/${m.fileId}`} target="_blank" rel="noopener" data-link="true" className="block truncate text-base font-normal text-link underline underline-offset-2">
                      {m.title}
                    </a>
                  )}
                  <small className="block truncate text-sm text-muted">
                    {MATERIAL_KIND_LABELS[m.kind]}
                    {m.kind === 'file' && m.fileName ? ` · ${m.fileName}` : ''}
                  </small>
                </div>
              </div>
              {canManage && (
                <ActIcon label={`Xoá tài liệu ${m.title}`} danger onClick={() => setToDelete(m)} disabled={pending}>
                  <Trash2 className="size-4" aria-hidden />
                </ActIcon>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line p-3.5">
          <b className="text-base text-ink">Thêm tài liệu</b>
          <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2">
            <Field label="Loại tài liệu">
              <SelectPanel
                label="Loại tài liệu"
                value={kind}
                onChange={(v) => setKind(v as UiMaterialKind)}
                options={UI_MATERIAL_OPTIONS}
                block
              />
            </Field>
            <Field label={kind === 'drive' ? 'Tên tài liệu (tuỳ chọn)' : 'Tên tài liệu *'}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === 'drive' ? 'Để trống sẽ lấy tên từ Google Drive' : 'VD: Slide buổi 3'}
                aria-label="Tên tài liệu"
                className={inputClass()}
              />
            </Field>
          </div>

          {kind === 'link' && (
            <Field label="Liên kết *" hint="Bắt đầu bằng https://">
              <input
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://"
                aria-label="Liên kết tài liệu"
                className={inputClass()}
              />
            </Field>
          )}

          {kind === 'drive' && (
            <Field
              label="Liên kết hoặc ID tệp Google Drive *"
              hint="Dành cho video bài giảng hoặc tài liệu lớn (sách PDF, audio nặng) trên Google Drive của trung tâm. Học sinh xem trực tiếp qua app với quyền bảo mật của lớp."
            >
              <input
                value={driveInput}
                onChange={(e) => setDriveInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/... hoặc mã tệp Drive"
                aria-label="Liên kết hoặc ID tệp Google Drive"
                className={inputClass()}
              />
            </Field>
          )}

          {kind === 'file' && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-normal text-ink-2">Tệp *</span>
              {fileId !== null ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                  <Paperclip className="size-4 text-muted" aria-hidden />
                  {fileName}
                </span>
              ) : (
                <FileInput label="Tải tệp tài liệu" accept={UPLOAD_ACCEPT} disabled={pending} onFile={(file) => uploadFile(file)} />
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Btn variant="primary" onClick={add} disabled={pending} className="max-[767px]:w-full">
              {pending ? 'Đang lưu…' : 'Thêm tài liệu'}
            </Btn>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá tài liệu này?"
        text={toDelete ? `Tài liệu "${toDelete.title}" sẽ bị gỡ khỏi bài giảng. Tệp gốc vẫn còn trên máy chủ cho đến khi dọn tệp.` : ''}
        confirmLabel="Xoá tài liệu"
        pending={pending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
