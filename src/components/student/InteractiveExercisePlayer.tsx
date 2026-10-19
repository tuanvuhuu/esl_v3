'use client';

import { Check, RotateCcw, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { StudentAssignmentView, StudentItem } from '@/lib/queries/student-portal';
import { studentUploadAction, submitMyAnswersAction, type StudentAnswerInput } from '@/app/(student)/cua-toi/actions';

type AnswerDraft = {
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
        setSubmitError(res.message ?? 'Lỗi khi nộp bài');
      }
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
    return <CelebrationScreen view={view} onExit={onExit} error={submitError} />;
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
        />
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
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
  onNext: () => void;
  isLast: boolean;
  submitting: boolean;
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

        {(item.itemType === 'speak_repeat' || item.itemType === 'speak_read' || item.itemType === 'speak_picture') && (
          <SpeakQuestion item={item} answer={answer} onChange={onChange} />
        )}

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

  const leftItems = item.pairs.map((p) => p.leftLabel || '').filter(Boolean);
  const rightItems = item.pairs.map((p) => p.rightLabel || '').filter(Boolean);

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
        Đã ghép: {paired.length}/{item.pairs.length} cặp {paired.length === item.pairs.length && '🎉 Giỏi quá!'}
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
  const targetWords = (item.referenceText || '').split(/\s+/).filter(Boolean);
  const [placedWords, setPlacedWords] = useState<string[]>(() =>
    answer?.answerText ? answer.answerText.split(/\s+/).filter(Boolean) : [],
  );

  // Xáo trộn ngân hàng từ
  const [bankWords] = useState<string[]>(() => {
    const list = [...targetWords];
    return list.sort(() => Math.random() - 0.5);
  });

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
function SpeakQuestion({
  item,
  answer,
  onChange,
}: {
  item: StudentItem;
  answer: AnswerDraft | undefined;
  onChange: (patch: Partial<AnswerDraft>) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const maxSec = item.maxSeconds || 15;

  const [uploading, startUpload] = useTransition();

  // Mô phỏng / ghi âm HTML5 Web Audio / MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  async function toggleRecord() {
    if (recording) {
      // Dừng ghi âm
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
    } else {
      // Bắt đầu ghi âm
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        audioChunksRef.current = [];

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

          const fd = new FormData();
          fd.append('file', audioFile);

          startUpload(async () => {
            const res = await studentUploadAction(fd);
            if (res.ok) {
              onChange({ fileId: res.fileId, fileName: res.name });
            }
          });
        };

        mr.start();
        setRecording(true);
        setSeconds(0);
      } catch {
        alert('Vui lòng cấp quyền truy cập micro để làm bài nói!');
      }
    }
  }

  useEffect(() => {
    let iv: NodeJS.Timeout;
    if (recording) {
      iv = setInterval(() => setSeconds((prev) => Math.min(prev + 1, maxSec)), 1000);
    }
    return () => clearInterval(iv);
  }, [recording, maxSec]);

  // Hết thời gian thì tự dừng ghi âm (dừng ở đây, không gọi trong hàm cập nhật state)
  useEffect(() => {
    if (recording && seconds >= maxSec && mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording, seconds, maxSec]);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {item.referenceText && (
        <div className="rounded-2xl border border-line bg-stone/40 p-3 text-center text-base font-extrabold text-ink leading-relaxed">
          “{item.referenceText}”
        </div>
      )}

      {/* Vòng tròn ghi âm to */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={toggleRecord}
          disabled={uploading}
          className={`relative flex size-24 items-center justify-center rounded-full text-white shadow-lg active:scale-95 transition-all ${
            recording
              ? 'bg-red-600 ring-8 ring-red-200 animate-pulse'
              : 'bg-[var(--blush-ink)] hover:opacity-90 shadow-[0_4px_0_#8c2c0f]'
          }`}
        >
          <span className="text-3xl">🎤</span>
        </button>

        <span className="text-sm font-extrabold text-ink">
          {recording ? `Đang ghi âm… 0:${String(seconds).padStart(2, '0')} / 0:${maxSec}` : 'Chạm để nói'}
        </span>
      </div>

      {answer?.fileId && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--mint)] px-3 py-1.5 text-xs font-bold text-[var(--mint-ink)]">
          <Check className="size-4" /> Đã lưu bản ghi âm
        </div>
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
function CelebrationScreen({
  view,
  onExit,
  error,
}: {
  view: StudentAssignmentView;
  onExit?: () => void;
  error?: string | null;
}) {
  const stickers = ['🦁', '🚀', '🌈', '🐙', '🎈', '🦄', '🍩', '🏰'];

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
        <h1 className="text-3xl font-black text-ink">Xong bài rồi!</h1>
        <div className="flex gap-1.5 text-4xl">
          <span>⭐</span>
          <span>⭐</span>
          <span>⭐</span>
        </div>
        <p className="text-sm font-semibold text-muted">
          Con đã hoàn thành toàn bộ bài tập &quot;{view.title}&quot;!
        </p>

        {error && <div className="rounded-xl bg-red-100 p-2 text-xs font-bold text-red-600">{error}</div>}
      </div>

      {/* Sticker mở khóa */}
      <div className="w-full rounded-2xl border border-line bg-stone/40 p-4 text-left">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">Sticker của con</span>
          <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--on-primary)]">
            Mới mở khóa!
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {stickers.map((stk, i) => (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-xl text-2xl ${
                i === 3 ? 'bg-[var(--butter)] ring-2 ring-[var(--primary-deep)] scale-105' : 'bg-surface'
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
