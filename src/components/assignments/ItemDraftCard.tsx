'use client';

import { ArrowDown, ArrowUp, Eye, EyeOff, Image as ImageIcon, Paperclip, Plus, Trash2, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { uploadFileAction } from '@/app/(app)/bai-tap/question-actions';
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
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { Field, inputClass, textareaClass, FileInput } from '@/components/ui/Field';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { criteriaTotal, MAX_OPTIONS, MAX_PAIRS, newKey, type Draft } from './item-draft';
import { ItemMiniPreview } from './ItemMiniPreview';
import { AUDIO_ACCEPT, IMAGE_ACCEPT } from '@/lib/upload-types';

const EXERCISE_TYPES: { type: ItemType; icon: string; title: string; hint: string; defaultSkill: Skill }[] = [
  { type: 'picture_choice', icon: '🖼️', title: 'Nghe chọn tranh', hint: '3+ · Nghe', defaultSkill: 'listening' },
  { type: 'match', icon: '🔗', title: 'Ghép đôi', hint: '5+ · Từ vựng', defaultSkill: 'reading' },
  { type: 'order', icon: '🧩', title: 'Sắp xếp câu', hint: '7+ · Ngữ pháp', defaultSkill: 'writing' },
  { type: 'gap_fill', icon: '✏️', title: 'Điền chỗ trống', hint: '7+ · Đọc viết', defaultSkill: 'reading' },
  { type: 'speak_repeat', icon: '🔁', title: 'Nghe nhắc lại', hint: '3+ · Nói', defaultSkill: 'speaking' },
  { type: 'speak_read', icon: '📖', title: 'Đọc to', hint: '6+ · Nói', defaultSkill: 'speaking' },
  { type: 'speak_picture', icon: '🗣️', title: 'Nói về tranh', hint: '8+ · Nói', defaultSkill: 'speaking' },
  { type: 'choice', icon: '☑️', title: 'Trắc nghiệm chữ', hint: 'Mọi lứa tuổi', defaultSkill: 'reading' },
  { type: 'text', icon: '📝', title: 'Trả lời viết', hint: 'Giáo viên chấm', defaultSkill: 'writing' },
  { type: 'file', icon: '📎', title: 'Nộp tệp', hint: 'Giáo viên chấm', defaultSkill: 'writing' },
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
    const fd = new FormData();
    fd.append('file', file);
    startUpload(async () => {
      const r = await uploadFileAction(fd);
      if (!r.ok) return onError(r.message);
      patch({ audioFileId: r.fileId, audioName: r.name });
      onError(null);
    });
  }

  function uploadOptionImage(optKey: string, file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startUpload(async () => {
      const r = await uploadFileAction(fd);
      if (!r.ok) return onError(r.message);
      patchOption(optKey, { imageFileId: r.fileId });
      onError(null);
    });
  }

  function uploadItemImage(file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startUpload(async () => {
      const r = await uploadFileAction(fd);
      if (!r.ok) return onError(r.message);
      patch({ imageFileId: r.fileId });
      onError(null);
    });
  }

  const n = index + 1;
  const hasCriteria = d.criteria.length > 0;

  return (
    <section aria-label={`Câu ${n}`} className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <b className="text-base text-ink">Câu {n}</b>
          <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-bold text-ink">
            {EXERCISE_TYPES.find((t) => t.type === d.itemType)?.title ?? d.itemType}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors ${
              showPreview ? 'border-[var(--primary-deep)] bg-[var(--primary-soft)] text-ink' : 'border-line bg-surface text-ink-2 hover:bg-stone'
            }`}
          >
            {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            <span>{showPreview ? 'Ẩn xem trước' : 'Xem trước'}</span>
          </button>
          {(onMove || onRemove) && (
            <div className="flex items-center gap-1">
              {onMove && (
                <>
                  <ActIcon label={`Đưa câu ${n} lên`} onClick={() => onMove(-1)} disabled={!canMoveUp || busy}>
                    <ArrowUp className="size-4" aria-hidden />
                  </ActIcon>
                  <ActIcon label={`Đưa câu ${n} xuống`} onClick={() => onMove(1)} disabled={!canMoveDown || busy}>
                    <ArrowDown className="size-4" aria-hidden />
                  </ActIcon>
                </>
              )}
              {onRemove && (
                <ActIcon label={`Xoá câu ${n}`} danger onClick={onRemove}>
                  <Trash2 className="size-4" aria-hidden />
                </ActIcon>
              )}
            </div>
          )}
        </div>
      </div>

      {showPreview && (
        <div className="max-w-xs self-center">
          <ItemMiniPreview draft={d} />
        </div>
      )}

      {/* 1. Chọn dạng câu hỏi (Card Grid như mockup) */}
      <div>
        <p className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted">Dạng bài tập</p>
        <div role="radiogroup" aria-label={`Loại của câu ${n}`} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EXERCISE_TYPES.map((et) => {
            const active = d.itemType === et.type;
            return (
              <button
                key={et.type}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={et.title}
                onClick={() => setItemType(et.type)}
                className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                  active
                    ? 'border-[var(--primary-deep)] bg-[var(--primary-soft)] shadow-xs ring-2 ring-[var(--primary-deep)]/20'
                    : 'border-line bg-surface hover:bg-stone/60'
                }`}
              >
                <span className="text-sm font-bold text-ink">
                  {et.icon} {et.title}
                </span>
                <span className="text-xs text-muted">{et.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Cài đặt cơ bản: Kỹ năng & Điểm */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Kỹ năng *">
          <SelectPanel
            label={`Kỹ năng của câu ${n}`}
            value={d.skill}
            onChange={(v) => patch({ skill: v as Skill })}
            options={SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))}
            block
          />
        </Field>
        <Field label="Điểm *" hint={hasCriteria ? 'Tổng điểm các tiêu chí' : 'Từ 1 đến 100'}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            value={hasCriteria ? String(criteriaTotal(d)) : d.points}
            onChange={(e) => patch({ points: e.target.value })}
            readOnly={hasCriteria}
            aria-label={`Điểm của câu ${n}`}
            className={inputClass()}
          />
        </Field>
        <Field label="Nguồn và giấy phép">
          <input
            type="text"
            value={d.sourceLicense}
            onChange={(e) => patch({ sourceLicense: e.target.value })}
            aria-label={`Nguồn và giấy phép của câu ${n}`}
            placeholder="VD: Tranh tự vẽ · ESL Center"
            className={inputClass()}
          />
        </Field>
      </div>

      {/* 3. Lời hướng dẫn tiếng Anh & tiếng Việt */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Lời hướng dẫn tiếng Anh *">
          <input
            type="text"
            value={d.prompt}
            onChange={(e) => patch({ prompt: e.target.value })}
            aria-label={`Nội dung câu ${n}`}
            placeholder="VD: Listen and touch the correct picture"
            className={inputClass()}
          />
        </Field>
        <Field label="Hướng dẫn tiếng Việt (dành cho trẻ nhỏ)">
          <input
            type="text"
            value={d.promptVi}
            onChange={(e) => patch({ promptVi: e.target.value })}
            aria-label={`Hướng dẫn tiếng Việt của câu ${n}`}
            placeholder="VD: Nghe và chạm vào tranh đúng"
            className={inputClass()}
          />
        </Field>
      </div>

      {/* Đoạn đọc cho câu trắc nghiệm, viết, nộp tệp (bài đọc hiểu, đề viết dài) */}
      {(d.itemType === 'choice' || d.itemType === 'text' || d.itemType === 'file') && (
        <Field label="Đoạn đọc hoặc lời nhắc (không bắt buộc)">
          <textarea
            value={d.passage}
            onChange={(e) => patch({ passage: e.target.value })}
            rows={3}
            aria-label={`Đoạn đọc của câu ${n}`}
            className={textareaClass()}
          />
        </Field>
      )}

      {/* 4. Âm thanh câu hỏi */}
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-stone/30 p-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Âm thanh câu hỏi / Giọng đọc mẫu</span>
        {d.audioFileId !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
              <Paperclip className="size-4 text-muted" aria-hidden />
              {d.audioName || `Tệp âm thanh #${d.audioFileId}`}
            </span>
            <audio controls preload="none" src={`/api/files/${d.audioFileId}`} className="h-8 max-w-xs" />
            <ActIcon label={`Bỏ âm thanh câu ${n}`} onClick={() => patch({ audioFileId: null, audioName: null })} disabled={busy}>
              <X className="size-4" aria-hidden />
            </ActIcon>
          </div>
        ) : (
          <FileInput label={`Tải tệp âm thanh cho câu ${n}`} accept={AUDIO_ACCEPT} disabled={busy} onFile={(file) => uploadAudio(file)} />
        )}
      </div>

      {/* 5. Dạng Nghe / Chọn tranh (picture_choice) */}
      {d.itemType === 'picture_choice' && (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-line p-3">
          <legend className="text-xs font-bold uppercase tracking-wider text-muted px-1">
            Các tranh lựa chọn (chọn 1 đáp án đúng bằng nút tròn)
          </legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {d.options.map((opt, oi) => (
              <div key={opt.key} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-xs">
                <input
                  type="radio"
                  name={`correct-${d.key}`}
                  checked={opt.isCorrect}
                  onChange={() => markCorrect(opt.key)}
                  aria-label={`Đáp án ${oi + 1} đúng`}
                  className="size-4 shrink-0 accent-[var(--primary-deep)]"
                />
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-lg border border-line bg-stone/40 overflow-hidden">
                  {opt.imageFileId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/files/${opt.imageFileId}`} alt="" className="size-full object-contain" />
                  ) : (
                    <ImageIcon className="size-5 text-muted" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => patchOption(opt.key, { label: e.target.value })}
                    placeholder={`Tên tranh / từ ${oi + 1}`}
                    className={`${inputClass()} h-8 text-xs`}
                  />
                  <div className="flex items-center gap-1.5">
                    <label className="cursor-pointer text-[11px] font-semibold text-[var(--link)] hover:underline">
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
                        onClick={() => patchOption(opt.key, { imageFileId: null })}
                        className="text-[11px] text-red-600 hover:underline"
                      >
                        Bỏ ảnh
                      </button>
                    )}
                  </div>
                </div>
                <ActIcon label={`Xoá đáp án ${oi + 1}`} danger onClick={() => removeOption(opt.key)} disabled={d.options.length <= 2}>
                  <Trash2 className="size-4" aria-hidden />
                </ActIcon>
              </div>
            ))}
          </div>
          <div>
            <Btn variant="ghost" onClick={addOption} disabled={d.options.length >= MAX_OPTIONS}>
              <Plus className="size-4" aria-hidden />
              Thêm tranh
            </Btn>
          </div>
        </fieldset>
      )}

      {/* 6. Dạng Ghép đôi (match) */}
      {d.itemType === 'match' && (
        <fieldset className="flex flex-col gap-3 rounded-xl border border-line p-3">
          <legend className="text-xs font-bold uppercase tracking-wider text-muted px-1">
            Các cặp ghép đôi (Vế trái ghép với Vế phải tương ứng)
          </legend>
          <div className="flex flex-col gap-2">
            {d.pairs.map((p, pi) => (
              <div key={p.key} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-bold text-muted">{pi + 1}.</span>
                <input
                  type="text"
                  value={p.leftLabel}
                  onChange={(e) => patchPair(p.key, { leftLabel: e.target.value })}
                  placeholder="Vế trái (VD: mother)"
                  className={`${inputClass()} flex-1`}
                />
                <span className="text-muted font-bold">⇄</span>
                <input
                  type="text"
                  value={p.rightLabel}
                  onChange={(e) => patchPair(p.key, { rightLabel: e.target.value })}
                  placeholder="Vế phải (VD: mẹ)"
                  className={`${inputClass()} flex-1`}
                />
                <ActIcon label={`Xoá cặp ${pi + 1}`} danger onClick={() => removePair(p.key)} disabled={d.pairs.length <= 2}>
                  <Trash2 className="size-4" aria-hidden />
                </ActIcon>
              </div>
            ))}
          </div>
          <div>
            <Btn variant="ghost" onClick={addPair} disabled={d.pairs.length >= MAX_PAIRS}>
              <Plus className="size-4" aria-hidden />
              Thêm cặp ghép
            </Btn>
          </div>
        </fieldset>
      )}

      {/* 7. Dạng Sắp xếp (order) */}
      {d.itemType === 'order' && (
        <div className="flex flex-col gap-2">
          <Field label="Câu chuẩn xác (hệ thống sẽ tự động tách các từ và đảo thứ tự cho học sinh ghép) *">
            <input
              type="text"
              value={d.referenceText}
              onChange={(e) => patch({ referenceText: e.target.value })}
              placeholder="VD: My father can cook."
              className={inputClass()}
            />
          </Field>
          {d.referenceText && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-stone/40 p-2.5">
              <span className="text-xs text-muted">Các từ sẽ xuất hiện:</span>
              {d.referenceText.split(/\s+/).filter(Boolean).map((w, wi) => (
                <span key={wi} className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-bold text-ink shadow-xs">
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
            <textarea
              value={d.passage}
              onChange={(e) => patch({ passage: e.target.value })}
              rows={3}
              placeholder="VD: This is my [brother]. He is [three] years old."
              className={textareaClass()}
            />
          </Field>
          <Field label="Các đáp án đúng được chấp nhận (phân cách bằng dấu gạch đứng | hoặc dấu phẩy)">
            <input
              type="text"
              value={d.referenceText}
              onChange={(e) => patch({ referenceText: e.target.value })}
              placeholder="VD: brother | bro"
              className={inputClass()}
            />
          </Field>
        </div>
      )}

      {/* 9. Dạng Ghi âm / Nói (speak_repeat, speak_read, speak_picture) */}
      {(d.itemType === 'speak_repeat' || d.itemType === 'speak_read' || d.itemType === 'speak_picture') && (
        <div className="flex flex-col gap-3">
          <Field label="Câu mẫu / Đoạn văn học sinh cần nói hoặc đọc to *">
            <textarea
              value={d.referenceText}
              onChange={(e) => patch({ referenceText: e.target.value })}
              rows={2}
              placeholder="VD: This is my brother. He is three."
              className={textareaClass()}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Thời gian ghi âm tối đa (giây)">
              <input
                type="number"
                min={5}
                max={120}
                value={d.maxSeconds}
                onChange={(e) => patch({ maxSeconds: e.target.value })}
                className={inputClass()}
              />
            </Field>
            {d.itemType === 'speak_picture' && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Tranh gợi ý khi nói</span>
                {d.imageFileId ? (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/files/${d.imageFileId}`} alt="" className="size-10 rounded object-contain border border-line" />
                    <button type="button" onClick={() => patch({ imageFileId: null })} className="text-xs text-red-600 hover:underline">
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
          <legend className="mb-1 text-sm font-normal text-ink-2">Đáp án (chọn một đáp án đúng)</legend>
          {d.options.map((o, oi) => (
            <div key={o.key} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${d.key}`}
                checked={o.isCorrect}
                onChange={() => markCorrect(o.key)}
                aria-label={`Đáp án ${oi + 1} là đáp án đúng`}
                className="size-4 shrink-0 accent-[var(--primary-deep)]"
              />
              <input
                type="text"
                value={o.label}
                onChange={(e) => patchOption(o.key, { label: e.target.value })}
                placeholder={`Đáp án ${oi + 1}`}
                aria-label={`Nội dung đáp án ${oi + 1} của câu ${n}`}
                className={inputClass()}
              />
              <ActIcon label={`Xoá đáp án ${oi + 1} của câu ${n}`} danger onClick={() => removeOption(o.key)} disabled={d.options.length <= 2}>
                <Trash2 className="size-4" aria-hidden />
              </ActIcon>
            </div>
          ))}
          <div>
            <Btn variant="ghost" onClick={addOption} disabled={d.options.length >= MAX_OPTIONS}>
              <Plus className="size-4" aria-hidden />
              Thêm đáp án
            </Btn>
          </div>
        </fieldset>
      )}

      {/* Tiêu chí chấm cho các dạng câu nói hoặc bài tự luận */}
      {!['choice', 'picture_choice', 'match', 'order', 'gap_fill'].includes(d.itemType) && (
        <fieldset className="flex flex-col gap-2 border-t border-line pt-3">
          <legend className="mb-1 text-sm font-normal text-ink-2">
            Tiêu chí chấm (không bắt buộc). Có tiêu chí thì điểm câu là tổng điểm các tiêu chí, tối đa {CRITERION_MAX_POINTS} điểm mỗi tiêu chí.
          </legend>
          {d.criteria.map((c, ci) => (
            <div key={c.key} className="flex items-center gap-2">
              <input
                type="text"
                value={c.name}
                onChange={(e) => patchCriterion(c.key, { name: e.target.value })}
                placeholder={`Tiêu chí ${ci + 1}`}
                aria-label={`Tên tiêu chí ${ci + 1} của câu ${n}`}
                className={`${inputClass()} min-w-0 flex-1`}
              />
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={CRITERION_MAX_POINTS}
                step={1}
                value={c.maxPoints}
                onChange={(e) => patchCriterion(c.key, { maxPoints: e.target.value })}
                aria-label={`Điểm tối đa tiêu chí ${ci + 1} của câu ${n}`}
                className={`${inputClass()} w-20 shrink-0`}
              />
              <ActIcon label={`Xoá tiêu chí ${ci + 1} của câu ${n}`} danger onClick={() => removeCriterion(c.key)}>
                <Trash2 className="size-4" aria-hidden />
              </ActIcon>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={addCriterion} disabled={d.criteria.length >= CRITERIA_PER_ITEM}>
              <Plus className="size-4" aria-hidden />
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
    </section>
  );
}
