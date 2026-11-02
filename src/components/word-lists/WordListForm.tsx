'use client';

// Form danh sách từ (35.14): tên, lớp hoặc bài giảng (không bắt buộc), các từ (từ, nghĩa, emoji, tranh, âm thanh).
// Gõ từng từ, hoặc lấy từ kho từ vựng theo trình độ và chủ đề (VocabPicker). Từ lấy từ kho được chép vào danh sách.
import { BookIcon, ImageIcon, PlusIcon, UnmuteIcon, XIcon } from '@primer/octicons-react';
import { useState, useTransition, type ReactNode } from 'react';
import { createWordListAction, updateWordListAction } from '@/app/(app)/tu-vung/actions';
import { levelParams } from '@/lib/level-params';
import type { VocabWord } from '@/lib/queries/vocab';
import type { WordListItem } from '@/lib/queries/word-lists';
import { uploadAsStaff } from '@/lib/upload-client';
import { AUDIO_ACCEPT, IMAGE_ACCEPT } from '@/lib/upload-types';
import { ComboBox, TextInput } from '@/components-ui';
import { VocabPicker } from '@/components/assignments/VocabPicker';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Alert } from '@/components/ui/primitives';

type Row = WordListItem & { key: number };
let nextKey = 1;
const blank = (): Row => ({ key: nextKey++, word: '', meaningVi: '', emoji: '', sentence: '', imageFileId: null, audioFileId: null, vocabItemId: null });

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
    const items = rows.filter((r) => r.word.trim() !== '').map((r) => ({ word: r.word, meaningVi: r.meaningVi, emoji: r.emoji, sentence: r.sentence, imageFileId: r.imageFileId, audioFileId: r.audioFileId, vocabItemId: r.vocabItemId }));
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
      className="flex flex-col gap-4"
    >
      {error && <Alert>{error}</Alert>}

      <FormSection
        title="Thông tin danh sách"
        description="Tên bộ từ và lớp học hoặc bài giảng gắn kèm (nếu có)"
        grid
      >
        <div className="min-[640px]:col-span-2">
          <Field label="Tên danh sách *">
            <TextInput
              aria-label="Tên danh sách *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Starters Unit 3 · Animals"
              autoComplete="off"
              block
            />
          </Field>
        </div>
        <Field label="Lớp" hint="Không bắt buộc">
          <ComboBox
            label="Lớp của danh sách"
            block
            value={classId}
            onChange={setClassId}
            options={[{ value: '', label: 'Không gắn lớp' }, ...classes.map((c) => ({ value: String(c.id), label: c.name }))]}
          />
        </Field>
        <Field label="Bài giảng" hint="Không bắt buộc">
          <ComboBox
            label="Bài giảng của danh sách"
            block
            value={lessonId}
            onChange={setLessonId}
            options={[{ value: '', label: 'Không gắn bài giảng' }, ...lessons.map((l) => ({ value: String(l.id), label: l.title }))]}
          />
        </Field>
      </FormSection>

      <section className="overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <b className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--fgColor-muted)]">
              Các từ
            </b>
            <span className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-0.5 font-mono text-xs tabular-nums text-[var(--fgColor-default)]">
              {rows.filter((r) => r.word.trim()).length}
            </span>
          </div>
          <Btn leadingVisual={BookIcon} onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
            {picking ? 'Ẩn kho từ vựng' : 'Lấy từ kho từ vựng'}
          </Btn>
        </header>

        {picking && (
          <div className="border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]/40 p-3.5">
            <VocabPicker level={level} onLevel={(code) => setLevel(levelParams(code))} picked={pickedWords} onToggle={toggleVocab} onPickMany={(ws) => ws.forEach(toggleVocab)} />
          </div>
        )}

        <div className="flex flex-col gap-3 p-3.5">
          <ol className="flex flex-col gap-2.5" aria-label="Các từ trong danh sách">
            {rows.map((r, idx) => (
              <li
                key={r.key}
                className="flex flex-col gap-2 rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3 transition-colors hover:border-[var(--borderColor-accent-emphasis)]/50"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 min-[640px]:grid-cols-[auto_minmax(0,1.2fr)_minmax(0,1.2fr)_4.5rem_auto]">
                  <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-[var(--borderRadius-medium)] bg-[var(--primary-soft)] px-1.5 font-mono text-xs tabular-nums text-[var(--primary-deep)]">
                    #{idx + 1}
                  </span>
                  <TextInput
                    value={r.word}
                    onChange={(e) => patch(r.key, { word: e.target.value })}
                    placeholder="Từ tiếng Anh"
                    aria-label={`Từ ${idx + 1}`}
                    autoComplete="off"
                    block
                    className="!min-w-0"
                  />
                  <ActIcon
                    label={`Bỏ từ ${idx + 1}`}
                    icon={XIcon}
                    danger
                    onClick={() => remove(r.key)}
                    className="min-[640px]:order-last"
                  />
                  <TextInput
                    value={r.meaningVi}
                    onChange={(e) => patch(r.key, { meaningVi: e.target.value })}
                    placeholder="Nghĩa tiếng Việt"
                    aria-label={`Nghĩa từ ${idx + 1}`}
                    autoComplete="off"
                    block
                    className="!min-w-0 max-[639px]:col-span-2"
                  />
                  <TextInput
                    value={r.emoji}
                    onChange={(e) => patch(r.key, { emoji: e.target.value })}
                    placeholder="Emoji"
                    aria-label={`Emoji từ ${idx + 1}`}
                    autoComplete="off"
                    block
                    className="!min-w-0 [&_input]:text-center"
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 min-[640px]:grid-cols-[minmax(0,1fr)_auto_auto] min-[640px]:items-center">
                  <TextInput
                    value={r.sentence}
                    onChange={(e) => patch(r.key, { sentence: e.target.value })}
                    placeholder="Câu mẫu (cho trò Xây câu), VD: The cat is on the mat."
                    aria-label={`Câu mẫu từ ${idx + 1}`}
                    autoComplete="off"
                    block
                    className="!min-w-0"
                  />
                  <div className="flex flex-wrap items-center gap-2 min-[640px]:contents">
                    <div className="min-w-0 max-[639px]:flex-1">
                      {r.imageFileId ? (
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh do giáo viên tải lên, phục vụ qua /api/files */}
                          <img src={`/api/files/${r.imageFileId}`} alt={`Tranh từ ${r.word}`} className="size-[var(--ctl-h)] rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] object-cover" />
                          <button type="button" data-link="true" onClick={() => patch(r.key, { imageFileId: null })} className="text-xs text-blush-ink underline underline-offset-2">Bỏ tranh</button>
                        </div>
                      ) : (
                        <UploadChip label={`Tranh từ ${idx + 1}`} text="Tranh" icon={<ImageIcon size={16} aria-hidden />} accept={IMAGE_ACCEPT} disabled={uploading} onFile={(f) => upload(r.key, 'imageFileId', f)} />
                      )}
                    </div>
                    <div className="min-w-0 max-[639px]:flex-1">
                      {r.audioFileId ? (
                        <div className="flex items-center gap-2">
                          <audio controls preload="none" src={`/api/files/${r.audioFileId}`} aria-label={`Âm thanh từ ${r.word}`} className="h-[var(--ctl-h)] min-w-0 max-w-[180px] flex-1" />
                          <button type="button" data-link="true" onClick={() => patch(r.key, { audioFileId: null })} className="shrink-0 text-xs text-blush-ink underline underline-offset-2">Bỏ</button>
                        </div>
                      ) : (
                        <UploadChip label={`Âm thanh từ ${idx + 1}`} text="Âm thanh" icon={<UnmuteIcon size={16} aria-hidden />} accept={AUDIO_ACCEPT} disabled={uploading} onFile={(f) => upload(r.key, 'audioFileId', f)} />
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <Btn leadingVisual={PlusIcon} onClick={() => setRows((all) => [...all, blank()])} className="self-start">
            Thêm từ
          </Btn>
        </div>
      </section>

      <FormFooter>
        <Btn onClick={onCancel}>Huỷ</Btn>
        <Btn type="submit" variant="primary" loading={saving} disabled={saving || uploading}>{saving ? 'Đang lưu…' : mode === 'edit' ? 'Lưu thay đổi' : 'Lưu danh sách'}</Btn>
      </FormFooter>
    </form>
  );
}

// Nút tải tệp có chữ (thay ô chọn tệp mặc định của trình duyệt, vốn hiện chữ tiếng Anh và không rõ là tệp gì)
function UploadChip({ label, text, icon, accept, disabled, onFile }: { label: string; text: string; icon: ReactNode; accept: string; disabled?: boolean; onFile: (file: File | undefined) => void }) {
  return (
    <label className={`${BTN_BASE} ${BTN_GHOST} w-full cursor-pointer ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      <input type="file" accept={accept} aria-label={label} disabled={disabled} onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" />
      {icon}
      {text}
    </label>
  );
}
