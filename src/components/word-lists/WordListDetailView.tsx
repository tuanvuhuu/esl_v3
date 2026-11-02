'use client';

import { BookIcon, UnmuteIcon } from '@primer/octicons-react';
import { GameHub } from '@/components/games/GameHub';
import { say } from '@/components/games/shared';
import { PageCrumbs } from '@/components/shell/PageCrumbs';
import { ActIcon } from '@/components/ui/ActIcon';
import { Pill } from '@/components/ui/primitives';
import { EmptyPanel } from '@/components/ui/surfaces';
import type { WordListItem } from '@/lib/queries/word-lists';

// Màn chi tiết danh sách từ cho giáo viên: bảng thẻ từ vựng chuẩn Tsukuba kết hợp khung chơi thử tương tác.
export function WordListDetailView({
  title,
  words,
}: {
  title: string;
  words: WordListItem[];
}) {
  const sentenceCount = words.filter((w) => w.sentence.trim() !== '').length;
  const audioCount = words.filter((w) => w.audioFileId !== null).length;

  return (
    <div className="flex flex-col gap-4">
      <PageCrumbs crumbs={['Đào tạo', 'Danh sách từ', title]} />

      <div className="grid grid-cols-1 items-start gap-5 min-[1024px]:grid-cols-[minmax(0,1.35fr)_minmax(380px,460px)]">
        {/* Cột từ vựng chi tiết */}
        <section className="tsukuba-rise order-2 overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] min-[1024px]:order-1">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-3">
            <div className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fgColor-muted)]">
                Danh mục từ vựng
              </span>
              <h2 className="m-0 truncate text-base font-semibold text-[var(--fgColor-default)]">
                {title}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-2.5 py-0.5 font-mono text-xs tabular-nums text-[var(--fgColor-default)]">
                {words.length} từ
              </span>
              {sentenceCount > 0 && (
                <Pill tone="mint">{sentenceCount} câu mẫu</Pill>
              )}
              {audioCount > 0 && (
                <Pill tone="lav">{audioCount} tệp đọc</Pill>
              )}
            </div>
          </header>

          {words.length === 0 ? (
            <div className="p-4">
              <EmptyPanel
                title="Danh sách chưa có từ nào"
                hint="Quay lại trang Danh sách từ và bấm Sửa để thêm từ vựng."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--borderColor-muted)]" aria-label="Các từ trong bộ">
              {words.map((w, idx) => {
                const posLabel = w.word.trim().includes(' ') ? 'phr.' : 'vocab';
                return (
                  <li
                    key={`${w.word}-${idx}`}
                    className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--row-hover,var(--bgColor-muted))]"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-[var(--borderRadius-medium)] bg-[var(--primary-soft)] px-1.5 font-mono text-xs tabular-nums text-[var(--primary-deep)]">
                        #{idx + 1}
                      </span>

                      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)]">
                        {w.imageFileId ? (
                          // eslint-disable-next-line @next/next/no-img-element -- ảnh do giáo viên tải lên
                          <img
                            src={`/api/files/${w.imageFileId}`}
                            alt={w.meaningVi || w.word}
                            className="size-full object-cover"
                          />
                        ) : w.emoji ? (
                          <span className="text-2xl leading-none" aria-hidden>
                            {w.emoji}
                          </span>
                        ) : (
                          <BookIcon size={18} className="text-[var(--fgColor-muted)]" aria-hidden />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <b className="text-base font-semibold text-[var(--fgColor-default)] [overflow-wrap:anywhere]">
                            {w.word}
                          </b>
                          <span className="font-mono text-xs text-[var(--fgColor-muted)]">
                            /{w.word.trim().toLowerCase()}/
                          </span>
                          <Pill tone={posLabel === 'phr.' ? 'stone' : 'lav'}>
                            {posLabel}
                          </Pill>
                        </div>

                        {w.meaningVi && (
                          <p className="mt-0.5 text-sm text-[var(--fgColor-default)]">
                            {w.meaningVi}
                          </p>
                        )}

                        {w.sentence.trim() !== '' && (
                          <p className="mt-1 text-xs italic text-[var(--fgColor-muted)] [overflow-wrap:anywhere]">
                            “{w.sentence}”
                          </p>
                        )}
                      </div>
                    </div>

                    <ActIcon
                      label={`Phát âm ${w.word}`}
                      icon={UnmuteIcon}
                      onClick={() => say(w)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Khung chơi thử cho giáo viên */}
        <div className="tsukuba-rise order-1 overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] min-[1024px]:order-2">
          <div className="border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fgColor-muted)]">
              Chơi thử như học sinh
            </span>
          </div>
          <div className="p-4">
            <GameHub
              title={title}
              words={words}
              backHref="/tu-vung"
              backLabel="Danh sách từ"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
