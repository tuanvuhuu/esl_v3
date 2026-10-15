'use client';

import { Paperclip, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { studentUploadAction, submitMyAnswersAction, type StudentAnswerInput } from '@/app/(student)/cua-toi/actions';
import { ITEM_TYPE_LABELS, SKILL_LABELS } from '@/lib/assignment-scoring';
import type { StudentAssignmentView } from '@/lib/queries/student-portal';
import { vnDateTimeLabel } from '@/lib/datetime';
import { Btn } from '@/components/ui/Btn';
import { Field, FileInput, textareaClass } from '@/components/ui/Field';
import { ActIcon } from '@/components/ui/ActIcon';
import { SubmissionPill } from '@/components/assignments/SubmissionPill';
import { Alert, Pill } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { Notice, Card } from '@/components/ui/surfaces';
import { PageHeader } from '@/components/ui/PageHeader';
import { UPLOAD_ACCEPT } from '@/lib/upload-types';

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

  function patch(itemId: number, next: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...next } }));
  }

  function uploadFile(itemId: number, file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const r = await studentUploadAction(fd);
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
        selectedOptionId: i.itemType === 'choice' ? d.selectedOptionId : null,
        answerText: i.itemType === 'text' ? d.answerText : '',
        fileId: i.itemType === 'file' ? d.fileId : null,
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
          actions={<SubmissionPill status={view.status} />}
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

              {item.prompt && <p className="whitespace-pre-line text-base text-ink">{item.prompt}</p>}
              {item.passage && <Notice className="whitespace-pre-line">{item.passage}</Notice>}
              {item.audioFileId !== null && (
                <audio controls preload="none" src={`/api/files/${item.audioFileId}`} aria-label={`Âm thanh câu ${item.position}`} className="w-full" />
              )}

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

              {item.itemType === 'file' && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-normal text-ink-2">Tệp bài làm</span>
                  {d.fileId !== null ? (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Paperclip className="size-4 text-muted" aria-hidden />
                      <span className="text-ink">{d.fileName}</span>
                      {!locked && (
                        <ActIcon label={`Bỏ tệp của câu ${item.position}`} onClick={() => patch(item.id, { fileId: null, fileName: null })}>
                          <X className="size-4" aria-hidden />
                        </ActIcon>
                      )}
                    </div>
                  ) : (
                    <FileInput
                      label={`Tải tệp bài làm câu ${item.position}`}
                      accept={UPLOAD_ACCEPT}
                      disabled={locked || pending}
                      onFile={(file) => uploadFile(item.id, file)}
                    />
                  )}
                </div>
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
