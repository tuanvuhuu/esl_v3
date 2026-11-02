'use client';

import {
  ArrowDownIcon,
  ArrowSwitchIcon,
  ArrowUpIcon,
  BookIcon,
  BroadcastIcon,
  EyeClosedIcon,
  EyeIcon,
  ImageIcon,
  LinkIcon,
  ListOrderedIcon,
  NoteIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  SyncIcon,
  TasklistIcon,
  TrashIcon,
  XIcon,
  type Icon,
} from '@primer/octicons-react';
import { useState, useTransition } from 'react';
import { uploadAsStaff } from '@/lib/upload-client';
import {
  CRITERIA_PER_ITEM,
  CRITERION_MAX_DEFAULT,
  CRITERION_MAX_POINTS,
  RUBRIC_PRESETS,
  SKILL_LABELS,
  SKILLS,
  type ItemType,
  type Skill,
} from '@/lib/assignment-scoring';
import { SelectBox, TextAreaAutoHeight, TextInput, TextInputNumber } from '@/components-ui';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { Field, FileInput } from '@/components/ui/Field';
import { Pill } from '@/components/ui/primitives';
import { KaraokeTimingEditor } from './KaraokeTimingEditor';
import { MiniRecorder } from './MiniRecorder';
import { criteriaTotal, MAX_OPTIONS, MAX_PAIRS, newKey, type Draft } from './item-draft';
import { ItemMiniPreview } from './ItemMiniPreview';
import { AUDIO_ACCEPT, IMAGE_ACCEPT } from '@/lib/upload-types';

const EXERCISE_TYPES: { type: ItemType; icon: Icon; title: string; hint: string; defaultSkill: Skill }[] = [
  { type: 'picture_choice', icon: ImageIcon, title: 'Nghe chọn tranh', hint: '3+ · Nghe', defaultSkill: 'listening' },
  { type: 'match', icon: LinkIcon, title: 'Ghép đôi', hint: '5+ · Từ vựng', defaultSkill: 'reading' },
  { type: 'order', icon: ListOrderedIcon, title: 'Sắp xếp câu', hint: '7+ · Ngữ pháp', defaultSkill: 'writing' },
  { type: 'gap_fill', icon: PencilIcon, title: 'Điền chỗ trống', hint: '7+ · Đọc viết', defaultSkill: 'reading' },
  { type: 'speak_repeat', icon: SyncIcon, title: 'Nghe nhắc lại', hint: '3+ · Nói', defaultSkill: 'speaking' },
  { type: 'speak_read', icon: BookIcon, title: 'Đọc to', hint: '6+ · Nói', defaultSkill: 'speaking' },
  { type: 'speak_picture', icon: BroadcastIcon, title: 'Nói về tranh', hint: '8+ · Nói', defaultSkill: 'speaking' },
  { type: 'choice', icon: TasklistIcon, title: 'Trắc nghiệm chữ', hint: 'Mọi lứa tuổi', defaultSkill: 'reading' },
  { type: 'text', icon: NoteIcon, title: 'Trả lời viết', hint: 'Giáo viên chấm', defaultSkill: 'writing' },
  { type: 'file', icon: PaperclipIcon, title: 'Nộp tệp', hint: 'Giáo viên chấm', defaultSkill: 'writing' },
];

export function ItemDraftCard({
  draft: d,
  index,
  pending,
  onChange,
  onError,
  onMove,
  onRemove,
  canMoveUp = true,
  canMoveDown = true,
}: {
  draft: Draft;
  index: number;
  pending: boolean;
  onChange: (update: (d: Draft) => Draft) => void;
  onError: (message: string | null) => void;
  onMove?: (dir: -1 | 1) => void;
  onRemove?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const [uploading, startUpload] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const busy = pending || uploading;

  const patch = (next: Partial<Draft>) => onChange((x) => ({ ...x, ...next }));

  function setItemType(t: ItemType) {
    const meta = EXERCISE_TYPES.find((x) => x.type === t);
    onChange((x) => ({
      ...x,
      itemType: t,
      skill: meta ? meta.defaultSkill : x.skill,
      options:
        t === 'picture_choice' && x.options.length < 4
          ? [
              { key: newKey(), id: null, label: 'cat', isCorrect: true, imageFileId: null, audioFileId: null },
              { key: newKey(), id: null, label: 'dog', isCorrect: false, imageFileId: null, audioFileId: null },
              { key: newKey(), id: null, label: 'bird', isCorrect: false, imageFileId: null, audioFileId: null },
              { key: newKey(), id: null, label: 'fish', isCorrect: false, imageFileId: null, audioFileId: null },
            ]
          : x.options,
      pairs:
        t === 'match' && x.pairs.length === 0
          ? [
              { key: newKey(), id: null, position: 1, leftLabel: 'mother', leftImageFileId: null, rightLabel: 'mẹ', rightImageFileId: null },
              { key: newKey(), id: null, position: 2, leftLabel: 'father', leftImageFileId: null, rightLabel: 'bố', rightImageFileId: null },
              { key: newKey(), id: null, position: 3, leftLabel: 'baby', leftImageFileId: null, rightLabel: 'em bé', rightImageFileId: null },
            ]
          : x.pairs,
    }));
  }

  // Quản lý options
  const patchOption = (optKey: string, next: Partial<Draft['options'][number]>) =>
    onChange((x) => ({ ...x, options: x.options.map((o) => (o.key === optKey ? { ...o, ...next } : o)) }));
  const markCorrect = (optKey: string) => onChange((x) => ({ ...x, options: x.options.map((o) => ({ ...o, isCorrect: o.key === optKey })) }));
  const addOption = () =>
    onChange((x) =>
      x.options.length < MAX_OPTIONS
        ? { ...x, options: [...x.options, { key: newKey(), id: null, label: '', isCorrect: false, imageFileId: null, audioFileId: null }] }
        : x,
    );
  const removeOption = (optKey: string) => onChange((x) => ({ ...x, options: x.options.filter((o) => o.key !== optKey) }));

  // Quản lý pairs
  const patchPair = (pairKey: string, next: Partial<Draft['pairs'][number]>) =>
    onChange((x) => ({ ...x, pairs: x.pairs.map((p) => (p.key === pairKey ? { ...p, ...next } : p)) }));
  const addPair = () =>
    onChange((x) =>
      x.pairs.length < MAX_PAIRS
        ? {
            ...x,
            pairs: [
              ...x.pairs,
              { key: newKey(), id: null, position: x.pairs.length + 1, leftLabel: '', leftImageFileId: null, rightLabel: '', rightImageFileId: null },
            ],
          }
        : x,
    );
  const removePair = (pairKey: string) => onChange((x) => ({ ...x, pairs: x.pairs.filter((p) => p.key !== pairKey) }));

  // Quản lý criteria
  const patchCriterion = (critKey: string, next: Partial<Draft['criteria'][number]>) =>
    onChange((x) => ({ ...x, criteria: x.criteria.map((c) => (c.key === critKey ? { ...c, ...next } : c)) }));
  const addCriterion = () =>
    onChange((x) =>
      x.criteria.length < CRITERIA_PER_ITEM
        ? { ...x, criteria: [...x.criteria, { key: newKey(), id: null, name: '', maxPoints: String(CRITERION_MAX_DEFAULT) }] }
        : x,
    );
  const removeCriterion = (critKey: string) => onChange((x) => ({ ...x, criteria: x.criteria.filter((c) => c.key !== critKey) }));
  const fillPreset = (preset: keyof typeof RUBRIC_PRESETS) =>
    onChange((x) =>
      x.criteria.length === 0
        ? { ...x, criteria: RUBRIC_PRESETS[preset].criteria.map((name) => ({ key: newKey(), id: null, name, maxPoints: String(CRITERION_MAX_DEFAULT) })) }
        : x,
    );

  function uploadAudio(file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const r = await uploadAsStaff(file);
      if (!r.ok) return onError(r.message);
      patch({ audioFileId: r.fileId, audioName: r.name });
      onError(null);
    });
  }

  // Giọng mẫu riêng của câu nói (35.7): đổi giọng mẫu thì mốc karaoke cũ không còn đúng, về chia đều
  function uploadModelAudio(file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const r = await uploadAsStaff(file);
      if (!r.ok) return onError(r.message);
      patch({ modelAudioFileId: r.fileId, modelAudioName: r.name, wordTimings: '' });
      onError(null);
    });
  }

  function uploadOptionImage(optKey: string, file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const r = await uploadAsStaff(file);
      if (!r.ok) return onError(r.message);
      patchOption(optKey, { imageFileId: r.fileId });
      onError(null);
    });
  }

  function uploadItemImage(file: File | undefined) {
    if (!file) return;
    startUpload(async () => {
      const r = await uploadAsStaff(file);
      if (!r.ok) return onError(r.message);
      patch({ imageFileId: r.fileId });
      onError(null);
    });
  }

  const n = index + 1;
  const hasCriteria = d.criteria.length > 0;
  const pointDisplay = hasCriteria ? criteriaTotal(d) : Number(d.points) || 0;

  return (
    <section
      aria-label={`Câu ${n}`}
      className="overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-[var(--borderRadius-medium)] bg-[var(--primary-soft)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--primary-deep)]">
            #{n}
          </span>
          <b className="text-sm font-semibold text-[var(--fgColor-default)]">Câu {n}</b>
          <Pill tone="butter">
            {EXERCISE_TYPES.find((t) => t.type === d.itemType)?.title ?? d.itemType}
          </Pill>
          <Pill tone="stone">{pointDisplay} điểm</Pill>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex h-8 items-center gap-1.5 rounded-[var(--borderRadius-medium)] border px-2.5 text-xs font-medium transition-colors max-[767px]:h-9 ${
              showPreview
                ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-deep)]'
                : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-muted)] hover:bg-[var(--bgColor-muted)] hover:text-[var(--fgColor-default)]'
            }`}
          >
            {showPreview ? <EyeClosedIcon size={14} aria-hidden /> : <EyeIcon size={14} aria-hidden />}
            <span>{showPreview ? 'Ẩn xem trước' : 'Xem trước'}</span>
          </button>
          {(onMove || onRemove) && (
            <div className="flex items-center gap-1">
              {onMove && (
                <>
                  <ActIcon label={`Đưa câu ${n} lên`} icon={ArrowUpIcon} onClick={() => onMove(-1)} disabled={!canMoveUp || busy} />
                  <ActIcon label={`Đưa câu ${n} xuống`} icon={ArrowDownIcon} onClick={() => onMove(1)} disabled={!canMoveDown || busy} />
                </>
              )}
              {onRemove && (
                <ActIcon label={`Xoá câu ${n}`} danger icon={TrashIcon} onClick={onRemove} />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 max-[767px]:p-3.5">
        {showPreview && (
          <div className="max-w-xs self-center">
            <ItemMiniPreview draft={d} />
          </div>
        )}

        {/* 1. Chọn dạng câu hỏi */}
        <div>
          <p className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">Dạng bài tập</p>
          <div role="radiogroup" aria-label={`Loại của câu ${n}`} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {EXERCISE_TYPES.map((et) => {
              const active = d.itemType === et.type;
              const TypeIcon = et.icon;
              return (
                <button
                  key={et.type}
                  type="button"
                  role="radio"
                  data-card="true"
                  aria-checked={active}
                  aria-label={et.title}
                  onClick={() => setItemType(et.type)}
                  className={`flex flex-col items-start gap-1 rounded-[var(--borderRadius-medium)] border p-2.5 text-left transition-all ${
                    active
                      ? 'border-[var(--primary)] bg-[var(--primary-soft)] shadow-[inset_3px_0_0_var(--primary)]'
                      : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] hover:bg-[var(--bgColor-muted)]'
                  }`}
                >
                  <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${active ? 'text-[var(--primary-deep)]' : 'text-[var(--fgColor-default)]'}`}>
                    <TypeIcon size={14} className={active ? 'text-[var(--primary)]' : 'text-[var(--fgColor-muted)]'} aria-hidden />
                    <span>{et.title}</span>
                  </span>
                  <span className="text-xs text-[var(--fgColor-muted)]">{et.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

      {/* 2. Cài đặt cơ bản: Kỹ năng & Điểm */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Kỹ năng *">
          <SelectBox
            label={`Kỹ năng của câu ${n}`}
            value={d.skill}
            onChange={(v) => patch({ skill: v as Skill })}
            options={SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))}
            block
          />
        </Field>
        <Field label="Điểm *" hint={hasCriteria ? 'Tổng điểm các tiêu chí' : 'Từ 1 đến 100'}>
          <TextInputNumber
            thousandSeparator={false}
            decimalScale={0}
            min={1}
            max={100}
            value={hasCriteria ? String(criteriaTotal(d)) : d.points}
            onTextChange={(raw) => patch({ points: raw })}
            disabled={hasCriteria}
            aria-label={`Điểm của câu ${n}`}
          />
        </Field>
        <Field label="Nguồn và giấy phép">
          <TextInput
            value={d.sourceLicense}
            onChange={(e) => patch({ sourceLicense: e.target.value })}
            aria-label={`Nguồn và giấy phép của câu ${n}`}
            placeholder="VD: Tranh tự vẽ · ESL Center"
            block
          />
        </Field>
      </div>

      {/* 3. Lời hướng dẫn tiếng Anh & tiếng Việt */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Lời hướng dẫn tiếng Anh *">
          <TextInput
            value={d.prompt}
            onChange={(e) => patch({ prompt: e.target.value })}
            aria-label={`Nội dung câu ${n}`}
            placeholder="VD: Listen and touch the correct picture"
            block
          />
        </Field>
        <Field label="Hướng dẫn tiếng Việt (dành cho trẻ nhỏ)">
          <TextInput
            value={d.promptVi}
            onChange={(e) => patch({ promptVi: e.target.value })}
            aria-label={`Hướng dẫn tiếng Việt của câu ${n}`}
            placeholder="VD: Nghe và chạm vào tranh đúng"
            block
          />
        </Field>
      </div>

      {/* Đoạn đọc cho câu trắc nghiệm, viết, nộp tệp (bài đọc hiểu, đề viết dài) */}
      {(d.itemType === 'choice' || d.itemType === 'text' || d.itemType === 'file') && (
        <Field label="Đoạn đọc hoặc lời nhắc (không bắt buộc)">
          <TextAreaAutoHeight
            value={d.passage}
            onChange={(e) => patch({ passage: e.target.value })}
            rows={3}
            aria-label={`Đoạn đọc của câu ${n}`}
          />
        </Field>
      )}

      {/* 4. Âm thanh câu hỏi */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">Âm thanh câu hỏi / Giọng đọc mẫu</span>
        {d.audioFileId !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fgColor-default)]">
              <PaperclipIcon size={16} className="text-[var(--fgColor-muted)]" aria-hidden />
              {d.audioName || `Tệp âm thanh #${d.audioFileId}`}
            </span>
            <audio controls preload="none" src={`/api/files/${d.audioFileId}`} className="h-8 max-w-xs" />
            <ActIcon label={`Bỏ âm thanh câu ${n}`} icon={XIcon} onClick={() => patch({ audioFileId: null, audioName: null })} disabled={busy} />
          </div>
        ) : (
          <FileInput label={`Tải tệp âm thanh cho câu ${n}`} accept={AUDIO_ACCEPT} disabled={busy} onFile={(file) => uploadAudio(file)} />
        )}
      </div>

      {/* 5. Dạng Nghe / Chọn tranh (picture_choice) */}
      {d.itemType === 'picture_choice' && (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-[var(--borderColor-default)] p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">
            Các tranh lựa chọn (chọn 1 đáp án đúng bằng nút tròn)
          </legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {d.options.map((opt, oi) => (
              <div key={opt.key} className="flex items-center gap-2 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-2">
                <input
                  type="radio"
                  name={`correct-${d.key}`}
                  checked={opt.isCorrect}
                  onChange={() => markCorrect(opt.key)}
                  aria-label={`Đáp án ${oi + 1} đúng`}
                  className="size-4 shrink-0 accent-[var(--control-checked-bgColor-rest,var(--fgColor-accent))]"
                />
                <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]">
                  {opt.imageFileId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/files/${opt.imageFileId}`} alt="" className="size-full object-contain" />
                  ) : (
                    <ImageIcon size={20} className="text-[var(--fgColor-muted)]" aria-hidden />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <TextInput
                    value={opt.label}
                    onChange={(e) => patchOption(opt.key, { label: e.target.value })}
                    placeholder={`Tên tranh / từ ${oi + 1}`}
                    block
                    className="!min-w-0"
                  />
                  <div className="flex items-center gap-1.5">
                    <label className="cursor-pointer text-[11px] font-semibold text-[var(--fgColor-accent)] hover:underline">
                      {opt.imageFileId ? 'Đổi ảnh' : 'Tải ảnh'}
                      <input
                        type="file"
                        accept={IMAGE_ACCEPT}
                        className="sr-only"
                        disabled={busy}
                        onChange={(e) => uploadOptionImage(opt.key, e.target.files?.[0])}
                      />
                    </label>
                    {opt.imageFileId && (
                      <button
                        type="button"
                        data-link="true"
                        onClick={() => patchOption(opt.key, { imageFileId: null })}
                        className="text-[11px] text-blush-ink hover:underline"
                      >
                        Bỏ ảnh
                      </button>
                    )}
                  </div>
                </div>
                <ActIcon label={`Xoá đáp án ${oi + 1}`} danger icon={TrashIcon} onClick={() => removeOption(opt.key)} disabled={d.options.length <= 2} />
              </div>
            ))}
          </div>
          <div>
            <Btn variant="ghost" leadingVisual={PlusIcon} onClick={addOption} disabled={d.options.length >= MAX_OPTIONS}>
              Thêm tranh
            </Btn>
          </div>
        </fieldset>
      )}

      {/* 6. Dạng Ghép đôi (match) */}
      {d.itemType === 'match' && (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-[var(--borderColor-default)] p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">
            Các cặp ghép đôi (Vế trái ghép với Vế phải tương ứng)
          </legend>
          <div className="flex flex-col gap-2">
            {d.pairs.map((p, pi) => (
              <div key={p.key} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-medium text-[var(--fgColor-muted)]">{pi + 1}.</span>
                <TextInput
                  value={p.leftLabel}
                  onChange={(e) => patchPair(p.key, { leftLabel: e.target.value })}
                  placeholder="Vế trái (VD: mother)"
                  block
                  className="!min-w-0 flex-1"
                />
                <ArrowSwitchIcon size={14} className="shrink-0 text-[var(--fgColor-muted)]" aria-hidden />
                <TextInput
                  value={p.rightLabel}
                  onChange={(e) => patchPair(p.key, { rightLabel: e.target.value })}
                  placeholder="Vế phải (VD: mẹ)"
                  block
                  className="!min-w-0 flex-1"
                />
                <ActIcon label={`Xoá cặp ${pi + 1}`} danger icon={TrashIcon} onClick={() => removePair(p.key)} disabled={d.pairs.length <= 2} />
              </div>
            ))}
          </div>
          <div>
            <Btn variant="ghost" leadingVisual={PlusIcon} onClick={addPair} disabled={d.pairs.length >= MAX_PAIRS}>
              Thêm cặp ghép
            </Btn>
          </div>
        </fieldset>
      )}

      {/* 7. Dạng Sắp xếp (order) */}
      {d.itemType === 'order' && (
        <div className="flex flex-col gap-2">
          <Field label="Câu chuẩn xác (hệ thống sẽ tự động tách các từ và đảo thứ tự cho học sinh ghép) *">
            <TextInput
              value={d.referenceText}
              onChange={(e) => patch({ referenceText: e.target.value })}
              placeholder="VD: My father can cook."
              block
            />
          </Field>
          {d.referenceText && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-2.5">
              <span className="text-xs text-[var(--fgColor-muted)]">Các từ sẽ xuất hiện:</span>
              {d.referenceText.split(/\s+/).filter(Boolean).map((w, wi) => (
                <span key={wi} className="rounded-[var(--borderRadius-small)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-0.5 text-xs font-medium text-[var(--fgColor-default)]">
                  {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 8. Dạng Điền chỗ trống (gap_fill) */}
      {d.itemType === 'gap_fill' && (
        <div className="flex flex-col gap-3">
          <Field label="Đoạn văn hoặc câu có chỗ trống (đặt từ cần điền trong ngoặc vuông [từ])">
            <TextAreaAutoHeight
              value={d.passage}
              onChange={(e) => patch({ passage: e.target.value })}
              rows={3}
              placeholder="VD: This is my [brother]. He is [three] years old."
            />
          </Field>
          <Field label="Các đáp án đúng được chấp nhận (phân cách bằng dấu gạch đứng | hoặc dấu phẩy)">
            <TextInput
              value={d.referenceText}
              onChange={(e) => patch({ referenceText: e.target.value })}
              placeholder="VD: brother | bro"
              block
            />
          </Field>
        </div>
      )}

      {/* 9. Dạng Ghi âm / Nói (speak_repeat, speak_read, speak_picture) */}
      {(d.itemType === 'speak_repeat' || d.itemType === 'speak_read' || d.itemType === 'speak_picture') && (
        <div className="flex flex-col gap-3">
          <Field label="Câu mẫu / Đoạn văn học sinh cần nói hoặc đọc to *">
            <TextAreaAutoHeight
              value={d.referenceText}
              onChange={(e) => patch({ referenceText: e.target.value })}
              rows={2}
              placeholder="VD: This is my brother. He is three."
            />
          </Field>
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-3">
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">Giọng mẫu của Thầy/Cô (học sinh bấm Nghe mẫu)</span>
            <MiniRecorder
              fileId={d.modelAudioFileId}
              label={`Ghi giọng mẫu câu ${n}`}
              maxSec={Number(d.maxSeconds) || 15}
              disabled={busy}
              onChange={(fileId) => patch({ modelAudioFileId: fileId, modelAudioName: null, wordTimings: '' })}
            />
            {d.modelAudioFileId === null && <FileInput label={`Tải tệp giọng mẫu cho câu ${n}`} accept={AUDIO_ACCEPT} disabled={busy} onFile={(file) => uploadModelAudio(file)} />}
            {d.itemType === 'speak_read' && (
              <KaraokeTimingEditor n={n} text={d.referenceText} audioFileId={d.modelAudioFileId ?? d.audioFileId} value={d.wordTimings} disabled={busy} onChange={(v) => patch({ wordTimings: v })} />
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Thời gian ghi âm tối đa (giây)">
              <TextInputNumber
                aria-label={`Thời gian ghi âm tối đa câu ${n}`}
                thousandSeparator={false}
                decimalScale={0}
                min={5}
                max={120}
                value={d.maxSeconds}
                onTextChange={(raw) => patch({ maxSeconds: raw })}
              />
            </Field>
            {d.itemType === 'speak_picture' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--fgColor-muted)]">Tranh gợi ý khi nói</span>
                {d.imageFileId ? (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${d.imageFileId}`} alt="" className="size-10 rounded border border-[var(--borderColor-default)] object-contain" />
                    <button type="button" data-link="true" onClick={() => patch({ imageFileId: null })} className="text-xs text-blush-ink hover:underline">
                      Xoá tranh
                    </button>
                  </div>
                ) : (
                  <FileInput label="Tải tranh gợi ý" accept={IMAGE_ACCEPT} disabled={busy} onFile={(f) => uploadItemImage(f)} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. Dạng Trắc nghiệm chữ truyền thống */}
      {d.itemType === 'choice' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-normal text-[var(--fgColor-muted)]">Đáp án (chọn một đáp án đúng)</legend>
          {d.options.map((o, oi) => (
            <div key={o.key} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${d.key}`}
                checked={o.isCorrect}
                onChange={() => markCorrect(o.key)}
                aria-label={`Đáp án ${oi + 1} là đáp án đúng`}
                className="size-4 shrink-0 accent-[var(--control-checked-bgColor-rest,var(--fgColor-accent))]"
              />
              <TextInput
                value={o.label}
                onChange={(e) => patchOption(o.key, { label: e.target.value })}
                placeholder={`Đáp án ${oi + 1}`}
                aria-label={`Nội dung đáp án ${oi + 1} của câu ${n}`}
                block
                className="!min-w-0 flex-1"
              />
              <ActIcon label={`Xoá đáp án ${oi + 1} của câu ${n}`} danger icon={TrashIcon} onClick={() => removeOption(o.key)} disabled={d.options.length <= 2} />
            </div>
          ))}
          <div>
            <Btn variant="ghost" leadingVisual={PlusIcon} onClick={addOption} disabled={d.options.length >= MAX_OPTIONS}>
              Thêm đáp án
            </Btn>
          </div>
        </fieldset>
      )}

      {/* Tiêu chí chấm cho các dạng câu nói hoặc bài tự luận */}
      {!['choice', 'picture_choice', 'match', 'order', 'gap_fill'].includes(d.itemType) && (
        <fieldset className="flex flex-col gap-2 border-t border-[var(--borderColor-default)] pt-3">
          <legend className="mb-1 text-sm font-normal text-[var(--fgColor-muted)]">
            Tiêu chí chấm (không bắt buộc). Có tiêu chí thì điểm câu là tổng điểm các tiêu chí, tối đa {CRITERION_MAX_POINTS} điểm mỗi tiêu chí.
          </legend>
          {d.criteria.map((c, ci) => (
            <div key={c.key} className="flex items-center gap-2">
              <TextInput
                value={c.name}
                onChange={(e) => patchCriterion(c.key, { name: e.target.value })}
                placeholder={`Tiêu chí ${ci + 1}`}
                aria-label={`Tên tiêu chí ${ci + 1} của câu ${n}`}
                block
                className="!min-w-0 flex-1"
              />
              <div className="w-20 shrink-0">
                <TextInputNumber
                  thousandSeparator={false}
                  decimalScale={0}
                  min={1}
                  max={CRITERION_MAX_POINTS}
                  value={c.maxPoints}
                  onTextChange={(raw) => patchCriterion(c.key, { maxPoints: raw })}
                  aria-label={`Điểm tối đa tiêu chí ${ci + 1} của câu ${n}`}
                />
              </div>
              <ActIcon label={`Xoá tiêu chí ${ci + 1} của câu ${n}`} danger icon={TrashIcon} onClick={() => removeCriterion(c.key)} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" leadingVisual={PlusIcon} onClick={addCriterion} disabled={d.criteria.length >= CRITERIA_PER_ITEM}>
              Thêm tiêu chí
            </Btn>
            {!hasCriteria && (
              <>
                <Btn variant="ghost" onClick={() => fillPreset('writing')}>
                  Mẫu IELTS viết
                </Btn>
                <Btn variant="ghost" onClick={() => fillPreset('speaking')}>
                  Mẫu IELTS nói
                </Btn>
              </>
            )}
          </div>
        </fieldset>
      )}
      </div>
    </section>
  );
}
