'use client';

import { DeviceMobileIcon, PlusIcon, StarIcon, UnlinkIcon } from '@primer/octicons-react';
import { useActionState, useState, useTransition, startTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { addParentLinkAction, setPrimaryParentAction, unlinkParentAction } from '@/app/(app)/phu-huynh/actions';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import type { ActionResult } from '@/lib/validation/student';
import { ComboBox, SelectBox, TextInput } from '@/components-ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Btn, BTN_BASE, BTN_GHOST } from '@/components/ui/Btn';
import { EmptyPanel } from '@/components/ui/surfaces';
import { Field, FormFooter, FormSection } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Avatar, Pill, Alert } from '@/components/ui/primitives';
import { Toast, useToast } from '@/components/ui/Toast';
import { ZaloLink } from '@/components/ui/ZaloLink';

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
        <EmptyPanel title="Chưa có phụ huynh" hint="Thêm phụ huynh để gọi hoặc gửi thông báo khi cần." />
      ) : (
        <ul className="flex flex-col gap-3">
          {parents.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] p-3.5 transition-colors hover:border-[var(--borderColor-accent-emphasis)]/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={p.fullName} seed={p.id} size="md" quiet />
                  <div className="min-w-0">
                    <b className="block truncate text-sm font-semibold text-[var(--fgColor-default)]">{p.fullName}</b>
                    <small className="text-xs text-[var(--fgColor-muted)]">{PARENT_RELATION_LABELS[p.relation]}</small>
                  </div>
                </div>
                {p.isPrimary && <Pill tone="butter">Liên hệ chính</Pill>}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--borderColor-muted)] pt-2.5">
                <a href={`tel:${p.phone}`} className={`${BTN_BASE} ${BTN_GHOST}`}>
                  <DeviceMobileIcon size={16} aria-hidden />
                  Gọi {p.phone}
                </a>
                <ZaloLink phone={p.phone} name={p.fullName} />
                {canManage && (
                  <>
                    {!p.isPrimary && (
                      <Btn leadingVisual={StarIcon} onClick={() => setPrimary(p)} disabled={pending}>
                        Đặt liên hệ chính
                      </Btn>
                    )}
                    <Btn variant="danger" leadingVisual={UnlinkIcon} onClick={() => setUnlinking(p)} disabled={pending}>
                      Gỡ liên kết
                    </Btn>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="pt-1">
          <Btn variant="primary" leadingVisual={PlusIcon} onClick={() => setAdding(true)}>
            Thêm phụ huynh
          </Btn>
        </div>
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
    <Modal
      open
      size="md"
      title="Thêm phụ huynh"
      subtitle="Chọn phụ huynh đã có trong danh sách hoặc tạo hồ sơ liên hệ mới."
      onClose={onClose}
      labelledBy="add-parent-title"
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5">
        {state.message && !state.ok && (
          <Alert>{state.message}</Alert>
        )}
        <FormSection title="Thông tin liên hệ">
          <Field label="Phụ huynh *" error={errors.parentId} wide>
            <ComboBox
              name="parentId"
              label="Phụ huynh *"
              value={parentId}
              onChange={setParentId}
              options={[...choices.map((c) => ({ value: String(c.id), label: `${c.fullName} · ${c.phone}` })), { value: '', label: 'Người mới' }]}
              error={Boolean(errors.parentId)}
              block
            />
          </Field>
          {isNew && (
            <>
              <Field label="Họ và tên *" error={errors.fullName}>
                <TextInput block name="fullName" aria-label="Họ và tên *" autoComplete="off" validationStatus={errors.fullName ? 'error' : undefined} />
              </Field>
              <Field label="Số điện thoại *" error={errors.phone}>
                <TextInput
                  block
                  name="phone"
                  aria-label="Số điện thoại *"
                  type="tel"
                  inputMode="tel"
                  placeholder="09xx xxx xxx"
                  autoComplete="off"
                  validationStatus={errors.phone ? 'error' : undefined}
                />
              </Field>
            </>
          )}
          <Field label="Quan hệ *" error={errors.relation}>
            <SelectBox
              name="relation"
              label="Quan hệ *"
              defaultValue="other"
              options={RELATIONS.map((r) => ({ value: r, label: PARENT_RELATION_LABELS[r] }))}
              error={Boolean(errors.relation)}
              block
            />
          </Field>
          <div className="flex min-w-0 flex-col justify-end">
            <label className="flex h-[var(--ctl-h)] cursor-pointer items-center gap-2.5 rounded-[var(--borderRadius-medium)] border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)]/60 px-3 text-sm font-normal text-[var(--fgColor-default)] transition-colors hover:border-[var(--borderColor-accent-emphasis)] max-[767px]:h-[var(--ctl-h-touch)]">
              <input name="isPrimary" type="checkbox" className="size-4 accent-[var(--control-checked-bgColor-rest)]" />
              <span>Đặt làm liên hệ chính</span>
            </label>
          </div>
        </FormSection>

        <FormFooter>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn type="submit" variant="primary" loading={pending} disabled={pending}>
            {pending ? 'Đang thêm…' : 'Thêm vào hồ sơ'}
          </Btn>
        </FormFooter>
      </form>
    </Modal>
  );
}
