'use client';

import {
  ArrowLeftIcon,
  CheckIcon,
  GlobeIcon,
  ImageIcon,
  ListUnorderedIcon,
  PaperclipIcon,
  PlayIcon,
  XIcon,
} from '@primer/octicons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { submitMyAnswersAction, type StudentAnswerInput } from '@/app/(student)/cua-toi/actions';
import { uploadAsStudent } from '@/lib/upload-client';
import { ITEM_TYPE_LABELS, SKILL_LABELS } from '@/lib/assignment-scoring';
import type { StudentAssignmentView } from '@/lib/queries/student-portal';
import { vnDateTimeLabel } from '@/lib/datetime';
import { TextAreaAutoHeight, TextInput } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FileInput } from '@/components/ui/Field';
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
        <div className="mx-auto flex w-full max-w-[440px] items-center justify-between text-xs">
          <Link href="/cua-toi" data-link="true" className="inline-flex items-center gap-1 font-medium text-[var(--fgColor-default)] underline underline-offset-2">
            <ArrowLeftIcon size={14} aria-hidden /> Danh sách bài
          </Link>
          <button
            type="button"
            data-link="true"
            onClick={() => setIsInteractive(false)}
            className="inline-flex items-center gap-1 font-medium text-[var(--fgColor-muted)] underline underline-offset-2 hover:text-[var(--fgColor-default)]"
          >
            <ListUnorderedIcon size={14} aria-hidden /> Chuyển sang dạng danh sách
          </button>
        </div>
        <InteractiveExercisePlayer view={view} onExit={() => setIsInteractive(false)} />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Link
          href="/cua-toi"
          data-link="true"
          className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-[var(--fgColor-muted)] underline underline-offset-4 hover:text-[var(--fgColor-default)]"
        >
          <ArrowLeftIcon size={14} aria-hidden /> Bài của tôi
        </Link>

        <div className="tsukuba-rise rounded-2xl border border-[var(--borderColor-default)] border-l-4 border-l-[var(--primary)] bg-[var(--bgColor-default)] p-4 min-[640px]:p-5">
          <PageHeader
            crumbs={['Khu học sinh', 'Bài của tôi']}
            title={view.title}
            subtitle={`Hạn ${vnDateTimeLabel(view.dueAt)} · tối đa ${view.maxScore} điểm${locked && view.score !== null ? ` · Điểm ${view.score}/${view.maxScore}` : ''}`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {!locked && hasInteractiveItems && (
                  <Btn variant="primary" leadingVisual={PlayIcon} onClick={() => setIsInteractive(true)}>
                    Chế độ tương tác sinh động
                  </Btn>
                )}
                <SubmissionPill status={view.status} />
              </div>
            }
            titleOnTopbar={false}
          />
          {view.description && <Notice className="mt-3 whitespace-pre-line">{view.description}</Notice>}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {view.items.length === 0 ? (
        <Card>
          <p className="text-base text-[var(--fgColor-muted)]">Bài này chưa có câu hỏi. Hỏi giáo viên để biết cách nộp.</p>
        </Card>
      ) : (
        view.items.map((item) => {
          const d = drafts[item.id];
          const answer = view.answers.find((a) => a.itemId === item.id);
          return (
            <section
              key={item.id}
              aria-label={`Câu ${item.position}`}
              className="tsukuba-rise overflow-hidden rounded-xl border border-[var(--borderColor-default)] bg-[var(--bgColor-default)]"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-4 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 min-w-7 items-center justify-center rounded-[var(--borderRadius-medium)] bg-[var(--primary-soft)] px-1.5 font-mono text-xs tabular-nums text-[var(--primary-deep)]">
                    #{item.position}
                  </span>
                  <b className="text-sm font-semibold text-[var(--fgColor-default)]">Câu {item.position}</b>
                  <Pill tone="lav">{SKILL_LABELS[item.skill]}</Pill>
                </div>
                <span className="text-xs tabular-nums text-[var(--fgColor-muted)]">
                  {ITEM_TYPE_LABELS[item.itemType]} · {item.points} điểm
                </span>
              </header>

              <div className="flex flex-col gap-3 p-4">
                {item.prompt && <p className="whitespace-pre-line text-base font-medium text-[var(--fgColor-default)]">{item.prompt}</p>}
                {item.promptVi && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-[var(--fgColor-muted)]">
                    <GlobeIcon size={13} aria-hidden />
                    <span>{item.promptVi}</span>
                  </p>
                )}
                {item.passage && <Notice className="whitespace-pre-line">{item.passage}</Notice>}
                {item.audioFileId !== null && (
                  <audio controls preload="none" src={`/api/files/${item.audioFileId}`} aria-label={`Âm thanh câu ${item.position}`} className="w-full" />
                )}

                {/* Trắc nghiệm chữ */}
                {item.itemType === 'choice' && (
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className="mb-1 text-xs font-medium text-[var(--fgColor-muted)]">Chọn một đáp án</legend>
                    {item.options.map((o, oi) => {
                      const isSel = d.selectedOptionId === o.id;
                      return (
                        <label
                          key={o.id}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-all ${
                            isSel
                              ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--fgColor-default)] shadow-[inset_3px_0_0_var(--primary)]'
                              : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`answer-${item.id}`}
                            checked={isSel}
                            onChange={() => patch(item.id, { selectedOptionId: o.id })}
                            disabled={locked}
                            className="size-4 shrink-0 accent-[var(--control-checked-bgColor-rest)]"
                          />
                          <span className="min-w-0">
                            {String.fromCharCode(65 + oi)}. {o.label}
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}

                {/* Nghe / Chọn tranh */}
                {item.itemType === 'picture_choice' && (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-xs font-medium text-[var(--fgColor-muted)]">Chọn tranh đúng</legend>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {item.options.map((o) => {
                        const isSel = d.selectedOptionId === o.id;
                        return (
                          <label
                            key={o.id}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all ${
                              isSel
                                ? 'border-[var(--bgColor-success-emphasis)] bg-mint font-medium text-mint-ink'
                                : 'border-[var(--borderColor-default)] bg-[var(--bgColor-default)] text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]'
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
                              <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--bgColor-muted)] text-[var(--fgColor-muted)]" aria-hidden>
                                <ImageIcon size={24} aria-hidden />
                              </span>
                            )}
                            <span className="mt-1.5 max-w-full truncate text-xs">{o.label}</span>
                            {isSel && (
                              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--fgColor-success)]">
                                <CheckIcon size={12} aria-hidden />
                                Đã chọn
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}

              {/* Sắp xếp câu hoặc điền từ */}
              {item.itemType === 'order' && item.orderWords.length > 0 && (
                <p className="flex flex-wrap gap-1.5" aria-label={`Các từ câu ${item.position}`}>
                  {item.orderWords.map((w, k) => (
                    <span
                      key={k}
                      className="rounded-[var(--borderRadius-small)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 px-2 py-1 text-sm font-medium text-[var(--fgColor-default)]"
                    >
                      {w}
                    </span>
                  ))}
                </p>
              )}
              {(item.itemType === 'order' || item.itemType === 'gap_fill') && (
                <Field label={item.itemType === 'order' ? 'Xếp các từ thành câu đúng' : 'Điền từ vào chỗ trống'}>
                  <TextInput
                    value={d.answerText}
                    onChange={(e) => patch(item.id, { answerText: e.target.value })}
                    disabled={locked}
                    placeholder={item.itemType === 'order' ? 'Nhập câu hoàn chỉnh…' : 'Nhập từ còn thiếu…'}
                    aria-label={item.itemType === 'order' ? `Xếp câu ${item.position}` : `Điền từ câu ${item.position}`}
                    block
                  />
                </Field>
              )}

              {/* Ghép đôi */}
              {item.itemType === 'match' && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[var(--fgColor-muted)]">Ghép mỗi ô bên trái với một ô bên phải:</span>
                  {/* Hai cột xáo riêng theo từng học sinh, không hiện sẵn cặp đúng */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <ul className="flex flex-col gap-1.5" aria-label={`Cột trái câu ${item.position}`}>
                      {item.matchLeft.map((s, k) => (
                        <li
                          key={k}
                          className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 p-2 font-medium text-[var(--fgColor-default)]"
                        >
                          {k + 1}. {s.label}
                        </li>
                      ))}
                    </ul>
                    <ul className="flex flex-col gap-1.5" aria-label={`Cột phải câu ${item.position}`}>
                      {item.matchRight.map((s, k) => (
                        <li
                          key={k}
                          className="rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 p-2 font-medium text-[var(--fgColor-default)]"
                        >
                          {String.fromCharCode(65 + k)}. {s.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Field label="Bài làm ghép đôi của bạn (hoặc vào Chế độ tương tác để chạm nối sinh động)">
                    <TextInput
                      value={d.answerText}
                      onChange={(e) => patch(item.id, { answerText: e.target.value })}
                      disabled={locked}
                      placeholder='VD: [{"left":"mother","right":"mẹ"}]'
                      aria-label={`Ghép đôi câu ${item.position}`}
                      block
                    />
                  </Field>
                </div>
              )}

              {/* Tự luận viết */}
              {item.itemType === 'text' && (
                <Field label="Bài làm của bạn">
                  <TextAreaAutoHeight
                    value={d.answerText}
                    onChange={(e) => patch(item.id, { answerText: e.target.value })}
                    rows={6}
                    disabled={locked}
                    aria-label={`Bài làm câu ${item.position}`}
                  />
                </Field>
              )}

              {/* Nộp tệp hoặc Ghi âm */}
              {(item.itemType === 'file' || item.itemType === 'speak_repeat' || item.itemType === 'speak_read' || item.itemType === 'speak_picture') && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-normal text-[var(--fgColor-muted)]">
                    {item.itemType === 'file' ? 'Tệp bài làm' : 'Bản ghi âm bài nói'}
                  </span>
                  {d.fileId !== null ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <PaperclipIcon size={16} className="text-[var(--fgColor-muted)]" aria-hidden />
                      <span className="text-[var(--fgColor-default)]">{d.fileName || `Tệp ghi âm #${d.fileId}`}</span>
                      {!locked && (
                        <ActIcon
                          label={`Bỏ tệp của câu ${item.position}`}
                          icon={XIcon}
                          onClick={() => patch(item.id, { fileId: null, fileName: null })}
                        />
                      )}
                    </div>
                  ) : item.itemType !== 'file' && !view.voice.allowed ? (
                    <span className="text-sm text-[var(--fgColor-muted)]">
                      {view.voice.needsChild
                        ? 'Mở bài ở dạng từng câu để con bấm đồng ý ghi âm.'
                        : 'Câu này cần ghi âm, phụ huynh chưa đồng ý cho con ghi âm. Bỏ qua câu này.'}
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
                <small className="rounded-lg border border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3 py-2 text-xs tabular-nums text-[var(--fgColor-muted)]">
                  Điểm: {answer.points ?? 'chưa chấm'} / {item.points}
                  {answer.comment ? ` · Nhận xét: ${answer.comment}` : ''}
                </small>
              )}
              </div>
            </section>
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
