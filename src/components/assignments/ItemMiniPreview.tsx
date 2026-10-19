'use client';

import { Volume2 } from 'lucide-react';
import type { Draft } from './item-draft';

export function ItemMiniPreview({ draft: d }: { draft: Draft }) {
  return (
    <div className="flex flex-col gap-2 rounded-[20px] border-4 border-[#2F2A1F] bg-[var(--surface)] p-3 text-ink shadow-md">
      <div className="flex items-center justify-between border-b border-line pb-1.5 text-xs text-muted">
        <span className="font-bold text-ink">Xem trước học sinh</span>
        <span className="rounded-full bg-stone px-2 py-0.5 font-semibold text-stone-ink">Điện thoại</span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Nghe âm thanh"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-sm active:scale-95"
        >
          <Volume2 className="size-5" />
        </button>
        <div className="min-w-0">
          <div className="text-sm font-extrabold leading-tight text-ink">{d.prompt || 'Chưa có câu hỏi'}</div>
          {d.promptVi && <div className="text-xs text-muted">🇻🇳 {d.promptVi}</div>}
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
                  ? 'border-[var(--accent)] bg-[var(--mint)] text-[var(--mint-ink)] font-bold'
                  : 'border-line bg-surface hover:bg-stone text-ink'
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
                <span className="text-2xl">🖼️</span>
              )}
              <span className="mt-1 text-xs truncate max-w-full">{opt.label || `Tranh ${i + 1}`}</span>
              {opt.isCorrect && (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  ✓
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
              <div className="flex h-10 items-center justify-center rounded-lg border border-line bg-surface p-1.5 text-xs font-bold shadow-xs">
                {p.leftLabel || `Vế ${i + 1}`}
              </div>
              <div className="flex h-10 items-center justify-center rounded-lg border border-line bg-[var(--primary-soft)] p-1.5 text-xs font-bold text-ink shadow-xs">
                {p.rightLabel || `Cặp ${i + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dạng Sắp xếp */}
      {d.itemType === 'order' && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="min-h-10 rounded-lg border-2 border-dashed border-line bg-stone/50 p-2 text-xs text-muted flex flex-wrap gap-1.5 items-center">
            {d.referenceText ? (
              d.referenceText.split(/\s+/).map((w, wi) => (
                <span key={wi} className="rounded-md border border-line bg-surface px-2 py-1 font-bold text-ink shadow-xs">
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
        <div className="rounded-lg border border-line bg-stone/40 p-2 text-xs leading-relaxed">
          {d.passage || d.referenceText || 'I have a [cat].'}
        </div>
      )}

      {/* Dạng Nói / Ghi âm */}
      {(d.itemType === 'speak_repeat' || d.itemType === 'speak_read' || d.itemType === 'speak_picture') && (
        <div className="flex flex-col items-center gap-2 py-2">
          {d.referenceText && <div className="text-center text-xs font-bold text-ink">“{d.referenceText}”</div>}
          <div className="flex size-14 items-center justify-center rounded-full bg-[var(--blush-ink)] text-white shadow-md">
            <span className="text-lg">🎤</span>
          </div>
          <span className="text-[11px] text-muted">Bấm để nói ({d.maxSeconds || '15'}s)</span>
        </div>
      )}

      {/* Dạng Trắc nghiệm chuẩn */}
      {d.itemType === 'choice' && (
        <div className="flex flex-col gap-1.5 pt-1">
          {d.options.map((opt, i) => (
            <div
              key={opt.key || i}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                opt.isCorrect
                  ? 'border-[var(--accent)] bg-[var(--mint)] font-bold text-[var(--mint-ink)]'
                  : 'border-line bg-surface text-ink'
              }`}
            >
              <span>{String.fromCharCode(65 + i)}.</span>
              <span className="truncate flex-1">{opt.label || `Lựa chọn ${i + 1}`}</span>
              {opt.isCorrect && <span className="font-bold text-[var(--accent)]">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
