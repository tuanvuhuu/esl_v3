'use client';

// Form danh sách từ (35.14): tên, lớp hoặc bài giảng (không bắt buộc), các từ (từ, nghĩa, emoji, tranh, âm thanh).
// Gõ từng từ, hoặc lấy từ kho từ vựng theo trình độ và chủ đề (VocabPicker). Từ lấy từ kho được chép vào danh sách.
import { BookOpen, ImagePlus, Plus, Volume2, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { createWordListAction, updateWordListAction } from '@/app/(app)/tu-vung/actions';
import { levelParams } from '@/lib/level-params';
import type { VocabWord } from '@/lib/queries/vocab';
import type { WordListItem } from '@/lib/queries/word-lists';
import { uploadAsStaff } from '@/lib/upload-client';
import { AUDIO_ACCEPT, IMAGE_ACCEPT } from '@/lib/upload-types';
import { VocabPicker } from '@/components/assignments/VocabPicker';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, FormFooter, inputClass } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';
import { SelectPanel } from '@/components/ui/SelectPanel';

type Row = WordListItem & { key: number };
let nextKey = 1;
const blank = (): Row => ({ key: nextKey++, word: '', meaningVi: '', emoji: '', imageFileId: null, audioFileId: null, vocabItemId: null });

export function WordListForm({
  mode,
  listId,
  initial,
  classes,
  lessons,
  onDone,
  onCancel,
}: {
  mode: 'create' | 'edit';
  listId?: number;
  initial?: { name: string; classId: number | null; lessonId: number | null; items: WordListItem[] };
  classes: { id: number; name: string }[];
  lessons: { id: number; title: string }[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [classId, setClassId] = useState(initial?.classId ? String(initial.classId) : '');
  const [lessonId, setLessonId] = useState(initial?.lessonId ? String(initial.lessonId) : '');
  const [rows, setRows] = useState<Row[]>(() => (initial?.items.length ? initial.items.map((i) => ({ ...i, key: nextKey++ })) : [blank(), blank(), blank()]));
  const [picking, setPicking] = useState(false);
  const [level, setLevel] = useState(levelParams('Pre-A1'));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [uploading, startUpload] = useTransition();

  const patch = (key: number, next: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...next } : r)));
  const remove = (key: number) => setRows((all) => all.filter((r) => r.key !== key));

  function upload(key: number, field: 'imageFileId' | 'audioFileId', file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const r = await uploadAsStaff(file);
      if (!r.ok) return setError(r.message);
      setError(null);
      patch(key, { [field]: r.fileId });
    });
  }

  // Bấm một từ trong kho: có rồi thì bỏ, chưa có thì thêm (điền vào dòng trống đầu tiên nếu có)
  function toggleVocab(w: VocabWord) {
    setRows((all) => {
      if (all.some((r) => r.vocabItemId === w.id)) return all.filter((r) => r.vocabItemId !== w.id);
      const row = { word: w.en, meaningVi: w.vi, emoji: w.emoji, vocabItemId: w.id };
      const empty = all.findIndex((r) => !r.word.trim());
      return empty >= 0 ? all.map((r, i) => (i === empty ? { ...r, ...row } : r)) : [...all, { ...blank(), ...row }];
    });
  }

  function save() {
    const items = rows.filter((r) => r.word.trim() !== '').map((r) => ({ word: r.word, meaningVi: r.meaningVi, emoji: r.emoji, imageFileId: r.imageFileId, audioFileId: r.audioFileId, vocabItemId: r.vocabItemId }));
    const input = { name, classId: classId || null, lessonId: lessonId || null, items };
    startSaving(async () => {
      const r = mode === 'edit' && listId ? await updateWordListAction(listId, input) : await createWordListAction(input);
      if (!r.ok) return setError(r.message ?? 'Không lưu được');
      onDone(r.message ?? 'Đã lưu');
    });
  }

  const pickedWords: VocabWord[] = rows
    .filter((r) => r.vocabItemId !== null)
    .map((r) => ({ id: r.vocabItemId!, en: r.word, vi: r.meaningVi, emoji: r.emoji, topic: '', level: level.code, approved: true, source: '' }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
      className="flex flex-col gap-3.5"
    >
      {error && <Alert>{error}</Alert>}
      <div className="grid grid-cols-1 gap-3.5 min-[768px]:grid-cols-3 min-[768px]:gap-x-4">
        <Field label="Tên danh sách *">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Starters Unit 3 · Animals" autoComplete="off" className={inputClass()} />
        </Field>
        <Field label="Lớp" hint="Không bắt buộc">
          <SelectPanel label="Lớp của danh sách" block value={classId} onChange={setClassId} options={[{ value: '', label: 'Không gắn lớp' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]} />
        </Field>
        <Field label="Bài giảng" hint="Không bắt buộc">
          <SelectPanel label="Bài giảng của danh sách" block value={lessonId} onChange={setLessonId} options={[{ value: '', label: 'Không gắn bài giảng' }, ...lessons.map((l) => ({ value: String(l.id), label: l.title }))]} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-base font-extrabold text-ink">Các từ ({rows.filter((r) => r.word.trim()).length})</b>
        <Btn onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
          <BookOpen className="size-4" aria-hidden />
          {picking ? 'Ẩn kho từ vựng' : 'Lấy từ kho từ vựng'}
        </Btn>
      </div>
      {picking && (
        <div className="rounded-[var(--radius-ctl)] border border-line p-3">
          <VocabPicker level={level} onLevel={(code) => setLevel(levelParams(code))} picked={pickedWords} onToggle={toggleVocab} onPickMany={(ws) => ws.forEach(toggleVocab)} />
        </div>
      )}

      <ol className="flex flex-col gap-2.5" aria-label="Các từ trong danh sách">
        {rows.map((r, idx) => (
          <li key={r.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 rounded-[var(--radius-ctl)] border border-line p-2.5 min-[768px]:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_4.5rem_auto_auto_auto] min-[768px]:items-center">
            <input value={r.word} onChange={(e) => patch(r.key, { word: e.target.value })} placeholder="Từ tiếng Anh" aria-label={`Từ ${idx + 1}`} autoComplete="off" className={`${inputClass()} max-[767px]:col-span-3`} />
            <ActIcon label={`Bỏ từ ${idx + 1}`} danger onClick={() => remove(r.key)} className="max-[767px]:col-start-4 max-[767px]:row-start-1 min-[768px]:order-last">
              <X className="size-4" aria-hidden />
            </ActIcon>
            <input value={r.meaningVi} onChange={(e) => patch(r.key, { meaningVi: e.target.value })} placeholder="Nghĩa tiếng Việt" aria-label={`Nghĩa từ ${idx + 1}`} autoComplete="off" className={`${inputClass()} max-[767px]:col-span-4`} />
            <input value={r.emoji} onChange={(e) => patch(r.key, { emoji: e.target.value })} placeholder="🐱" aria-label={`Emoji từ ${idx + 1}`} autoComplete="off" className={`${inputClass()} text-center`} />
            <div className="min-w-0">
              {r.imageFileId ? (
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do giáo viên tải lên, phục vụ qua /api/files */}
                  <img src={`/api/files/${r.imageFileId}`} alt={`Tranh từ ${r.word}`} className="size-[var(--ctl-h)] rounded-[var(--radius-ctl)] object-cover" />
                  <button type="button" onClick={() => patch(r.key, { imageFileId: null })} className="text-sm text-blush-ink underline underline-offset-2">Bỏ tranh</button>
                </div>
              ) : (
                <UploadChip label={`Tranh từ ${idx + 1}`} text="Tranh" icon={<ImagePlus className="size-4" aria-hidden />} accept={IMAGE_ACCEPT} disabled={uploading} onFile={(f) => upload(r.key, 'imageFileId', f)} />
              )}
            </div>
            <div className="min-w-0 max-[767px]:col-span-2">
              {r.audioFileId ? (
                <div className="flex items-center gap-2">
                  <audio controls preload="none" src={`/api/files/${r.audioFileId}`} aria-label={`Âm thanh từ ${r.word}`} className="h-[var(--ctl-h)] min-w-0 flex-1" />
                  <button type="button" onClick={() => patch(r.key, { audioFileId: null })} className="shrink-0 text-sm text-blush-ink underline underline-offset-2">Bỏ</button>
                </div>
              ) : (
                <UploadChip label={`Âm thanh từ ${idx + 1}`} text="Âm thanh" icon={<Volume2 className="size-4" aria-hidden />} accept={AUDIO_ACCEPT} disabled={uploading} onFile={(f) => upload(r.key, 'audioFileId', f)} />
              )}
            </div>
          </li>
        ))}
      </ol>
      <Btn onClick={() => setRows((all) => [...all, blank()])} className="self-start">
        <Plus className="size-4" aria-hidden />
        Thêm từ
      </Btn>

      <FormFooter>
        <button type="button" onClick={onCancel} className={FORM_BTN_CANCEL}>Huỷ</button>
        <button type="submit" disabled={saving || uploading} className={FORM_BTN_SUBMIT}>{saving ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu danh sách'}</button>
      </FormFooter>
    </form>
  );
}

// Nút tải tệp có chữ (thay ô chọn tệp mặc định của trình duyệt, vốn hiện chữ tiếng Anh và không rõ là tệp gì)
function UploadChip({ label, text, icon, accept, disabled, onFile }: { label: string; text: string; icon: React.ReactNode; accept: string; disabled?: boolean; onFile: (file: File | undefined) => void }) {
  return (
    <label className={`${BTN_BASE} ${BTN_GHOST} w-full cursor-pointer ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      <input type="file" accept={accept} aria-label={label} disabled={disabled} onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" />
      {icon}
      {text}
    </label>
  );
}
