'use client';

// Soạn nhanh (P36.3): dán danh sách từ, chọn từ có sẵn hoặc dán câu → chọn dạng câu → xem lại → thêm vào bài.
// Bản mẫu: docs/mockups/soan-nhanh.html. Máy tính: menu ⋯ trên từng câu. Điện thoại: thẻ có nút chữ, nút chính dính đáy (chân Modal).
import { ArrowLeftRight, Check, Shuffle, Trash2, Zap } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import type { ItemInput } from '@/app/(app)/bai-tap/question-actions';
import { LEVEL_LABELS, LEVEL_PARAMS, levelParams, type LevelParams } from '@/lib/level-params';
import {
  canReroll,
  canSwitch,
  defaultCounts,
  fromStarter,
  generateItems,
  maxCount,
  parseWordList,
  QUICK_TYPES,
  rerollItem,
  splitSentences,
  switchItem,
  typeAvailability,
  type GeneratedItem,
  type QuickType,
  type QuickWord,
} from '@/lib/quick-compose';
import { STARTER_TOPIC_LABELS, starterWordsUpTo, type StarterTopic, type StarterWord } from '@/lib/vocab-starter';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { Field, FormFooter, textareaClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Pill } from '@/components/ui/primitives';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { Notice } from '@/components/ui/surfaces';

type Source = 'paste' | 'bank' | 'sentences';
type Step = 1 | 2 | 3;
const LEVEL_CODES = ['Pre-A1', 'A1', 'A2'] as const;
const TOPICS = Object.keys(STARTER_TOPIC_LABELS) as StarterTopic[];
const STEP_NAMES = ['Nguồn', 'Dạng câu', 'Xem lại'];
const typeMeta = (id: QuickType) => QUICK_TYPES.find((t) => t.id === id)!;
const pickId = (w: StarterWord) => `${w.topic}:${w.en}`;

export function QuickCompose({ open, levelCode, onClose, onAdd }: { open: boolean; levelCode: string | null; onClose: () => void; onAdd: (items: ItemInput[]) => void }) {
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source>('paste');
  const [raw, setRaw] = useState('');
  const [sentRaw, setSentRaw] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [level, setLevel] = useState<LevelParams>(() => levelParams(levelCode));
  const [topic, setTopic] = useState<StarterTopic>('Animals');
  const [counts, setCounts] = useState<Record<QuickType, number> | null>(null);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [dropKey, setDropKey] = useState<string | null>(null);

  // Từ dán vào và từ chọn trong bộ từ có sẵn gộp thành một danh sách, không lặp.
  // Từ chọn ghi theo "chủ đề:từ" vì một từ có thể nằm ở hai chủ đề với hai nghĩa (chicken: con gà, thịt gà).
  const words = useMemo<QuickWord[]>(() => {
    const out = parseWordList(raw);
    const seen = new Set(out.map((w) => w.en.toLowerCase()));
    for (const w of starterWordsUpTo('A2')) {
      if (!picked.includes(pickId(w)) || seen.has(w.en.toLowerCase())) continue;
      seen.add(w.en.toLowerCase());
      out.push(fromStarter(w));
    }
    return out;
  }, [raw, picked]);
  const sentences = useMemo(() => splitSentences(sentRaw), [sentRaw]);
  const hasInput = words.length > 0 || sentences.length > 0;

  const activeCounts = counts ?? defaultCounts(words, sentences, level);
  const plannedTotal = QUICK_TYPES.reduce((sum, t) => (typeAvailability(t.id, words, sentences, level) === true ? sum + Math.min(activeCounts[t.id], maxCount(t.id, words, sentences, level)) : sum), 0);

  function goTo(next: Step) {
    if (next >= 2 && !hasInput) return;
    if (next === 2 && !counts) setCounts(defaultCounts(words, sentences, level));
    if (next === 3) setItems(generateItems({ words, sentences, level, counts: activeCounts }));
    setStep(next);
  }

  function setCount(id: QuickType, value: number) {
    const max = maxCount(id, words, sentences, level);
    setCounts({ ...activeCounts, [id]: Math.max(0, Math.min(max, value)) });
  }

  function toggleType(id: QuickType) {
    if (typeAvailability(id, words, sentences, level) !== true) return;
    setCount(id, activeCounts[id] > 0 ? 0 : Math.min(defaultCounts(words, sentences, level)[id] || 1, maxCount(id, words, sentences, level)));
  }

  function changeLevel(code: (typeof LEVEL_CODES)[number]) {
    setLevel(LEVEL_PARAMS[code]);
    setCounts(null);
  }

  function togglePick(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function pickCommon() {
    const pool = starterWordsUpTo(level.code, topic).map(pickId);
    setPicked((prev) => [...new Set([...prev, ...pool.slice(0, 8)])]);
  }

  const replaceItem = (key: string, next: GeneratedItem | null) => {
    if (next) setItems((prev) => prev.map((x) => (x.key === key ? next : x)));
  };

  const totalPoints = items.reduce((s, it) => s + it.input.points, 0);
  const dropItem = items.find((x) => x.key === dropKey);

  const footer =
    step === 1 ? (
      <FormFooter className="mt-0">
        <Btn onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={() => goTo(2)} disabled={!hasInput}>
          Tiếp: chọn dạng câu
        </Btn>
      </FormFooter>
    ) : step === 2 ? (
      <FormFooter className="mt-0">
        <Btn onClick={() => setStep(1)}>Quay lại</Btn>
        <Btn variant="primary" onClick={() => goTo(3)} disabled={plannedTotal === 0}>
          Sinh {plannedTotal} câu
        </Btn>
      </FormFooter>
    ) : (
      <FormFooter className="mt-0">
        <Btn onClick={() => setStep(2)}>Quay lại</Btn>
        <Btn variant="primary" onClick={() => onAdd(items.map((x) => x.input))} disabled={items.length === 0}>
          Thêm {items.length} câu vào bài
        </Btn>
      </FormFooter>
    );

  return (
    <Modal open={open} title="Soạn nhanh" subtitle={`Trình độ ${LEVEL_LABELS[level.code]}. Câu sinh ra được sửa tiếp trong màn soạn như câu tự soạn.`} onClose={onClose} labelledBy="quick-compose-title" footer={footer}>
      <div className="flex flex-col gap-4">
        <ol aria-label="Các bước" className="flex flex-wrap items-center gap-2">
          {STEP_NAMES.map((name, i) => {
            const n = (i + 1) as Step;
            const done = n < step;
            const current = n === step;
            return (
              <li key={name} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="h-0.5 w-5 rounded bg-line max-[767px]:hidden" />}
                <button
                  type="button"
                  onClick={() => goTo(n)}
                  disabled={n > 1 && !hasInput}
                  aria-current={current ? 'step' : undefined}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border pl-1.5 pr-3.5 text-md font-bold transition-colors disabled:opacity-40 ${current ? 'border-primary-deep bg-primary-soft text-ink' : 'border-line bg-surface text-ink-2'}`}
                >
                  <span className={`grid size-7 place-items-center rounded-full text-base font-extrabold ${done ? 'bg-accent text-white' : current ? 'bg-primary text-on-primary' : 'bg-stone text-stone-ink'}`}>
                    {done ? <Check className="size-4" aria-hidden /> : n}
                  </span>
                  {name}
                </button>
              </li>
            );
          })}
        </ol>

        {step === 1 && (
          <>
            <ChipGroup label="Nguồn câu hỏi" tabs className="flex-nowrap overflow-x-auto pb-0.5">
              <Chip tab selected={source === 'paste'} onClick={() => setSource('paste')}>
                Dán danh sách từ
              </Chip>
              <Chip tab selected={source === 'bank'} onClick={() => setSource('bank')}>
                Chọn từ có sẵn
              </Chip>
              <Chip tab selected={source === 'sentences'} onClick={() => setSource('sentences')}>
                Dán câu
              </Chip>
            </ChipGroup>

            <div className="grid grid-cols-1 gap-4 min-[768px]:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-3">
                {source === 'paste' && (
                  <Field label="Mỗi dòng một từ: từ - nghĩa - emoji. Ngăn bằng tab, “ - ”, “|” hoặc dấu phẩy.">
                    <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={10} spellCheck={false} placeholder={'cat - con mèo - 🐱\ndog - con chó\nfish'} aria-label="Danh sách từ" className={textareaClass()} />
                  </Field>
                )}
                {source === 'sentences' && (
                  <>
                    <Field label="Dán vài câu tiếng Anh, ví dụ câu trong bài đọc của sách.">
                      <textarea value={sentRaw} onChange={(e) => setSentRaw(e.target.value)} rows={8} spellCheck={false} placeholder="I have a little dog. The monkey likes bananas." aria-label="Câu tiếng Anh" className={textareaClass()} />
                    </Field>
                    <Notice>
                      Đã nhận {sentences.length} câu. Câu dài {level.orderWords[0]}–{level.orderWords[1]} từ dùng cho sắp xếp; từ có trong danh sách được chọn để đục lỗ.
                    </Notice>
                  </>
                )}
                {source === 'bank' && (
                  <>
                    <ChipGroup label="Trình độ">
                      {LEVEL_CODES.map((c) => (
                        <Chip key={c} selected={level.code === c} onClick={() => changeLevel(c)}>
                          {LEVEL_LABELS[c]}
                        </Chip>
                      ))}
                    </ChipGroup>
                    <ChipGroup label="Chủ đề">
                      {TOPICS.map((t) => (
                        <Chip key={t} selected={topic === t} onClick={() => setTopic(t)}>
                          {STARTER_TOPIC_LABELS[t]}
                        </Chip>
                      ))}
                    </ChipGroup>
                    <div>
                      <Btn onClick={pickCommon}>
                        <Zap className="size-4" aria-hidden />
                        Chọn 8 từ hay gặp
                      </Btn>
                    </div>
                    <div role="group" aria-label="Từ có sẵn" className="grid grid-cols-2 gap-2 min-[1200px]:grid-cols-3">
                      {starterWordsUpTo(level.code, topic).map((w) => {
                        const on = picked.includes(pickId(w));
                        return (
                          <button
                            key={w.en}
                            type="button"
                            aria-pressed={on}
                            onClick={() => togglePick(pickId(w))}
                            className={`flex min-h-[52px] min-w-0 items-center gap-2.5 rounded-[var(--radius-ctl)] border px-2.5 py-1.5 text-left transition-colors ${on ? 'border-primary-deep bg-primary-soft' : 'border-line bg-surface hover:bg-row-hover'}`}
                          >
                            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-stone text-[22px]">{w.emoji || '·'}</span>
                            <span className="min-w-0 flex-1">
                              <b className="block truncate text-md text-ink">{w.en}</b>
                              <span className="block truncate text-sm text-muted">{w.vi}</span>
                            </span>
                            <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${on ? 'border-accent bg-accent text-white' : 'border-line'}`}>
                              {on && <Check className="size-3.5" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <ParsedWords words={words} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div role="group" aria-label="Dạng câu" className="grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4">
              {QUICK_TYPES.map((t) => {
                const can = typeAvailability(t.id, words, sentences, level);
                const count = can === true ? Math.min(activeCounts[t.id], maxCount(t.id, words, sentences, level)) : 0;
                const on = count > 0;
                const onKey = (e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleType(t.id);
                  }
                };
                return (
                  <div
                    key={t.id}
                    role="checkbox"
                    aria-checked={on}
                    aria-disabled={can !== true}
                    aria-label={t.label}
                    tabIndex={0}
                    onClick={() => toggleType(t.id)}
                    onKeyDown={onKey}
                    className={`relative flex min-h-[132px] cursor-pointer flex-col gap-1.5 rounded-[18px] border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${can !== true ? 'cursor-not-allowed border-line bg-stone' : on ? 'border-primary-deep bg-primary-soft' : 'border-line bg-surface hover:bg-row-hover'}`}
                  >
                    <span aria-hidden className={`absolute right-3 top-3 grid size-5 place-items-center rounded-md border-2 ${on ? 'border-accent bg-accent text-white' : 'border-line'}`}>
                      {on && <Check className="size-3.5" />}
                    </span>
                    <span aria-hidden className={`text-[26px] leading-none ${can !== true ? 'opacity-50' : ''}`}>{t.icon}</span>
                    <b className={`pr-6 text-md ${can !== true ? 'text-muted' : 'text-ink'}`}>{t.label}</b>
                    <span className={`text-sm ${can !== true ? 'text-blush-ink' : 'text-muted'}`}>
                      {can !== true ? can : t.perWord ? 'Mỗi từ một câu' : t.id === 'match' ? `${level.pairs[0]}–${level.pairs[1]} cặp một câu` : `${maxCount(t.id, words, sentences, level)} câu hợp lệ`}
                    </span>
                    {can === true && (
                      <span className="mt-auto inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <button type="button" aria-label={`Bớt một câu ${t.label}`} onClick={() => setCount(t.id, count - 1)} disabled={count === 0} className="grid size-7 place-items-center rounded-lg border border-line bg-surface font-extrabold disabled:opacity-40 max-[767px]:size-9">
                          −
                        </button>
                        <span className="min-w-7 text-center font-bold tabular-nums" aria-live="polite">{count}</span>
                        <button type="button" aria-label={`Thêm một câu ${t.label}`} onClick={() => setCount(t.id, count + 1)} disabled={count >= maxCount(t.id, words, sentences, level)} className="grid size-7 place-items-center rounded-lg border border-line bg-surface font-extrabold disabled:opacity-40 max-[767px]:size-9">
                          +
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <section aria-label="Độ khó theo trình độ" className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-extrabold text-ink">Độ khó theo trình độ</h3>
                <ChipGroup label="Trình độ">
                  {LEVEL_CODES.map((c) => (
                    <Chip key={c} selected={level.code === c} onClick={() => changeLevel(c)}>
                      {LEVEL_LABELS[c]}
                    </Chip>
                  ))}
                </ChipGroup>
              </div>
              <dl className="grid grid-cols-1 gap-x-4 min-[768px]:grid-cols-3">
                {[
                  ['Chọn tranh', `${level.pictureOptions} lựa chọn`],
                  ['Ghép đôi', `${level.pairs[0]}–${level.pairs[1]} cặp`],
                  ['Sắp xếp câu', `${level.orderWords[0]}–${level.orderWords[1]} từ`],
                  ['Trắc nghiệm nghĩa', `${level.meaningOptions} đáp án`],
                  ['Nhắc lại, đọc to', `${level.speakSeconds} giây`],
                  ['Cỡ bài gợi ý', `${level.lessonSize[0]}–${level.lessonSize[1]} câu`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-line py-2 text-base">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        )}

        {step === 3 && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-primary-soft px-4 py-3">
              <dl className="flex flex-wrap gap-5">
                {[
                  [items.length, 'câu'],
                  [totalPoints, 'điểm'],
                  [new Set(items.map((x) => x.quickType)).size, 'dạng'],
                ].map(([v, k]) => (
                  <div key={k} className="flex flex-col">
                    <dd className="text-2xl font-extrabold leading-tight text-ink">{v}</dd>
                    <dt className="text-sm text-ink-2">{k}</dt>
                  </div>
                ))}
              </dl>
              <Pill tone="lav">{LEVEL_LABELS[level.code]}</Pill>
            </div>

            {items.length === 0 ? (
              <Notice>Chưa có câu nào. Quay lại bước 2 để chọn dạng câu.</Notice>
            ) : (
              <ol aria-label="Câu đã sinh" className="flex flex-col">
                {items.map((it, i) => {
                  const meta = typeMeta(it.quickType);
                  const reroll = () => replaceItem(it.key, rerollItem(it, words, level));
                  const swap = () => replaceItem(it.key, switchItem(it, words, level));
                  const menu: RowMenuItem[] = [
                    ...(canReroll(it) ? [{ kind: 'action' as const, label: 'Bốc lại đáp án nhiễu', icon: Shuffle, onSelect: reroll }] : []),
                    ...(canSwitch(it) ? [{ kind: 'action' as const, label: it.quickType === 'picture' ? 'Đổi sang trắc nghiệm nghĩa' : 'Đổi sang chọn tranh', icon: ArrowLeftRight, onSelect: swap }] : []),
                    { kind: 'action', label: 'Bỏ câu', icon: Trash2, danger: true, onSelect: () => setDropKey(it.key) },
                  ];
                  return (
                    <li key={it.key} aria-label={`Câu ${i + 1}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 gap-y-2 border-b border-line py-3 min-[768px]:grid-cols-[28px_minmax(0,1fr)_minmax(0,300px)_auto] min-[768px]:items-center">
                      <span className="pt-0.5 text-center font-extrabold tabular-nums text-muted">{i + 1}</span>
                      <div className="min-w-0">
                        <b className="block text-md text-ink">{it.input.prompt}</b>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
                          <Pill tone="stone">
                            {meta.icon} {meta.label}
                          </Pill>
                          {it.input.promptVi}
                        </span>
                      </div>
                      <div className="col-start-2 min-[768px]:col-start-auto">
                        <MiniPreview item={it} />
                      </div>
                      <div className="max-[767px]:hidden">
                        <RowMenu label={`Thao tác câu ${i + 1}`} items={menu} />
                      </div>
                      <div className="col-start-2 grid grid-cols-3 gap-1.5 min-[768px]:hidden">
                        <Btn onClick={reroll} disabled={!canReroll(it)} className="px-1.5">
                          <Shuffle className="size-4" aria-hidden />
                          Bốc lại
                        </Btn>
                        <Btn onClick={swap} disabled={!canSwitch(it)} className="px-1.5">
                          <ArrowLeftRight className="size-4" aria-hidden />
                          Đổi dạng
                        </Btn>
                        <Btn variant="danger" onClick={() => setDropKey(it.key)} className="px-1.5">
                          <Trash2 className="size-4" aria-hidden />
                          Bỏ
                        </Btn>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!dropItem}
        title="Bỏ câu này khỏi bản nháp?"
        text={dropItem ? `“${dropItem.input.prompt}” sẽ không được thêm vào bài. Các câu khác giữ nguyên.` : ''}
        confirmLabel="Bỏ câu"
        onCancel={() => setDropKey(null)}
        onConfirm={() => {
          setItems((prev) => prev.filter((x) => x.key !== dropKey));
          setDropKey(null);
        }}
      />
    </Modal>
  );
}

// Danh sách từ đã nhận: máy tính là bảng, điện thoại là chip. Nghĩa và emoji lấy từ bộ từ có sẵn hiện chữ xanh.
function ParsedWords({ words }: { words: QuickWord[] }) {
  const missing = words.filter((w) => !w.vi).length;
  return (
    <section aria-label="Từ đã nhận" className="flex min-w-0 flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-lg font-extrabold text-ink">{words.length} từ đã nhận</h3>
        {missing > 0 && <span className="text-sm text-muted">{missing} từ chưa có nghĩa</span>}
      </div>
      {words.length === 0 ? (
        <Notice>Chưa có từ nào. Dán mỗi dòng một từ, hoặc chọn từ có sẵn.</Notice>
      ) : (
        <>
          <ul className="flex flex-col max-[767px]:hidden">
            {words.map((w) => (
              <li key={w.en} className="grid min-h-12 grid-cols-[40px_minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-2.5 border-b border-line px-1 py-1 last:border-b-0">
                <span aria-hidden className={`grid size-10 place-items-center rounded-[var(--radius-ctl)] text-2xl ${w.emoji ? 'bg-stone' : 'border border-dashed border-line text-sm text-muted'}`}>{w.emoji || '—'}</span>
                <b className="truncate text-md text-ink">{w.en}</b>
                <span className={`truncate text-md ${!w.vi ? 'italic text-muted' : w.viFromBank ? 'text-link' : 'text-ink-2'}`}>{w.vi || 'Chưa có nghĩa'}</span>
                {!w.vi ? <Pill tone="butter">Cần nghĩa</Pill> : w.viFromBank || w.emojiFromBank ? <Pill tone="lav">Có sẵn</Pill> : <Pill tone="mint">Đủ</Pill>}
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-1.5 min-[768px]:hidden">
            {words.map((w) => (
              <li key={w.en} className={`inline-flex h-[var(--chip-h-touch)] items-center gap-1.5 rounded-full pl-1.5 pr-3 text-base font-semibold ${w.vi ? 'bg-stone text-ink' : 'bg-butter text-butter-ink'}`}>
                <span aria-hidden className="text-xl">{w.emoji || '❔'}</span>
                {w.en}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">Chữ xanh là nghĩa lấy từ bộ từ có sẵn. Từ chưa có nghĩa vẫn dùng được cho nghe nhắc lại và viết.</p>
        </>
      )}
    </section>
  );
}

// Xem trước gọn của một câu: tranh, đáp án, cặp ghép hoặc câu chuẩn; đáp án đúng tô xanh
function MiniPreview({ item }: { item: GeneratedItem }) {
  const { input, quickType } = item;
  const box = 'inline-flex min-h-10 items-center justify-center rounded-[10px] border-2 px-2 text-base font-bold';
  if (quickType === 'picture') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {input.options.map((o) => {
          const [emoji] = o.label.split(' ');
          return (
            <span key={o.label} title={o.label} className={`${box} size-10 px-0 text-[22px] ${o.isCorrect ? 'border-accent bg-mint' : 'border-line bg-surface'}`}>
              {emoji}
            </span>
          );
        })}
      </div>
    );
  }
  if (quickType === 'meaning') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {input.options.map((o) => (
          <span key={o.label} className={`${box} ${o.isCorrect ? 'border-accent bg-mint text-mint-ink' : 'border-line bg-surface text-ink'}`}>
            {o.label}
          </span>
        ))}
      </div>
    );
  }
  if (quickType === 'match') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(input.pairs ?? []).map((p) => (
          <span key={p.leftLabel} className="inline-flex min-h-8 items-center rounded-[10px] border-2 border-line bg-surface px-2 text-sm font-semibold text-ink">
            {p.leftLabel} → {p.rightLabel}
          </span>
        ))}
      </div>
    );
  }
  if (quickType === 'order') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(input.referenceText ?? '').split(/\s+/).map((w, i) => (
          <span key={i} className={`${box} border-line bg-surface text-ink`}>
            {w}
          </span>
        ))}
      </div>
    );
  }
  const icon = quickType === 'write' ? '✍️' : quickType === 'gap' ? '✏️' : '🎤';
  const text = quickType === 'write' ? 'Bài viết' : input.referenceText;
  return <span className={`${box} border-accent bg-mint text-mint-ink`}>{`${icon} ${text}`}</span>;
}
