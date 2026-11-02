'use client';

// Chấm bài nói theo mốc thời gian (35.8): nghe bản ghi, bấm "Đánh dấu lỗi" tại giây đang phát, ghi loại lỗi, chữ đúng,
// ghi chú và "nói lại câu này". Bấm mốc giây trong danh sách để nghe lại đúng chỗ đó.
import { PencilIcon, PlayIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import { useRef, useState, useTransition } from 'react';
import { deleteSpeakingMarkAction, saveSpeakingMarkAction } from '@/app/(app)/bai-tap/speaking-actions';
import { formatMs, SPEAKING_ERRORS, type SpeakingErrorType, type SpeakingMark } from '@/lib/speaking';
import { vnDateTimeLabel } from '@/lib/datetime';
import { SelectBox, TextInput } from '@/components-ui';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, inputClass } from '@/components/ui/Field';
import { Alert, Pill } from '@/components/ui/primitives';
import { MiniRecorder } from './MiniRecorder';

type Draft = { id: number | null; atMs: number; errorType: SpeakingErrorType; correctText: string; note: string; redo: boolean; modelFileId: number | null };
const ERROR_OPTIONS = (Object.keys(SPEAKING_ERRORS) as SpeakingErrorType[]).map((k) => ({ value: k, label: SPEAKING_ERRORS[k] }));

export function SpeakingMarks({
  assignmentId,
  studentId,
  itemId,
  position,
  fileId,
  marks,
  canManage,
  onChange,
  previous,
}: {
  assignmentId: number;
  studentId: number;
  itemId: number;
  position: number;
  fileId: number;
  marks: SpeakingMark[];
  canManage: boolean;
  onChange: (marks: SpeakingMark[], message: string) => void;
  previous: { fileId: number; redoneAt: Date | null } | null; // học sinh đã nói lại (35.10): bản cũ nghe cạnh bản mới
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const oldAudio = useRef<HTMLAudioElement>(null);
  const [nowMs, setNowMs] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<SpeakingMark | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sorted = [...marks].sort((a, b) => a.atMs - b.atMs);

  // Mốc lỗi thuộc bản đã chấm: học sinh đã nói lại thì phát bản cũ
  function seek(ms: number) {
    const el = previous ? oldAudio.current : audio.current;
    if (!el) return;
    el.currentTime = ms / 1000;
    void el.play().catch(() => undefined);
  }

  function startAdd() {
    audio.current?.pause();
    setError(null);
    setDraft({ id: null, atMs: Math.round((audio.current?.currentTime ?? 0) * 1000), errorType: 'final_sound', correctText: '', note: '', redo: false, modelFileId: null });
  }

  function save() {
    if (!draft) return;
    const { id, ...input } = draft;
    startTransition(async () => {
      const r = await saveSpeakingMarkAction(assignmentId, studentId, itemId, input, id);
      if (!r.ok || !r.mark) return setError(r.message ?? 'Không lưu được');
      const next = id ? marks.map((m) => (m.id === id ? r.mark! : m)) : [...marks, r.mark];
      setDraft(null);
      setError(null);
      onChange(next, r.message ?? 'Đã lưu');
    });
  }

  function remove(mark: SpeakingMark) {
    startTransition(async () => {
      const r = await deleteSpeakingMarkAction(assignmentId, studentId, mark.id);
      setToDelete(null);
      if (!r.ok) return setError(r.message ?? 'Không xoá được');
      onChange(
        marks.filter((m) => m.id !== mark.id),
        r.message ?? 'Đã xoá',
      );
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {previous && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-normal text-[var(--fgColor-muted)]">Bản cũ (lần chấm trước, các mốc lỗi bên dưới thuộc bản này)</span>
          <audio ref={oldAudio} controls preload="metadata" src={`/api/files/${previous.fileId}`} aria-label={`Bản nói cũ câu ${position}`} className="w-full" />
        </div>
      )}
      <span className="flex flex-wrap items-center gap-2 text-sm font-normal text-[var(--fgColor-muted)]">
        {previous ? 'Bản nói lại' : 'Bài nói của học sinh'}
        {previous && <Pill tone="mint">Đã nói lại{previous.redoneAt ? ` ${vnDateTimeLabel(new Date(previous.redoneAt))}` : ''}</Pill>}
      </span>
      <audio
        ref={audio}
        controls
        preload="metadata"
        src={`/api/files/${fileId}`}
        onTimeUpdate={(e) => setNowMs(Math.round(e.currentTarget.currentTime * 1000))}
        aria-label={`Bài nói câu ${position}`}
        className="w-full"
      />

      <div className="flex flex-col gap-2 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <b className="text-sm font-semibold text-[var(--fgColor-default)]">Lỗi đã đánh dấu ({marks.length})</b>
          {canManage && !draft && (
            <Btn leadingVisual={PlusIcon} onClick={startAdd} disabled={pending}>
              Đánh dấu lỗi tại {formatMs(nowMs)}
            </Btn>
          )}
        </div>

        {sorted.length === 0 && !draft && <p className="text-sm text-[var(--fgColor-muted)]">Nghe bản ghi, dừng ở chỗ học sinh nói sai rồi bấm Đánh dấu lỗi.</p>}

        {sorted.length > 0 && (
          <ul className="flex flex-col divide-y divide-[var(--borderColor-muted)]" aria-label={`Lỗi đã đánh dấu câu ${position}`}>
            {sorted.map((m) => (
              <li key={m.id} className="flex items-start gap-2.5 py-2">
                <button
                  type="button"
                  onClick={() => seek(m.atMs)}
                  aria-label={`Nghe lại từ ${formatMs(m.atMs)}`}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2.5 text-sm tabular-nums text-[var(--fgColor-accent)] hover:bg-[var(--bgColor-muted)]"
                >
                  <PlayIcon size={12} aria-hidden />
                  {formatMs(m.atMs)}
                </button>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-[var(--fgColor-default)]">{SPEAKING_ERRORS[m.errorType]}</span>
                  {m.correctText && <span className="text-[var(--fgColor-muted)]"> · nói đúng: “{m.correctText}”</span>}
                  {m.note && <span className="block text-[var(--fgColor-muted)]">{m.note}</span>}
                  {m.modelFileId !== null && <audio controls preload="none" src={`/api/files/${m.modelFileId}`} aria-label={`Giọng mẫu lỗi tại ${formatMs(m.atMs)}`} className="mt-1 h-[var(--ctl-h)] max-w-full" />}
                  {m.redo && (
                    <span className="mt-1 block">
                      <Pill tone="butter">Nói lại câu này</Pill>
                    </span>
                  )}
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1.5">
                    <ActIcon label={`Sửa lỗi tại ${formatMs(m.atMs)}`} icon={PencilIcon} onClick={() => setDraft({ ...m })} disabled={pending} />
                    <ActIcon label={`Xoá lỗi tại ${formatMs(m.atMs)}`} danger icon={TrashIcon} onClick={() => setToDelete(m)} disabled={pending} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {draft && (
          <div className="grid grid-cols-1 gap-2.5 border-t border-[var(--borderColor-default)] pt-2.5 min-[768px]:grid-cols-2" role="group" aria-label={draft.id ? 'Sửa lỗi' : 'Thêm lỗi'}>
            <Field label="Mốc thời gian">
              <div className="flex items-center gap-2">
                <span className={`${inputClass()} flex items-center tabular-nums`}>{formatMs(draft.atMs)}</span>
                <Btn onClick={() => setDraft({ ...draft, atMs: nowMs })}>Lấy giờ đang phát</Btn>
              </div>
            </Field>
            <Field label="Loại lỗi *">
              <SelectBox
                label="Loại lỗi"
                block
                value={draft.errorType}
                onChange={(v) => setDraft({ ...draft, errorType: v as SpeakingErrorType })}
                options={ERROR_OPTIONS}
              />
            </Field>
            <Field label="Nói đúng là">
              <TextInput
                value={draft.correctText}
                onChange={(e) => setDraft({ ...draft, correctText: e.target.value.slice(0, 200) })}
                maxLength={200}
                placeholder="VD: three /θriː/"
                aria-label="Nói đúng là"
                block
              />
            </Field>
            <Field label="Ghi chú">
              <TextInput
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value.slice(0, 300) })}
                maxLength={300}
                placeholder="VD: đặt lưỡi giữa hai hàm răng"
                aria-label="Ghi chú lỗi"
                block
              />
            </Field>
            <div className="col-span-full">
              <MiniRecorder fileId={draft.modelFileId} label="Ghi giọng mẫu" disabled={pending} onChange={(fileId) => setDraft({ ...draft, modelFileId: fileId })} />
            </div>
            <label className="col-span-full flex items-center gap-2.5 text-sm text-[var(--fgColor-muted)]">
              <input type="checkbox" checked={draft.redo} onChange={(e) => setDraft({ ...draft, redo: e.target.checked })} className="size-4 accent-[var(--control-checked-bgColor-rest,var(--fgColor-accent))]" />
              Cần nói lại câu này
            </label>
            <div className="col-span-full flex justify-end gap-2">
              <Btn onClick={() => setDraft(null)} disabled={pending}>Huỷ</Btn>
              <Btn variant="primary" onClick={save} disabled={pending}>{pending ? 'Đang lưu…' : draft.id ? 'Lưu thay đổi' : 'Thêm lỗi'}</Btn>
            </div>
          </div>
        )}

        {error && <Alert inline>{error}</Alert>}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Xoá lỗi đã đánh dấu?"
        text={toDelete ? `Lỗi "${SPEAKING_ERRORS[toDelete.errorType]}" tại ${formatMs(toDelete.atMs)}.` : ''}
        confirmLabel="Xoá lỗi"
        pending={pending}
        onConfirm={() => toDelete && remove(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
