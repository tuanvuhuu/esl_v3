'use client';

import { Paperclip, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { saveSecondMarkAction, saveStudentAnswersAction, uploadFileAction, type AnswerInput } from '@/app/(app)/bai-tap/question-actions';
import type { AssignmentItem, ItemAnswer, ItemSecondMark } from '@/lib/queries/assignment-items';
import { ITEM_TYPE_LABELS, markGap, summarizeSubmission, SKILL_LABELS, type ScoringAnswer, type ScoringItem } from '@/lib/assignment-scoring';
import { SUBMISSION_LABELS } from '@/lib/validation/assignment';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { Field, inputClass, textareaClass, FileInput } from '@/components/ui/Field';
import { Pill, Alert } from '@/components/ui/primitives';
import { Notice } from '@/components/ui/surfaces';
import { UPLOAD_ACCEPT } from '@/lib/upload-types';

// Các loại tệp học sinh có thể nộp. Khớp với danh sách máy chủ kiểm khi tải lên.
type Answer = {
  selectedOptionId: number | null;
  answerText: string;
  fileId: number | null;
  fileName: string | null;
  points: string;
  comment: string;
  criterionPoints: Record<number, string>; // ô điểm từng tiêu chí, theo id tiêu chí
};

// Ô điểm trống nghĩa là chưa chấm; có số thì đổi thành điểm
const toPoints = (s: string): number | null => (s.trim() === '' ? null : Number(s));

// Câu có tiêu chí thì điểm câu lấy từ tiêu chí, không dùng ô điểm chung
const hasCriteria = (item: AssignmentItem) => item.criteria.length > 0;

// Hộp chấm bài của một học sinh: từng câu với đáp án, bài viết hoặc tệp, điểm (hoặc điểm từng tiêu chí) và nhận xét.
// Tổng điểm tính lại khi sửa. Chấm chéo nằm ngay trong từng câu viết hoặc nộp tệp.
export function AnswerDialog({
  assignmentId,
  student,
  items,
  answers,
  savedPoints,
  secondMarks,
  gradedByAccountId,
  currentAccountId,
  canManage,
  onSaved,
  onSecondMarked,
}: {
  assignmentId: number;
  student: { id: number; name: string };
  items: AssignmentItem[];
  answers: ItemAnswer[];
  savedPoints: Record<number, number | null>; // điểm đã lưu từng câu, để so khi chấm chéo
  secondMarks: Record<number, ItemSecondMark>;
  gradedByAccountId: number | null;
  currentAccountId: number | null;
  canManage: boolean;
  onSaved: (message: string) => void;
  onSecondMarked: (message: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<number, Answer>>(() =>
    Object.fromEntries(
      items.map((i) => {
        const a = answers.find((x) => x.itemId === i.id);
        return [
          i.id,
          {
            selectedOptionId: a?.selectedOptionId ?? null,
            answerText: a?.answerText ?? '',
            fileId: a?.fileId ?? null,
            fileName: a?.fileName ?? null,
            points: a?.points === null || a?.points === undefined ? '' : String(a.points),
            comment: a?.comment ?? '',
            criterionPoints: Object.fromEntries(
              i.criteria.map((c) => {
                const p = a?.criterionPoints[c.id];
                return [c.id, p === null || p === undefined ? '' : String(p)];
              }),
            ),
          },
        ];
      }),
    ) as Record<number, Answer>,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setDraft(itemId: number, next: Partial<Answer>) {
    setDrafts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...next } }));
  }

  function setCriterion(itemId: number, criterionId: number, value: string) {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], criterionPoints: { ...prev[itemId].criterionPoints, [criterionId]: value } },
    }));
  }

  // Tính lại điểm theo các ô đang nhập, để giáo viên thấy tổng trước khi lưu
  const scoringItems: ScoringItem[] = items.map((i) => ({
    id: i.id,
    skill: i.skill,
    itemType: i.itemType,
    points: i.points,
    options: i.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect })),
    criteria: i.criteria.map((c) => ({ id: c.id, maxPoints: c.maxPoints })),
  }));
  const scoringAnswers: ScoringAnswer[] = items.map((i) => {
    const d = drafts[i.id];
    return {
      itemId: i.id,
      selectedOptionId: d.selectedOptionId,
      answerText: d.answerText,
      fileId: d.fileId,
      points: i.itemType === 'choice' || hasCriteria(i) ? null : toPoints(d.points),
      criterionPoints: Object.fromEntries(i.criteria.map((c) => [c.id, toPoints(d.criterionPoints[c.id] ?? '')])),
    };
  });
  const summary = summarizeSubmission(scoringItems, scoringAnswers);

  function uploadFile(itemId: number, file: File | undefined) {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const r = await uploadFileAction(fd);
      if (!r.ok) return setError(r.message);
      setDraft(itemId, { fileId: r.fileId, fileName: r.name });
      setError(null);
    });
  }

  function save() {
    const payload: AnswerInput[] = items.map((i) => {
      const d = drafts[i.id];
      return {
        itemId: i.id,
        selectedOptionId: i.itemType === 'choice' ? d.selectedOptionId : null,
        answerText: i.itemType === 'text' ? d.answerText : '',
        fileId: i.itemType === 'file' ? d.fileId : null,
        points: i.itemType === 'choice' || hasCriteria(i) ? null : toPoints(d.points),
        comment: d.comment,
        criterionPoints: i.criteria.map((c) => ({ criterionId: c.id, points: toPoints(d.criterionPoints[c.id] ?? '') })),
      };
    });
    startTransition(async () => {
      const r = await saveStudentAnswersAction(assignmentId, student.id, payload);
      if (!r.ok) return setError(r.message ?? 'Không lưu được');
      onSaved(r.message ?? 'Đã lưu bài làm');
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-ctl)] bg-bg px-3.5 py-2.5 text-sm">
        <b className="text-base text-ink">
          Tổng {summary.total}/{summary.maxTotal} điểm
        </b>
        <Pill tone={summary.status === 'graded' ? 'mint' : summary.status === 'submitted' ? 'butter' : 'blush'}>{SUBMISSION_LABELS[summary.status]}</Pill>
        {summary.skills.map((s) => (
          <span key={s.skill} className="text-ink-2">
            {SKILL_LABELS[s.skill]} <b className="font-normal text-ink">{s.raw}/{s.max}</b>
          </span>
        ))}
      </div>

      {error && (
        <Alert>
          {error}
        </Alert>
      )}

      {items.map((item) => {
        const d = drafts[item.id];
        const pts = summary.points[item.id];
        return (
          <section key={item.id} aria-label={`Câu ${item.position}`} className="flex flex-col gap-2.5 rounded-[var(--radius-panel)] border border-line p-3.5">
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
                <legend className="mb-1 text-sm font-normal text-ink-2">Học sinh chọn đáp án nào</legend>
                {item.options.map((o, oi) => (
                  <label key={o.id} className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-ctl)] px-2 py-1.5 text-base text-ink hover:bg-stone">
                    <input
                      type="radio"
                      name={`answer-${item.id}`}
                      checked={d.selectedOptionId === o.id}
                      onChange={() => setDraft(item.id, { selectedOptionId: o.id })}
                      disabled={!canManage}
                      className="size-4 shrink-0 accent-[var(--primary-deep)]"
                    />
                    <span className="min-w-0">
                      {String.fromCharCode(65 + oi)}. {o.label}
                    </span>
                  </label>
                ))}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDraft(item.id, { selectedOptionId: null })}
                    disabled={!canManage || d.selectedOptionId === null}
                    className="text-sm font-semibold text-ink-2 underline underline-offset-4 disabled:opacity-40"
                  >
                    Bỏ chọn
                  </button>
                  <small className="text-sm text-muted">
                    Điểm tự chấm: {pts ?? 0}/{item.points}
                  </small>
                </div>
              </fieldset>
            )}

            {item.itemType === 'text' && (
              <Field label="Bài làm của học sinh">
                <textarea
                  value={d.answerText}
                  onChange={(e) => setDraft(item.id, { answerText: e.target.value })}
                  rows={4}
                  disabled={!canManage}
                  aria-label={`Bài làm câu ${item.position}`}
                  className={textareaClass()}
                />
              </Field>
            )}

            {item.itemType === 'file' && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-normal text-ink-2">Tệp bài nộp</span>
                {d.fileId !== null ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Paperclip className="size-4 text-muted" aria-hidden />
                    <a href={`/api/files/${d.fileId}`} target="_blank" rel="noopener" className="font-semibold text-ink underline underline-offset-4">
                      {d.fileName}
                    </a>
                    <ActIcon label={`Bỏ tệp của câu ${item.position}`} onClick={() => setDraft(item.id, { fileId: null, fileName: null })} disabled={!canManage || pending}>
                      <X className="size-4" aria-hidden />
                    </ActIcon>
                  </div>
                ) : (
                  <FileInput label={`Tải tệp bài nộp câu ${item.position}`} accept={UPLOAD_ACCEPT} disabled={!canManage || pending} onFile={(file) => uploadFile(item.id, file)} />
                )}
              </div>
            )}

            {item.itemType !== 'choice' && hasCriteria(item) && (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-2">
                  {item.criteria.map((c) => (
                    <Field key={c.id} label={`${c.name} (tối đa ${c.maxPoints})`}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={c.maxPoints}
                        step={1}
                        value={d.criterionPoints[c.id] ?? ''}
                        onChange={(e) => setCriterion(item.id, c.id, e.target.value)}
                        disabled={!canManage}
                        aria-label={`Điểm tiêu chí ${c.name} câu ${item.position}`}
                        className={inputClass()}
                      />
                    </Field>
                  ))}
                </div>
                <small className="text-sm text-muted">
                  Điểm câu: {pts === null || pts === undefined ? 'chưa chấm đủ các tiêu chí' : pts} / {item.points}
                </small>
              </div>
            )}

            {item.itemType !== 'choice' && (
              <div className="grid grid-cols-1 gap-3 min-[768px]:grid-cols-[140px_minmax(0,1fr)]">
                {!hasCriteria(item) && (
                  <Field label={`Điểm (tối đa ${item.points})`}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={item.points}
                      step={1}
                      value={d.points}
                      onChange={(e) => setDraft(item.id, { points: e.target.value })}
                      disabled={!canManage}
                      aria-label={`Điểm câu ${item.position}`}
                      className={inputClass()}
                    />
                  </Field>
                )}
                <Field label="Nhận xét">
                  <input
                    type="text"
                    value={d.comment}
                    onChange={(e) => setDraft(item.id, { comment: e.target.value })}
                    disabled={!canManage}
                    placeholder="Nhận xét ngắn cho câu này"
                    aria-label={`Nhận xét câu ${item.position}`}
                    className={inputClass()}
                  />
                </Field>
              </div>
            )}

            {item.itemType !== 'choice' && (
              <SecondMarkPanel
                key={`${item.id}-${secondMarks[item.id]?.points ?? 'none'}`}
                assignmentId={assignmentId}
                studentId={student.id}
                item={item}
                savedPoints={savedPoints[item.id] ?? null}
                mark={secondMarks[item.id] ?? null}
                gradedByAccountId={gradedByAccountId}
                currentAccountId={currentAccountId}
                onDone={onSecondMarked}
              />
            )}
          </section>
        );
      })}

      {canManage && (
        <div className="flex justify-end">
          <Btn variant="primary" onClick={save} disabled={pending} className="max-[767px]:flex-1">
            {pending ? 'Đang lưu…' : 'Lưu bài làm'}
          </Btn>
        </div>
      )}
    </div>
  );
}

// Chấm chéo một câu: người khác chấm lại không thấy điểm lần đầu. Sau khi lưu mới hiện điểm và độ lệch.
function SecondMarkPanel({
  assignmentId,
  studentId,
  item,
  savedPoints,
  mark,
  gradedByAccountId,
  currentAccountId,
  onDone,
}: {
  assignmentId: number;
  studentId: number;
  item: AssignmentItem;
  savedPoints: number | null;
  mark: ItemSecondMark | null;
  gradedByAccountId: number | null;
  currentAccountId: number | null;
  onDone: (message: string) => void;
}) {
  const [points, setPoints] = useState(mark ? String(mark.points) : '');
  const [comment, setComment] = useState(mark?.comment ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isFirstGrader = currentAccountId !== null && currentAccountId === gradedByAccountId;
  const gap = mark && savedPoints !== null ? markGap(savedPoints, mark.points) : null;

  function save() {
    if (points.trim() === '') return setError('Nhập điểm chấm lại');
    startTransition(async () => {
      const r = await saveSecondMarkAction(assignmentId, studentId, item.id, { points: Number(points), comment });
      if (!r.ok) return setError(r.message ?? 'Không lưu được chấm lại');
      setError(null);
      onDone(r.message ?? 'Đã lưu chấm lại');
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-ctl)] bg-bg px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <b className="font-semibold text-ink">Chấm chéo</b>
        {mark && (
          <span className="text-ink-2">
            Chấm lại: <b className="font-normal text-ink">{mark.points}/{item.points}</b>
            {mark.graderName ? ` · ${mark.graderName}` : ''}
          </span>
        )}
        {gap && savedPoints !== null && (
          <>
            <span className="text-ink-2">
              Điểm lần đầu: <b className="font-normal text-ink">{savedPoints}/{item.points}</b>
            </span>
            <Pill tone={gap.flagged ? 'blush' : 'mint'}>{gap.flagged ? `Lệch ${gap.gap} điểm` : gap.gap === 0 ? 'Khớp' : `Lệch ${gap.gap} điểm, trong ngưỡng`}</Pill>
          </>
        )}
      </div>

      {savedPoints === null ? (
        <p className="text-sm text-muted">Chấm lần đầu câu này và lưu bài làm trước, rồi mới chấm chéo.</p>
      ) : isFirstGrader ? (
        <p className="text-sm text-muted">Bạn là người chấm lần đầu bài này nên không chấm lại được. Cần giáo viên khác chấm.</p>
      ) : mark ? (
        <p className="text-sm text-muted">Đã có điểm chấm lại. Muốn đổi, nhập lại điểm bên dưới.</p>
      ) : (
        <p className="text-sm text-muted">Chấm lại không xem điểm lần đầu. Điểm sẽ hiện sau khi lưu.</p>
      )}

      {savedPoints !== null && !isFirstGrader && (
        <div className="grid grid-cols-1 gap-2.5 min-[768px]:grid-cols-[140px_minmax(0,1fr)_auto] min-[768px]:items-end">
          <Field label={`Điểm chấm lại (tối đa ${item.points})`}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={item.points}
              step={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              aria-label={`Điểm chấm lại câu ${item.position}`}
              className={inputClass()}
            />
          </Field>
          <Field label="Nhận xét chấm lại">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              aria-label={`Nhận xét chấm lại câu ${item.position}`}
              className={inputClass()}
            />
          </Field>
          <Btn variant="ghost" onClick={save} disabled={pending} className="max-[767px]:w-full">
            {pending ? 'Đang lưu…' : 'Lưu chấm lại'}
          </Btn>
        </div>
      )}

      {error && (
        <Alert inline>
          {error}
        </Alert>
      )}
    </div>
  );
}
