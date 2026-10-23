'use client';

import { Paperclip, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { submitMyAnswersAction, type StudentAnswerInput } from '@/app/(student)/cua-toi/actions';
import { uploadAsStudent } from '@/lib/upload-client';
import { ITEM_TYPE_LABELS, SKILL_LABELS } from '@/lib/assignment-scoring';
import type { StudentAssignmentView } from '@/lib/queries/student-portal';
import { vnDateTimeLabel } from '@/lib/datetime';
import { Btn } from '@/components/ui/Btn';
import { Field, FileInput, inputClass, textareaClass } from '@/components/ui/Field';
import { ActIcon } from '@/components/ui/ActIcon';
import { SubmissionPill } from '@/components/assignments/SubmissionPill';
import { Alert, Pill } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { Notice, Card } from '@/components/ui/surfaces';
import { PageHeader } from '@/components/ui/PageHeader';
import { AUDIO_ACCEPT, UPLOAD_ACCEPT } from '@/lib/upload-types';
import { InteractiveExercisePlayer } from '@/components/student/InteractiveExercisePlayer';
import { SpeakingFeedback } from '@/components/student/SpeakingFeedback';

// Các loại tệp học sinh có thể nộp. Khớp với danh sách máy chủ kiểm khi tải lên.

type Draft = { selectedOptionId: number | null; answerText: string; fileId: number | null; fileName: string | null };

// Bài làm của học sinh: trắc nghiệm chọn một đáp án, câu viết gõ chữ, câu nộp tệp tải tệp lên. Nộp lại được khi chưa chấm xong.
export function StudentAssignmentForm({ view }: { view: StudentAssignmentView }) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() =>
    Object.fromEntries(
      view.answers.map((a) => [a.itemId, { selectedOptionId: a.selectedOptionId, answerText: a.answerText, fileId: a.fileId, fileName: a.fileName }]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = view.status === 'graded';

  const hasInteractiveItems = view.items.some((i) =>
    ['picture_choice', 'match', 'order', 'gap_fill', 'speak_repeat', 'speak_read', 'speak_picture'].includes(i.itemType),
  );

  const [isInteractive, setIsInteractive] = useState<boolean>(() => {
    return !locked && hasInteractiveItems;
  });

  function patch(itemId: number, next: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...next } }));
  }

  function uploadFile(itemId: number, file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      const r = await uploadAsStudent(file);
      if (!r.ok) return setError(r.message);
      patch(itemId, { fileId: r.fileId, fileName: r.name });
      setError(null);
    });
  }

  function submit() {
    const payload: StudentAnswerInput[] = view.items.map((i) => {
      const d = drafts[i.id];
      return {
        itemId: i.id,
        selectedOptionId: ['choice', 'picture_choice'].includes(i.itemType) ? d.selectedOptionId : null,
        answerText: ['text', 'order', 'gap_fill', 'match'].includes(i.itemType) ? d.answerText : '',
        fileId: ['file', 'speak_repeat', 'speak_read', 'speak_picture'].includes(i.itemType) ? d.fileId : null,
      };
    });
    startTransition(async () => {
      const r = await submitMyAnswersAction(view.id, payload);
      if (!r.ok) return setError(r.message ?? 'Không nộp được bài');
      setError(null);
      notify(r.message ?? 'Đã nộp bài');
      router.refresh();
    });
  }

  if (isInteractive) {
    return (
      <div className="flex flex-col gap-4 py-2">
        <div className="mx-auto flex w-full max-w-[420px] items-center justify-between text-xs">
          <Link href="/cua-toi" className="font-bold text-ink underline">
            ← Danh sách bài
          </Link>
          <button
            type="button"
            onClick={() => setIsInteractive(false)}
            className="font-bold text-muted hover:text-ink underline"
          >
            📋 Chuyển sang dạng danh sách
          </button>
        </div>
        <InteractiveExercisePlayer view={view} onExit={() => setIsInteractive(false)} />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Link href="/cua-toi" className="text-sm font-semibold text-ink-2 underline underline-offset-4">
          ← Bài của tôi
        </Link>
        <PageHeader
          crumbs={['Khu học sinh', 'Bài của tôi']}
          title={view.title}
          subtitle={`Hạn ${vnDateTimeLabel(view.dueAt)} · tối đa ${view.maxScore} điểm${locked && view.score !== null ? ` · Điểm ${view.score}/${view.maxScore}` : ''}`}
          actions={
            <div className="flex items-center gap-2">
              {!locked && hasInteractiveItems && (
                <Btn variant="primary" onClick={() => setIsInteractive(true)}>
                  🎮 Chế độ tương tác sinh động
                </Btn>
              )}
              <SubmissionPill status={view.status} />
            </div>
          }
          titleOnTopbar={false}
        />
        {view.description && <Notice className="whitespace-pre-line">{view.description}</Notice>}
      </div>

      {error && (
        <Alert>
          {error}
        </Alert>
      )}

      {view.items.length === 0 ? (
        <p className="rounded-[var(--radius-panel)] bg-surface p-4 text-base text-ink-2 shadow-card">Bài này chưa có câu hỏi. Hỏi giáo viên để biết cách nộp.</p>
      ) : (
        view.items.map((item) => {
          const d = drafts[item.id];
          const answer = view.answers.find((a) => a.itemId === item.id);
          return (
            <Card as="section" key={item.id} aria-label={`Câu ${item.position}`}>
              <header className="flex flex-wrap items-center gap-2 text-sm">
                <b className="text-base text-ink">Câu {item.position}</b>
                <Pill tone="lav">{SKILL_LABELS[item.skill]}</Pill>
                <span className="text-muted">
                  {ITEM_TYPE_LABELS[item.itemType]} · {item.points} điểm
                </span>
              </header>

              {item.prompt && <p className="whitespace-pre-line text-base text-ink font-bold">{item.prompt}</p>}
              {item.promptVi && <p className="text-xs text-muted">🇻🇳 {item.promptVi}</p>}
              {item.passage && <Notice className="whitespace-pre-line">{item.passage}</Notice>}
              {item.audioFileId !== null && (
                <audio controls preload="none" src={`/api/files/${item.audioFileId}`} aria-label={`Âm thanh câu ${item.position}`} className="w-full" />
              )}

              {/* Trắc nghiệm chữ */}
              {item.itemType === 'choice' && (
                <fieldset className="flex flex-col gap-1">
                  <legend className="mb-1 text-sm font-normal text-ink-2">Chọn một đáp án</legend>
                  {item.options.map((o, oi) => (
                    <label key={o.id} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-ctl)] px-2 py-2 text-base text-ink hover:bg-stone">
                      <input
                        type="radio"
                        name={`answer-${item.id}`}
                        checked={d.selectedOptionId === o.id}
                        onChange={() => patch(item.id, { selectedOptionId: o.id })}
                        disabled={locked}
                        className="size-4 shrink-0 accent-[var(--primary-deep)]"
                      />
                      <span className="min-w-0">
                        {String.fromCharCode(65 + oi)}. {o.label}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}

              {/* Nghe / Chọn tranh */}
              {item.itemType === 'picture_choice' && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-normal text-ink-2">Chọn tranh đúng</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {item.options.map((o) => {
                      const isSel = d.selectedOptionId === o.id;
                      return (
                        <label
                          key={o.id}
                          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-3 text-center transition-all ${
                            isSel ? 'border-[var(--accent)] bg-[var(--mint)] text-[var(--mint-ink)] font-bold' : 'border-line bg-surface hover:bg-stone text-ink'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`answer-${item.id}`}
                            checked={isSel}
                            onChange={() => patch(item.id, { selectedOptionId: o.id })}
                            disabled={locked}
                            className="sr-only"
                          />
                          {o.imageFileId ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/files/${o.imageFileId}`} alt={o.label} className="max-h-20 max-w-full rounded object-contain" />
                          ) : (
                            <span className="text-4xl">🖼️</span>
                          )}
                          <span className="mt-1 text-xs truncate max-w-full">{o.label}</span>
                          {isSel && <span className="mt-1 text-xs font-bold text-[var(--accent)]">✓ Đã chọn</span>}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Sắp xếp câu hoặc điền từ */}
              {(item.itemType === 'order' || item.itemType === 'gap_fill') && (
                <Field label={item.itemType === 'order' ? 'Xếp các từ thành câu đúng' : 'Điền từ vào chỗ trống'}>
                  <input
                    type="text"
                    value={d.answerText}
                    onChange={(e) => patch(item.id, { answerText: e.target.value })}
                    disabled={locked}
                    placeholder={item.itemType === 'order' ? 'Nhập câu hoàn chỉnh…' : 'Nhập từ còn thiếu…'}
                    className={inputClass()}
                  />
                </Field>
              )}

              {/* Ghép đôi */}
              {item.itemType === 'match' && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-muted">Các cặp cần ghép đôi:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {item.pairs.map((p, pi) => (
                      <div key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-stone/40 p-2">
                        <span className="font-bold">{pi + 1}. {p.leftLabel}</span>
                        <span className="text-muted">⇄</span>
                        <span className="font-bold text-ink">{p.rightLabel}</span>
                      </div>
                    ))}
                  </div>
                  <Field label="Bài làm ghép đôi của bạn (hoặc vào Chế độ tương tác để chạm nối sinh động)">
                    <input
                      type="text"
                      value={d.answerText}
                      onChange={(e) => patch(item.id, { answerText: e.target.value })}
                      disabled={locked}
                      placeholder='VD: [{"left":"mother","right":"mẹ"}]'
                      className={inputClass()}
                    />
                  </Field>
                </div>
              )}

              {/* Tự luận viết */}
              {item.itemType === 'text' && (
                <Field label="Bài làm của bạn">
                  <textarea
                    value={d.answerText}
                    onChange={(e) => patch(item.id, { answerText: e.target.value })}
                    rows={6}
                    disabled={locked}
                    aria-label={`Bài làm câu ${item.position}`}
                    className={textareaClass()}
                  />
                </Field>
              )}

              {/* Nộp tệp hoặc Ghi âm */}
              {(item.itemType === 'file' || item.itemType === 'speak_repeat' || item.itemType === 'speak_read' || item.itemType === 'speak_picture') && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-normal text-ink-2">
                    {item.itemType === 'file' ? 'Tệp bài làm' : 'Bản ghi âm bài nói'}
                  </span>
                  {d.fileId !== null ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Paperclip className="size-4 text-muted" aria-hidden />
                      <span className="text-ink">{d.fileName || `Tệp ghi âm #${d.fileId}`}</span>
                      {!locked && (
                        <ActIcon label={`Bỏ tệp của câu ${item.position}`} onClick={() => patch(item.id, { fileId: null, fileName: null })}>
                          <X className="size-4" aria-hidden />
                        </ActIcon>
                      )}
                    </div>
                  ) : item.itemType !== 'file' && !view.voice.allowed ? (
                    <span className="text-sm text-muted">
                      {view.voice.needsChild ? 'Mở bài ở dạng từng câu để con bấm đồng ý ghi âm.' : 'Câu này cần ghi âm, phụ huynh chưa đồng ý cho con ghi âm. Bỏ qua câu này.'}
                    </span>
                  ) : (
                    <FileInput
                      label={item.itemType === 'file' ? `Tải tệp bài làm câu ${item.position}` : `Tải tệp ghi âm câu ${item.position}`}
                      accept={item.itemType === 'file' ? UPLOAD_ACCEPT : AUDIO_ACCEPT}
                      disabled={locked || pending}
                      onFile={(file) => uploadFile(item.id, file)}
                    />
                  )}
                </div>
              )}

              {/* Nhận xét bài nói theo mốc giây và nói lại câu bị đánh dấu (35.10) */}
              {item.itemType.startsWith('speak_') && (view.speakingMarks.some((m) => m.itemId === item.id) || view.speakingRubrics[item.id]) && (
                <SpeakingFeedback
                  assignmentId={view.id}
                  item={item}
                  fileId={answer?.fileId ?? null}
                  marks={view.speakingMarks.filter((m) => m.itemId === item.id)}
                  redone={answer?.redone ?? false}
                  voiceAllowed={view.voice.allowed}
                  rubric={view.speakingRubrics[item.id] ?? null}
                />
              )}

              {locked && item.itemType !== 'choice' && answer && (
                <small className="text-sm text-ink-2">
                  Điểm: {answer.points ?? 'chưa chấm'} / {item.points}
                  {answer.comment ? ` · Nhận xét: ${answer.comment}` : ''}
                </small>
              )}
            </Card>
          );
        })
      )}

      {!locked && view.items.length > 0 && (
        <div className="flex justify-end">
          <Btn variant="primary" onClick={submit} disabled={pending} className="max-[767px]:w-full">
            {pending ? 'Đang nộp…' : view.status === 'not_submitted' ? 'Nộp bài' : 'Nộp lại'}
          </Btn>
        </div>
      )}

      <Toast message={message} />
    </section>
  );
}
