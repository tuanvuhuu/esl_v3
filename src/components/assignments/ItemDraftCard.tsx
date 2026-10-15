'use client';

import { ArrowDown, ArrowUp, Paperclip, Plus, Trash2, X } from 'lucide-react';
import { useTransition } from 'react';
import { uploadFileAction } from '@/app/(app)/bai-tap/question-actions';
import {
  CRITERIA_PER_ITEM,
  CRITERION_MAX_DEFAULT,
  CRITERION_MAX_POINTS,
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
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
import { criteriaTotal, MAX_OPTIONS, newKey, type Draft } from './item-draft';
import { AUDIO_ACCEPT } from '@/lib/upload-types';

// Một câu trên màn soạn: kỹ năng, loại, điểm, đề, âm thanh, đáp án hoặc tiêu chí. Dùng cho bài tập và ngân hàng câu hỏi.
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
  onMove?: (dir: -1 | 1) => void; // không truyền thì ẩn mũi tên
  onRemove?: () => void; // không truyền thì ẩn nút xoá
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const [uploading, startUpload] = useTransition();
  const busy = pending || uploading;

  const patch = (next: Partial<Draft>) => onChange((x) => ({ ...x, ...next }));
  const patchOption = (optKey: string, next: Partial<Draft['options'][number]>) =>
    onChange((x) => ({ ...x, options: x.options.map((o) => (o.key === optKey ? { ...o, ...next } : o)) }));
  // Chỉ một đáp án đúng: chọn đáp án này thì các đáp án khác bỏ đánh dấu
  const markCorrect = (optKey: string) => onChange((x) => ({ ...x, options: x.options.map((o) => ({ ...o, isCorrect: o.key === optKey })) }));
  const addOption = () =>
    onChange((x) => (x.options.length < MAX_OPTIONS ? { ...x, options: [...x.options, { key: newKey(), id: null, label: '', isCorrect: false }] } : x));
  const removeOption = (optKey: string) => onChange((x) => ({ ...x, options: x.options.filter((o) => o.key !== optKey) }));
  const patchCriterion = (critKey: string, next: Partial<Draft['criteria'][number]>) =>
    onChange((x) => ({ ...x, criteria: x.criteria.map((c) => (c.key === critKey ? { ...c, ...next } : c)) }));
  const addCriterion = () =>
    onChange((x) =>
      x.criteria.length < CRITERIA_PER_ITEM
        ? { ...x, criteria: [...x.criteria, { key: newKey(), id: null, name: '', maxPoints: String(CRITERION_MAX_DEFAULT) }] }
        : x,
    );
  const removeCriterion = (critKey: string) => onChange((x) => ({ ...x, criteria: x.criteria.filter((c) => c.key !== critKey) }));
  // Mẫu IELTS điền sẵn bốn tiêu chí, mỗi tiêu chí 5 điểm. Chỉ điền khi câu chưa có tiêu chí.
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

  const n = index + 1;
  const hasCriteria = d.criteria.length > 0;

  return (
    <section aria-label={`Câu ${n}`} className="flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line p-3.5">
      <div className="flex items-center justify-between gap-2">
        <b className="text-base text-ink">Câu {n}</b>
        {(onMove || onRemove) && (
          <div className="flex items-center gap-1.5">
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

      <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-3">
        <Field label="Kỹ năng *">
          <SelectPanel
            label={`Kỹ năng của câu ${n}`}
            value={d.skill}
            onChange={(v) => patch({ skill: v as Skill })}
            options={SKILLS.map((s) => ({ value: s, label: SKILL_LABELS[s] }))}
            block
          />
        </Field>
        <Field label="Loại câu *">
          <SelectPanel
            label={`Loại của câu ${n}`}
            value={d.itemType}
            onChange={(v) => patch({ itemType: v as ItemType })}
            options={ITEM_TYPES.map((t) => ({ value: t, label: ITEM_TYPE_LABELS[t] }))}
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
      </div>

      <Field label="Nội dung câu hỏi" hint={d.itemType === 'file' ? 'Hướng dẫn học sinh cần nộp gì' : undefined}>
        <textarea
          value={d.prompt}
          onChange={(e) => patch({ prompt: e.target.value })}
          rows={2}
          placeholder="VD: Listen and choose the correct answer."
          aria-label={`Nội dung câu ${n}`}
          className={textareaClass()}
        />
      </Field>

      <Field label="Đoạn đọc hoặc lời nhắc (không bắt buộc)">
        <textarea
          value={d.passage}
          onChange={(e) => patch({ passage: e.target.value })}
          rows={3}
          placeholder="Bài đọc, đoạn văn để viết lại, hoặc lời nhắc khi nói"
          aria-label={`Đoạn đọc của câu ${n}`}
          className={textareaClass()}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-normal text-ink-2">Âm thanh của câu (không bắt buộc)</span>
        {d.audioFileId !== null ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-ink">
              <Paperclip className="size-4 text-muted" aria-hidden />
              {d.audioName}
            </span>
            <ActIcon label={`Bỏ âm thanh của câu ${n}`} onClick={() => patch({ audioFileId: null, audioName: null })} disabled={busy}>
              <X className="size-4" aria-hidden />
            </ActIcon>
          </div>
        ) : (
          <FileInput label={`Tải âm thanh cho câu ${n}`} accept={AUDIO_ACCEPT} disabled={busy} onFile={(file) => uploadAudio(file)} />
        )}
      </div>

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

      {d.itemType !== 'choice' && (
        <fieldset className="flex flex-col gap-2">
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
