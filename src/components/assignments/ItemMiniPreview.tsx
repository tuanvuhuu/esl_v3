'use client';

import { BroadcastIcon, CheckIcon, GlobeIcon, ImageIcon, UnmuteIcon } from '@primer/octicons-react';
import { Pill } from '@/components/ui/primitives';
import type { Draft } from './item-draft';

export function ItemMiniPreview({ draft: d }: { draft: Draft }) {
  return (
    <div className="flex flex-col gap-2.5 overflow-hidden rounded-2xl border-2 border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3.5 text-[var(--fgColor-default)] shadow-[var(--shadow)]">
      <div className="-mx-3.5 -mt-3.5 mb-0.5 flex items-center justify-between border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2 text-xs text-[var(--fgColor-muted)]">
        <span className="font-semibold uppercase tracking-wide text-[var(--fgColor-muted)]">Xem trước học sinh</span>
        <Pill tone="stone">Điện thoại</Pill>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          data-card="true"
          aria-label="Nghe âm thanh"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--button-primary-bgColor-rest,var(--color-primary))] text-[var(--button-primary-fgColor-rest,var(--color-on-primary))] shadow-sm active:scale-95"
        >
          <UnmuteIcon size={20} aria-hidden />
        </button>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight text-[var(--fgColor-default)]">{d.prompt || 'Chưa có câu hỏi'}</div>
          {d.promptVi && (
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--fgColor-muted)]">
              <GlobeIcon size={12} aria-hidden />
              <span>{d.promptVi}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dạng Nghe chọn tranh */}
      {d.itemType === 'picture_choice' && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {d.options.map((opt, i) => (
            <div
              key={opt.key || i}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border-2 p-2 text-center transition-all ${
                opt.isCorrect
                  ? 'border-[var(--accent)] bg-mint font-medium text-mint-ink'
                  : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]'
              }`}
            >
              {opt.imageFileId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${opt.imageFileId}`}
                  alt={opt.label}
                  className="max-h-14 max-w-full rounded object-contain"
                />
              ) : (
                <ImageIcon size={22} className="text-[var(--fgColor-muted)]" aria-hidden />
              )}
              <span className="mt-1 max-w-full truncate text-xs">{opt.label || `Tranh ${i + 1}`}</span>
              {opt.isCorrect && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[var(--accent)] text-white">
                  <CheckIcon size={10} aria-hidden />
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dạng Ghép đôi */}
      {d.itemType === 'match' && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {d.pairs.slice(0, 4).map((p, i) => (
            <div key={p.key || i} className="contents">
              <div className="flex h-10 items-center justify-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-1.5 text-xs font-medium">
                {p.leftLabel || `Vế ${i + 1}`}
              </div>
              <div className="flex h-10 items-center justify-center rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-accent-muted,var(--color-primary-soft))] p-1.5 text-xs font-medium text-[var(--fgColor-default)]">
                {p.rightLabel || `Cặp ${i + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dạng Sắp xếp */}
      {d.itemType === 'order' && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[var(--borderRadius-medium)] border-2 border-dashed border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-2 text-xs text-[var(--fgColor-muted)]">
            {d.referenceText ? (
              d.referenceText.split(/\s+/).map((w, wi) => (
                <span key={wi} className="rounded-[var(--borderRadius-small)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2 py-1 font-medium text-[var(--fgColor-default)]">
                  {w}
                </span>
              ))
            ) : (
              <span>Chạm từ bên dưới để xếp câu…</span>
            )}
          </div>
        </div>
      )}

      {/* Dạng Điền chỗ trống */}
      {d.itemType === 'gap_fill' && (
        <div className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] p-2 text-xs leading-relaxed">
          {d.passage || d.referenceText || 'I have a [cat].'}
        </div>
      )}

      {/* Dạng Nói / Ghi âm */}
      {(d.itemType === 'speak_repeat' || d.itemType === 'speak_read' || d.itemType === 'speak_picture') && (
        <div className="flex flex-col items-center gap-2 py-2">
          {d.referenceText && <div className="text-center text-xs font-medium text-[var(--fgColor-default)]">“{d.referenceText}”</div>}
          <div className="flex size-14 items-center justify-center rounded-full bg-blush-ink text-white shadow-md">
            <BroadcastIcon size={22} aria-hidden />
          </div>
          <span className="text-[11px] text-[var(--fgColor-muted)]">Bấm để nói ({d.maxSeconds || '15'}s)</span>
        </div>
      )}

      {/* Dạng Trắc nghiệm chuẩn */}
      {d.itemType === 'choice' && (
        <div className="flex flex-col gap-1.5 pt-1">
          {d.options.map((opt, i) => (
            <div
              key={opt.key || i}
              className={`flex items-center gap-2 rounded-[var(--borderRadius-medium)] border px-2.5 py-1.5 text-xs ${
                opt.isCorrect
                  ? 'border-[var(--accent)] bg-mint font-medium text-mint-ink'
                  : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)]'
              }`}
            >
              <span>{String.fromCharCode(65 + i)}.</span>
              <span className="flex-1 truncate">{opt.label || `Lựa chọn ${i + 1}`}</span>
              {opt.isCorrect && <CheckIcon size={12} className="text-[var(--accent)]" aria-hidden />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
