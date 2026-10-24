'use client';

import { Check, Mic, RotateCcw, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { StudentAssignmentView, StudentItem } from '@/lib/queries/student-portal';
import { childAgreeVoiceAction, submitMyAnswersAction, type StudentAnswerInput, type SubmitScore } from '@/app/(student)/cua-toi/actions';
import { useRouter } from 'next/navigation';
import { clock, pickRecordingFormat, recordedFormat, starsFor } from '@/lib/recording';
import { uploadAsStudent } from '@/lib/upload-client';

export type AnswerDraft = {
  selectedOptionId: number | null;
  answerText: string;
  fileId: number | null;
  fileName: string | null;
  isCorrect?: boolean;
};

export function InteractiveExercisePlayer({
  view,
  onExit,
}: {
  view: StudentAssignmentView;
  onExit?: () => void;
}) {
  const items = view.items;
  const total = items.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerDraft>>(() =>
    Object.fromEntries(
      view.answers.map((a) => [
        a.itemId,
        {
          selectedOptionId: a.selectedOptionId,
          answerText: a.answerText,
          fileId: a.fileId,
          fileName: a.fileName,
        },
      ]),
    ),
  );

  const [isFinished, setIsFinished] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [score, setScore] = useState<SubmitScore | null>(null);

  const currentItem: StudentItem | undefined = items[currentIndex];

  function patchAnswer(itemId: number, patch: Partial<AnswerDraft>) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  }

  function handleNext() {
    if (currentIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Hoàn thành hết các câu -> Nộp bài và hiển thị kết quả
      handleFinish();
    }
  }

  function handleFinish() {
    const payload: StudentAnswerInput[] = items.map((i) => {
      const a = answers[i.id];
      return {
        itemId: i.id,
        selectedOptionId: a?.selectedOptionId ?? null,
        answerText: a?.answerText ?? '',
        fileId: a?.fileId ?? null,
      };
    });

    startSubmit(async () => {
      const res = await submitMyAnswersAction(view.id, payload);
      if (!res.ok) {
        // Nộp không được thì ở lại câu cuối, báo lỗi để con bấm nộp lại
        setSubmitError(res.message ?? 'Lỗi khi nộp bài');
        return;
      }
      setSubmitError(null);
      setScore(res.score ?? null);
      setIsFinished(true);
    });
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-base text-muted">Bài tập này chưa có câu hỏi.</p>
        {onExit && (
          <button type="button" onClick={onExit} className="mt-4 text-sm font-bold text-[var(--link)] underline">
            Quay lại
          </button>
        )}
      </div>
    );
  }

  if (isFinished) {
    return <CelebrationScreen view={view} onExit={onExit} score={score} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-[36px] border border-line bg-surface shadow-2xl min-h-[640px]">
      {/* Top bar: Nút đóng, thanh tiến trình & số câu */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-2">
        <button
          type="button"
          onClick={onExit}
          aria-label="Thoát"
          className="flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-2 hover:bg-stone active:scale-95"
        >
          <X className="size-5" />
        </button>

        <div className="flex-1 h-3 rounded-full bg-stone overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${Math.round(((currentIndex + 1) / total) * 100)}%` }}
          />
        </div>

        <span className="text-xs font-extrabold text-muted">
          {currentIndex + 1}/{total}
        </span>
      </div>

      {/* Nội dung câu hỏi hiện tại */}
      {currentItem && (
        <ExerciseItem
          key={currentItem.id}
          item={currentItem}
          answer={answers[currentItem.id]}
          onChange={(patch) => patchAnswer(currentItem.id, patch)}
          onNext={handleNext}
          isLast={currentIndex === total - 1}
          submitting={submitting}
          voice={view.voice}
        />
      )}

      {submitError && (
        <p role="alert" className="mx-5 mb-5 rounded-2xl bg-[var(--blush)] p-3 text-sm font-semibold text-[var(--blush-ink)]">
          {submitError} Bấm nộp lại nhé.
        </p>
      )}
    </div>
  );
}

// ==========================================
// 1. TỪNG CÂU HỎI THEO DẠNG
// ==========================================
function ExerciseItem({
  item,
  answer,
  onChange,
  onNext,
  isLast,
  submitting,
  voice,
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
  onNext: () => void;
  isLast: boolean;
  submitting: boolean;
  voice: StudentAssignmentView['voice'];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  function playAudio() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  }

  // Tự động phát âm thanh khi chuyển câu (nếu có tệp âm thanh)
  useEffect(() => {
    if (item.audioFileId) {
      playAudio();
    }
  }, [item.id, item.audioFileId]);

  return (
    <div className="flex flex-1 flex-col justify-between p-5">
      {item.audioFileId && (
        <audio
          ref={audioRef}
          src={`/api/files/${item.audioFileId}`}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Phần Đề bài + Loa to + Lời nhắc tiếng Việt */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {item.audioFileId ? (
            <button
              type="button"
              onClick={playAudio}
              aria-label="Nghe lại âm thanh"
              className={`flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_4px_0_var(--primary-deep)] active:translate-y-1 transition-all ${
                isPlaying ? 'ring-4 ring-[var(--primary-soft)] animate-pulse' : ''
              }`}
            >
              <Volume2 className="size-7" />
            </button>
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-stone text-xl">
              ⭐
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black leading-tight text-ink">
              {item.prompt || 'Hãy trả lời câu hỏi sau:'}
            </h2>
            {item.promptVi && (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
                <span>🇻🇳</span>
                <span>{item.promptVi}</span>
              </div>
            )}
          </div>
        </div>

        {/* Nội dung đoạn văn / gợi ý nếu có */}
        {item.passage && (
          <div className="rounded-2xl border border-line bg-stone/40 p-3 text-sm font-medium text-ink leading-relaxed">
            {item.passage}
          </div>
        )}
      </div>

      {/* Thân câu hỏi theo từng dạng */}
      <div className="my-auto py-4">
        {item.itemType === 'picture_choice' && (
          <PictureChoiceQuestion item={item} answer={answer} onChange={onChange} />
        )}

        {item.itemType === 'match' && (
          <MatchQuestion item={item} answer={answer} onChange={onChange} />
        )}

        {item.itemType === 'order' && (
          <OrderQuestion item={item} answer={answer} onChange={onChange} />
        )}

        {item.itemType === 'gap_fill' && (
          <GapFillQuestion answer={answer} onChange={onChange} />
        )}

        {(item.itemType === 'speak_repeat' || item.itemType === 'speak_read' || item.itemType === 'speak_picture') &&
          (voice.allowed ? <SpeakQuestion item={item} answer={answer} onChange={onChange} /> : <VoiceGate needsChild={voice.needsChild} referenceText={item.referenceText ?? ''} />)}

        {item.itemType === 'choice' && (
          <ChoiceQuestion item={item} answer={answer} onChange={onChange} />
        )}

        {(item.itemType === 'text' || item.itemType === 'file') && (
          <TextOrFileQuestion answer={answer} onChange={onChange} />
        )}
      </div>

      {/* Nút Tiếp tục / Hoàn thành */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={submitting}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-lg font-black text-[var(--on-primary)] shadow-[0_4px_0_var(--primary-deep)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50"
        >
          {submitting ? 'Đang gửi…' : isLast ? 'Xong bài 🎉' : 'Tiếp tục ➔'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 2. DẠNG: CHỌN TRANH (picture_choice)
// ==========================================
function PictureChoiceQuestion({
  item,
  answer,
  onChange,
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSelect(optionId: number) {
    onChange({ selectedOptionId: optionId });
    setFeedback('Đã chọn đáp án!');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {item.options.map((opt) => {
          const isSelected = answer?.selectedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl border-3 p-3 transition-all active:scale-95 ${
                isSelected
                  ? 'border-[var(--accent)] bg-[var(--mint)] text-[var(--mint-ink)] shadow-md ring-2 ring-[var(--accent)]/30'
                  : 'border-line bg-surface hover:bg-stone/50 text-ink'
              }`}
            >
              {opt.imageFileId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${opt.imageFileId}`}
                  alt={opt.label}
                  className="max-h-24 max-w-full rounded-lg object-contain"
                />
              ) : leadingEmoji(opt.label) ? (
                <span className="text-6xl" aria-hidden>{leadingEmoji(opt.label)}</span>
              ) : (
                <span className="text-5xl" aria-hidden>🖼️</span>
              )}
              {opt.label && <span className="mt-2 max-w-full truncate text-base font-black">{stripLeadingEmoji(opt.label)}</span>}
              {isSelected && (
                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xs">
                  <Check className="size-4 stroke-[3]" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {feedback && (
        <div className="rounded-xl bg-[var(--mint)] p-2.5 text-center text-xs font-bold text-[var(--mint-ink)]">
          {feedback}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. DẠNG: GHÉP ĐÔI (match)
// ==========================================
function MatchQuestion({
  item,
  answer,
  onChange,
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [paired, setPaired] = useState<{ left: string; right: string }[]>(() => {
    try {
      return answer?.answerText ? JSON.parse(answer.answerText) : [];
    } catch {
      return [];
    }
  });

  // Hai cột đã xáo riêng trên máy chủ theo từng học sinh (cột phải không cùng thứ tự cột trái)
  const leftItems = item.matchLeft.map((s) => s.label).filter(Boolean);
  const rightItems = item.matchRight.map((s) => s.label).filter(Boolean);

  function handleSelectLeft(leftText: string) {
    if (paired.some((p) => p.left === leftText)) return;
    setSelectedLeft(leftText === selectedLeft ? null : leftText);
  }

  function handleSelectRight(rightText: string) {
    if (!selectedLeft) return;
    if (paired.some((p) => p.right === rightText)) return;

    const next = [...paired, { left: selectedLeft, right: rightText }];
    setPaired(next);
    setSelectedLeft(null);
    onChange({ answerText: JSON.stringify(next) });
  }

  function resetPairs() {
    setPaired([]);
    setSelectedLeft(null);
    onChange({ answerText: '' });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="font-bold">Chạm vế trái rồi chạm vế phải để nối</span>
        <button type="button" onClick={resetPairs} className="flex items-center gap-1 text-[var(--link)] font-bold">
          <RotateCcw className="size-3" /> Nối lại
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Cột trái */}
        <div className="flex flex-col gap-2">
          {leftItems.map((lt) => {
            const isPaired = paired.some((p) => p.left === lt);
            const isSel = selectedLeft === lt;
            return (
              <button
                key={lt}
                type="button"
                onClick={() => handleSelectLeft(lt)}
                disabled={isPaired}
                className={`flex h-13 items-center justify-center rounded-xl border-2 px-3 text-center text-sm font-black transition-all ${
                  isPaired
                    ? 'border-[var(--accent)] bg-[var(--mint)] text-[var(--mint-ink)] opacity-85'
                    : isSel
                    ? 'border-[var(--primary-deep)] bg-[var(--primary-soft)] text-ink scale-[1.02]'
                    : 'border-line bg-surface hover:bg-stone text-ink'
                }`}
              >
                {lt}
              </button>
            );
          })}
        </div>

        {/* Cột phải */}
        <div className="flex flex-col gap-2">
          {rightItems.map((rt) => {
            const isPaired = paired.some((p) => p.right === rt);
            return (
              <button
                key={rt}
                type="button"
                onClick={() => handleSelectRight(rt)}
                disabled={isPaired}
                className={`flex h-13 items-center justify-center rounded-xl border-2 px-3 text-center text-sm font-black transition-all ${
                  isPaired
                    ? 'border-[var(--accent)] bg-[var(--mint)] text-[var(--mint-ink)] opacity-85'
                    : 'border-line bg-surface hover:bg-stone text-ink'
                }`}
              >
                {rt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs font-bold text-muted">
        Đã ghép: {paired.length}/{item.matchLeft.length} cặp {paired.length === item.matchLeft.length && '🎉 Giỏi quá!'}
      </div>
    </div>
  );
}

// ==========================================
// 4. DẠNG: SẮP XẾP CÂU (order)
// ==========================================
function OrderQuestion({
  item,
  answer,
  onChange,
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  const [placedWords, setPlacedWords] = useState<string[]>(() =>
    answer?.answerText ? answer.answerText.split(/\s+/).filter(Boolean) : [],
  );

  // Các từ đã xáo trên máy chủ theo từng học sinh (mở lại vẫn cùng thứ tự; máy chủ không gửi câu đúng)
  const bankWords = item.orderWords;

  function addWord(word: string) {
    const next = [...placedWords, word];
    setPlacedWords(next);
    onChange({ answerText: next.join(' ') });
  }

  function removeWord(index: number) {
    const next = placedWords.filter((_, i) => i !== index);
    setPlacedWords(next);
    onChange({ answerText: next.join(' ') });
  }

  function reset() {
    setPlacedWords([]);
    onChange({ answerText: '' });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Khung ô câu đã xếp */}
      <div className="min-h-16 rounded-2xl border-2 border-dashed border-line bg-stone/30 p-3 flex flex-wrap items-center gap-2">
        {placedWords.length === 0 ? (
          <span className="text-xs text-muted">Chạm các từ bên dưới để ghép câu…</span>
        ) : (
          placedWords.map((w, wi) => (
            <button
              key={wi}
              type="button"
              onClick={() => removeWord(wi)}
              className="flex h-10 items-center justify-center rounded-xl border-2 border-[var(--primary-deep)] bg-[var(--primary-soft)] px-3 text-sm font-extrabold text-ink shadow-xs active:scale-95"
            >
              {w}
            </button>
          ))
        )}
      </div>

      {/* Ngân hàng từ */}
      <div className="flex flex-wrap gap-2">
        {bankWords.map((w, wi) => {
          // Kiểm tra xem từ này đã được dùng hết số lần xuất hiện chưa
          const usedCount = placedWords.filter((x) => x === w).length;
          const totalCount = bankWords.filter((x) => x === w).length;
          const isUsed = usedCount >= totalCount;

          return (
            <button
              key={wi}
              type="button"
              onClick={() => addWord(w)}
              disabled={isUsed}
              className={`flex h-11 items-center justify-center rounded-xl border-2 px-3.5 text-base font-extrabold shadow-sm transition-all active:scale-95 ${
                isUsed
                  ? 'invisible opacity-0'
                  : 'border-line bg-surface hover:bg-stone text-ink shadow-[0_3px_0_var(--line)]'
              }`}
            >
              {w}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 text-xs font-bold text-muted hover:text-ink"
        >
          <RotateCcw className="size-3.5" /> Xếp lại
        </button>
      </div>
    </div>
  );
}

// Nhãn đáp án bắt đầu bằng emoji (ví dụ "🐶 Puppy") thì dùng emoji làm tranh khi câu chưa có ảnh
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u;
function leadingEmoji(label: string): string | null {
  return LEADING_EMOJI.exec(label)?.[1] ?? null;
}
function stripLeadingEmoji(label: string): string {
  return label.replace(LEADING_EMOJI, '');
}

// ==========================================
// 5. DẠNG: ĐIỀN CHỖ TRỐNG (gap_fill)
// ==========================================
function GapFillQuestion({
  answer,
  onChange,
}: {
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-xs font-bold text-muted">Gõ từ còn thiếu vào ô:</label>
      <input
        type="text"
        value={answer?.answerText || ''}
        onChange={(e) => onChange({ answerText: e.target.value })}
        placeholder="Gõ từ của bạn…"
        className="h-14 w-full rounded-2xl border-2 border-line bg-surface px-4 text-lg font-bold text-ink outline-none focus:border-[var(--primary-deep)]"
      />
    </div>
  );
}

// ==========================================
// 6. DẠNG: GHI ÂM BÀI NÓI (speak_*)
// ==========================================
// Câu nói khi chưa được ghi âm (P35.12): chưa có đồng ý của phụ huynh thì nhắn bỏ qua câu;
// phụ huynh đã đồng ý mà trẻ từ 7 tuổi thì hỏi trẻ một câu đơn giản.
function VoiceGate({ needsChild, referenceText }: { needsChild: boolean; referenceText: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      {referenceText && <div className="rounded-2xl border border-line bg-stone/40 p-3 text-lg font-extrabold leading-relaxed text-ink">“{referenceText}”</div>}
      {needsChild ? (
        <>
          <span className="text-5xl" aria-hidden>
            🎤
          </span>
          <p className="text-lg font-extrabold leading-snug text-ink">Cô giáo muốn nghe giọng con để chấm bài nói. Con có đồng ý ghi âm không?</p>
          <p className="text-sm font-semibold text-muted">Bố mẹ con đã đồng ý rồi. Chỉ cô giáo, con và bố mẹ nghe được.</p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await childAgreeVoiceAction();
                setMsg(r.message);
                if (r.ok) router.refresh();
              })
            }
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-lg font-extrabold text-white shadow-[0_4px_0_#0e7445] disabled:opacity-60"
          >
            <Check className="size-5" aria-hidden />
            Con đồng ý
          </button>
          <span className="text-sm font-semibold text-muted">Chưa muốn thì con bấm Tiếp tục để làm câu khác.</span>
        </>
      ) : (
        <p role="note" className="w-full rounded-2xl bg-[var(--butter)] p-4 text-base font-bold leading-relaxed text-[var(--butter-ink)]">
          Câu này cần ghi âm, mà bố mẹ con chưa đồng ý cho con ghi âm. Con bấm Tiếp tục để làm câu khác nhé. Cô giáo sẽ hỏi bố mẹ.
        </p>
      )}
      {msg && <p className="text-sm font-bold text-ink-2">{msg}</p>}
    </div>
  );
}

// Lời nhắn khi không bật được micro: nói rõ cách cấp quyền thay cho hộp alert
function micHelp(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Chưa được phép dùng micro. Bấm biểu tượng ổ khoá cạnh địa chỉ trang, cho phép Micro rồi bấm lại. Trên iPhone: Cài đặt → Safari → Micro → Cho phép.';
  }
  if (name === 'NotFoundError') return 'Không tìm thấy micro trên máy này. Cắm tai nghe có micro hoặc dùng điện thoại.';
  return 'Không bật được micro. Đóng các ứng dụng khác đang dùng micro rồi thử lại.';
}

type RecPhase = 'idle' | 'recording' | 'review' | 'uploading';

// Ghi âm (P35.6): bấm để nói → đếm giây theo max_seconds, tự dừng khi hết giờ → nghe lại → Nói lại hoặc Dùng bản này.
// Định dạng theo máy (WebM Opus, Safari cũ là MP4). Tải thẳng lên kho tệp, chưa cấu hình thì qua máy chủ.
export function SpeakQuestion({
  item,
  answer,
  onChange,
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  const maxSec = item.maxSeconds || 15;
  const [phase, setPhase] = useState<RecPhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; file: File } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Rời câu thì tắt micro; bản nghe thử được giải phóng khi đổi hoặc rời câu
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  async function start() {
    setError(null);
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Trình duyệt này chưa ghi âm được. Hãy dùng Chrome, Edge hoặc Safari bản mới.');
      return;
    }
    const format = pickRecordingFormat((t) => MediaRecorder.isTypeSupported(t));
    if (!format) {
      setError('Trình duyệt này chưa ghi âm được. Hãy dùng Chrome, Edge hoặc Safari bản mới.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(micHelp(e));
      return;
    }
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream, { mimeType: format.mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const real = recordedFormat(recorder.mimeType, format);
      const blob = new Blob(chunksRef.current, { type: real.baseType });
      if (blob.size === 0) {
        setError('Chưa ghi được tiếng. Bấm micro rồi nói to hơn một chút.');
        setPhase('idle');
        return;
      }
      const file = new File([blob], `bai-noi-cau-${item.id}.${real.ext}`, { type: real.baseType });
      setPreview({ url: URL.createObjectURL(blob), file });
      setPhase('review');
    };
    recorder.start();
    setSeconds(0);
    setPhase('recording');
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  useEffect(() => {
    if (phase !== 'recording') return;
    const iv = setInterval(() => setSeconds((prev) => Math.min(prev + 1, maxSec)), 1000);
    return () => clearInterval(iv);
  }, [phase, maxSec]);

  // Hết thời gian thì tự dừng (dừng ở đây, không gọi trong hàm cập nhật state)
  useEffect(() => {
    if (phase === 'recording' && seconds >= maxSec && recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, [phase, seconds, maxSec]);

  function redo() {
    setPreview(null);
    setError(null);
    setPhase('idle');
  }

  async function keepRecording() {
    if (!preview) return;
    setPhase('uploading');
    setError(null);
    const r = await uploadAsStudent(preview.file);
    if (!r.ok) {
      setError(r.message);
      setPhase('review');
      return;
    }
    onChange({ fileId: r.fileId, fileName: r.name });
    setPreview(null);
    setPhase('idle');
  }

  const recording = phase === 'recording';
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {item.referenceText && (
        <div className="rounded-2xl border border-line bg-stone/40 p-3 text-center text-lg font-extrabold leading-relaxed text-ink">“{item.referenceText}”</div>
      )}

      {(phase === 'idle' || recording) && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={recording ? stop : start}
            aria-label={recording ? 'Dừng ghi âm' : 'Bấm để nói'}
            className={`relative flex size-28 items-center justify-center rounded-full bg-[var(--blush-ink)] text-white transition-all active:scale-95 ${
              recording ? 'ring-8 ring-[var(--blush)]' : 'shadow-[0_6px_0_#8c2c0f]'
            }`}
          >
            {recording ? <span className="size-8 rounded-lg bg-white" aria-hidden /> : <Mic className="size-11" aria-hidden />}
          </button>
          {recording ? (
            <>
              <span className="text-2xl font-extrabold tabular-nums text-ink" aria-live="polite">
                {clock(seconds)} / {clock(maxSec)}
              </span>
              <span className="flex h-8 items-center gap-1" aria-hidden>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <i key={i} className="w-1.5 animate-pulse rounded-full bg-[var(--blush-ink)]" style={{ height: `${10 + ((i * 7) % 20)}px`, animationDelay: `${i * 120}ms` }} />
                ))}
              </span>
              <span className="text-sm font-bold text-muted">Bấm ô vuông để dừng</span>
            </>
          ) : (
            <span className="text-base font-extrabold text-ink">{answer?.fileId ? 'Bấm để nói lại' : 'Bấm để nói'}</span>
          )}
        </div>
      )}

      {(phase === 'review' || phase === 'uploading') && preview && (
        <div className="flex w-full flex-col items-center gap-3">
          <span className="text-base font-extrabold text-ink">Nghe lại bài nói của con</span>
          <audio controls src={preview.url} className="w-full" aria-label="Nghe lại bản vừa ghi" />
          <div className="grid w-full grid-cols-2 gap-2">
            <button type="button" onClick={redo} disabled={phase === 'uploading'} className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-line bg-surface text-base font-extrabold text-ink disabled:opacity-50">
              <RotateCcw className="size-5" aria-hidden />
              Nói lại
            </button>
            <button type="button" onClick={keepRecording} disabled={phase === 'uploading'} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-base font-extrabold text-white shadow-[0_4px_0_#0e7445] disabled:opacity-60">
              <Check className="size-5" aria-hidden />
              {phase === 'uploading' ? 'Đang lưu…' : 'Dùng bản này'}
            </button>
          </div>
        </div>
      )}

      {phase === 'idle' && answer?.fileId && (
        <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-[var(--mint)] p-3">
          <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--mint-ink)]">
            <Check className="size-4" aria-hidden /> Đã lưu bản ghi âm
          </span>
          <audio controls preload="none" src={`/api/files/${answer.fileId}`} className="w-full" aria-label="Nghe bản đã lưu" />
        </div>
      )}

      {error && (
        <p role="alert" className="w-full rounded-2xl bg-[var(--blush)] p-3 text-sm font-semibold leading-relaxed text-[var(--blush-ink)]">
          {error}
        </p>
      )}
    </div>
  );
}

// ==========================================
// 7. DẠNG: TRẮC NGHIỆM CHỮ (choice)
// ==========================================
function ChoiceQuestion({
  item,
  answer,
  onChange,
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {item.options.map((opt, i) => {
        const isSelected = answer?.selectedOptionId === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange({ selectedOptionId: opt.id })}
            className={`flex h-13 items-center gap-3 rounded-2xl border-2 px-4 text-left text-sm font-black transition-all active:scale-[0.98] ${
              isSelected
                ? 'border-[var(--primary-deep)] bg-[var(--primary-soft)] text-ink shadow-sm'
                : 'border-line bg-surface hover:bg-stone text-ink'
            }`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stone text-xs font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1 truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ==========================================
// 8. DẠNG: VIẾT HOẶC NỘP TỆP
// ==========================================
function TextOrFileQuestion({
  answer,
  onChange,
}: {
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={answer?.answerText || ''}
        onChange={(e) => onChange({ answerText: e.target.value })}
        rows={4}
        placeholder="Nhập bài làm của bạn…"
        className="w-full rounded-2xl border-2 border-line p-3 text-base font-medium text-ink outline-none focus:border-[var(--primary-deep)]"
      />
    </div>
  );
}

// ==========================================
// 9. MÀN HÌNH TỔNG KẾT (Celebration / Results)
// ==========================================
// Màn chúc mừng (P35.27): sao theo điểm phần tự chấm (1–3 sao, không phạt), mở số sticker bằng số sao.
// Bài còn câu nói, viết thì báo cô giáo sẽ chấm tiếp.
function CelebrationScreen({
  view,
  onExit,
  score,
}: {
  view: StudentAssignmentView;
  onExit?: () => void;
  score: SubmitScore | null;
}) {
  const stickers = ['🦁', '🚀', '🌈', '🐙', '🎈', '🦄', '🍩', '🏰'];
  const stars = score ? starsFor(score.autoPoints, score.autoMax) : 3;
  const cheer = stars === 3 ? 'Tuyệt vời!' : stars === 2 ? 'Giỏi lắm!' : 'Cố lên nhé!';

  return (
    <div className="relative mx-auto flex w-full max-w-[420px] flex-col items-center justify-between overflow-hidden rounded-[36px] border border-line bg-surface p-6 text-center shadow-2xl min-h-[640px]">
      {/* Pháo giấy Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute size-2 rounded-xs opacity-80 animate-bounce"
            style={{
              left: `${(i * 5) % 100}%`,
              top: `${(i * 7) % 60}%`,
              backgroundColor: ['#FFC933', '#159E5E', '#FBD2BD', '#D8EEBA', '#7DB3FF'][i % 5],
              animationDuration: `${1.5 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 pt-6">
        <span className="text-7xl animate-pulse">🦉</span>
        <h1 className="text-3xl font-black text-ink">{cheer}</h1>
        <div className="flex gap-1.5 text-4xl" role="img" aria-label={`${stars} trên 3 sao`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? '' : 'opacity-30 grayscale'} aria-hidden>
              ⭐
            </span>
          ))}
        </div>
        <p className="text-sm font-semibold text-muted">Con đã làm xong bài &quot;{view.title}&quot;.</p>
        {score && score.autoMax > 0 && (
          <p className="text-base font-extrabold text-ink">
            Đúng {Math.round(score.autoPoints * 10) / 10}/{score.autoMax} điểm phần tự chấm
          </p>
        )}
        {score?.pendingReview && <p className="text-sm font-semibold text-muted">Cô giáo sẽ chấm phần nói và viết rồi gửi nhận xét cho con.</p>}
      </div>

      {/* Sticker mở khóa */}
      <div className="w-full rounded-2xl border border-line bg-stone/40 p-4 text-left">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Sticker của con</span>
          <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-extrabold text-[var(--on-primary)]">
            +{stars} sticker
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stickers.map((stk, i) => (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-xl text-2xl ${
                i < stars ? 'bg-[var(--butter)] ring-2 ring-[var(--primary-deep)]' : 'bg-surface opacity-30 grayscale'
              }`}
            >
              {stk}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full pt-4">
        <button
          type="button"
          onClick={onExit}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--primary)] text-lg font-black text-[var(--on-primary)] shadow-[0_4px_0_var(--primary-deep)] active:translate-y-1 transition-all"
        >
          Về bài của tôi ➔
        </button>
      </div>
    </div>
  );
}
