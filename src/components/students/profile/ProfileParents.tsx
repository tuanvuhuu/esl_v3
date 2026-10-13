'use client';

import { Phone, Plus, Star, Unlink } from 'lucide-react';
import { useActionState, useState, useTransition, startTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addParentLinkAction, setPrimaryParentAction, unlinkParentAction } from '@/app/(app)/phu-huynh/actions';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import type { ActionResult } from '@/lib/validation/student';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, FORM_BTN_CANCEL, FORM_BTN_SUBMIT, inputClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, Pill } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';

export type ProfileParent = {
  id: number;
  fullName: string;
  phone: string;
  relation: 'father' | 'mother' | 'guardian' | 'other';
  isPrimary: boolean;
};

const INITIAL: ActionResult = { ok: false };
const RELATIONS = ['father', 'mother', 'guardian', 'other'] as const;

// Tab Phụ huynh trong hồ sơ: gọi, đặt liên hệ chính, gỡ liên kết (có xác nhận), thêm phụ huynh
export function ProfileParents({
  studentId,
  studentName,
  parents,
  choices,
  canManage,
}: {
  studentId: number;
  studentName: string;
  parents: ProfileParent[];
  choices: { id: number; fullName: string; phone: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { message, notify } = useToast();
  const [adding, setAdding] = useState(false);
  const [unlinking, setUnlinking] = useState<ProfileParent | null>(null);
  const [pending, start] = useTransition();
  const linkedIds = new Set(parents.map((p) => p.id));
  const available = choices.filter((c) => !linkedIds.has(c.id));

  function setPrimary(p: ProfileParent) {
    start(async () => {
      const r = await setPrimaryParentAction(studentId, p.id);
      notify(r.message ?? (r.ok ? 'Đã đặt' : 'Không đặt được'));
      router.refresh();
    });
  }

  function confirmUnlink() {
    if (!unlinking) return;
    const target = unlinking;
    start(async () => {
      const r = await unlinkParentAction(studentId, target.id);
      setUnlinking(null);
      notify(r.message ?? (r.ok ? 'Đã gỡ' : 'Không gỡ được'));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {parents.length === 0 ? (
        <div className="rounded-[20px] bg-surface"><EmptyState title="Chưa có phụ huynh" hint="Thêm phụ huynh để gọi khi cần." /></div>
      ) : (
        <ul className="flex flex-col gap-3">
          {parents.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-[18px] bg-bg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <b className="block truncate text-base text-ink">{p.fullName}</b>
                  <small className="text-sm text-muted">{PARENT_RELATION_LABELS[p.relation]}</small>
                </div>
                {p.isPrimary && <Pill tone="butter">Liên hệ chính</Pill>}
              </div>
              <a href={`tel:${p.phone}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-surface text-base font-bold text-ink">
                <Phone className="size-4" aria-hidden />
                Gọi {p.phone}
              </a>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {!p.isPrimary && (
                    <button type="button" onClick={() => setPrimary(p)} disabled={pending} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-bold text-ink disabled:opacity-40">
                      <Star className="size-4" aria-hidden />
                      Đặt liên hệ chính
                    </button>
                  )}
                  <button type="button" onClick={() => setUnlinking(p)} disabled={pending} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-blush-ink bg-surface px-3 text-sm font-bold text-blush-ink disabled:opacity-40">
                    <Unlink className="size-4" aria-hidden />
                    Gỡ liên kết
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-base font-bold text-ink">
          <Plus className="size-4" aria-hidden />
          Thêm phụ huynh
        </button>
      )}

      <Toast message={message} />

      {adding && (
        <AddParentDialog
          studentId={studentId}
          choices={available}
          onClose={() => setAdding(false)}
          onDone={(m) => {
            setAdding(false);
            notify(m);
            router.refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!unlinking}
        title="Gỡ liên kết phụ huynh?"
        text={unlinking ? `Gỡ ${unlinking.fullName} khỏi hồ sơ của ${studentName}. Phụ huynh và học sinh vẫn được giữ lại.` : ''}
        confirmLabel="Gỡ liên kết"
        pending={pending}
        onConfirm={confirmUnlink}
        onCancel={() => setUnlinking(null)}
      />
    </div>
  );
}

function AddParentDialog({
  studentId,
  choices,
  onClose,
  onDone,
}: {
  studentId: number;
  choices: { id: number; fullName: string; phone: string }[];
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const [parentId, setParentId] = useState(choices[0] ? String(choices[0].id) : '');
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(async (prev, formData) => {
    const result = await addParentLinkAction(studentId, prev, formData);
    if (result.ok) onDone(result.message ?? 'Đã thêm');
    return result;
  }, INITIAL);
  const errors = state.fieldErrors ?? {};
  const isNew = parentId === '';

  // Gọi action thủ công để ô nhập không bị reset khi có lỗi (E-028)
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Modal open title="Thêm phụ huynh" subtitle="Chọn người đã có, hoặc nhập người mới." onClose={onClose} labelledBy="add-parent-title">
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-3.5 pb-2 min-[768px]:grid-cols-2 min-[768px]:gap-x-4">
        {state.message && !state.ok && (
          <div role="alert" className="col-span-full rounded-xl bg-blush px-3.5 py-2.5 text-base font-semibold text-blush-ink">{state.message}</div>
        )}
        <Field label="Phụ huynh *" error={errors.parentId} wide>
          <select name="parentId" value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass(errors.parentId)}>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName} · {c.phone}</option>
            ))}
            <option value="">Người mới</option>
          </select>
        </Field>
        {isNew && (
          <>
            <Field label="Họ và tên *" error={errors.fullName}>
              <input name="fullName" autoComplete="off" className={inputClass(errors.fullName)} />
            </Field>
            <Field label="Số điện thoại *" error={errors.phone}>
              <input name="phone" type="tel" inputMode="tel" placeholder="09xx xxx xxx" autoComplete="off" className={inputClass(errors.phone)} />
            </Field>
          </>
        )}
        <Field label="Quan hệ *" error={errors.relation}>
          <select name="relation" defaultValue="other" className={inputClass(errors.relation)}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>{PARENT_RELATION_LABELS[r]}</option>
            ))}
          </select>
        </Field>
        <label className="flex min-w-0 items-center gap-2.5 self-end pb-2.5 text-sm font-bold text-ink-2">
          <input name="isPrimary" type="checkbox" className="size-4 accent-[var(--primary-deep)]" />
          Đặt làm liên hệ chính
        </label>
        <div className="col-span-full mt-1 flex justify-end gap-2.5 max-[767px]:[&>button]:flex-1">
          <button type="button" onClick={onClose} className={FORM_BTN_CANCEL}>Huỷ</button>
          <button type="submit" disabled={pending} className={FORM_BTN_SUBMIT}>{pending ? 'Đang thêm…' : 'Thêm vào hồ sơ'}</button>
        </div>
      </form>
    </Modal>
  );
}
