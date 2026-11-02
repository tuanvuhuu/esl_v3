'use client';

// Thẻ sửa một học sinh của phụ huynh, mở khi bấm vào ô học sinh trên bảng: đổi quan hệ, đặt liên hệ chính, gỡ liên kết.
// Hiện bằng portal ra thân trang để không bị cắt khi bảng cuộn.
import { StarIcon, UnlinkIcon, XIcon } from '@primer/octicons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { setLinkRelationAction, setPrimaryParentAction, unlinkParentAction } from '@/app/(app)/phu-huynh/actions';
import { SelectBox } from '@/components-ui';
import { ActIcon } from '@/components/ui/ActIcon';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import type { ParentRow } from '@/lib/queries/parents';
import { PARENT_RELATIONS } from '@/lib/validation/student';
import { Alert, Pill } from '@/components/ui/primitives';

type ChildLink = ParentRow['children'][number];

const RELATION_OPTIONS = PARENT_RELATIONS.map((r) => ({ value: r, label: PARENT_RELATION_LABELS[r] }));
const WIDTH = 312;

export function ChildEditor({
  parentId,
  parentName,
  child,
  anchor,
  canManage,
  onClose,
}: {
  parentId: number;
  parentName: string;
  child: ChildLink;
  anchor: DOMRect; // ô học sinh vừa bấm, để đặt thẻ ngay dưới ô
  canManage: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [relation, setRelation] = useState<string>(child.relation);
  const [error, setError] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [pending, startTransition] = useTransition();

  // Bấm ra ngoài hoặc Esc thì đóng. Khi đang hỏi xác nhận gỡ thì không đóng; Esc đã được ô chọn xử lý thì bỏ qua.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (confirmUnlink) return;
      const target = e.target as Element | null;
      if (target?.closest?.('[role="listbox"], [role="menu"]')) return;
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !confirmUnlink) onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose, confirmUnlink]);

  const left = Math.min(Math.max(16, anchor.left), window.innerWidth - WIDTH - 16);
  const top = Math.min(anchor.bottom + 6, Math.max(16, window.innerHeight - 280));

  function chooseRelation(next: string) {
    const before = relation;
    setRelation(next);
    setError(null);
    startTransition(async () => {
      const r = await setLinkRelationAction(child.studentId, parentId, next);
      if (!r.ok) {
        setRelation(before);
        setError(r.message ?? 'Không đổi được quan hệ');
        return;
      }
      router.refresh();
    });
  }

  function makePrimary() {
    setError(null);
    startTransition(async () => {
      const r = await setPrimaryParentAction(child.studentId, parentId);
      if (!r.ok) {
        setError(r.message ?? 'Không đặt được liên hệ chính');
        return;
      }
      router.refresh();
      onClose();
    });
  }

  function unlink() {
    startTransition(async () => {
      const r = await unlinkParentAction(child.studentId, parentId);
      setConfirmUnlink(false);
      if (!r.ok) {
        setError(r.message ?? 'Không gỡ được liên kết');
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Quan hệ của ${child.studentName}`}
      style={{ top, left, width: WIDTH }}
      className="tsukuba-rise fixed z-[60] flex flex-col overflow-hidden rounded-[var(--borderRadius-large)] border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] shadow-[var(--shadow-floating-large,var(--lift))]"
    >
      <header className="flex items-start justify-between gap-2 border-b border-[var(--borderColor-muted)] bg-[var(--bgColor-muted)] px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 w-1 shrink-0 rounded-full bg-[var(--primary)]" />
            <Link
              href={`/hoc-sinh/${child.studentId}`}
              data-link="true"
              className="min-w-0 truncate text-sm font-semibold text-[var(--fgColor-link)] hover:underline"
            >
              {child.studentName}
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 pl-2.5">
            <small className="truncate text-xs text-[var(--fgColor-muted)]">Phụ huynh: {parentName}</small>
            {child.isPrimary && <Pill tone="butter">Liên hệ chính</Pill>}
          </div>
        </div>
        <ActIcon quiet label="Đóng" icon={XIcon} onClick={onClose} />
      </header>

      <div className="flex flex-col gap-3 p-3.5">
        <Field label="Quan hệ với học sinh">
          <SelectBox
            label="Quan hệ với học sinh"
            value={relation}
            onChange={chooseRelation}
            options={RELATION_OPTIONS}
            disabled={!canManage || pending}
            block
          />
        </Field>

        {canManage && (
          <div className="flex flex-col gap-2 border-t border-[var(--borderColor-muted)] pt-3">
            <Btn block leadingVisual={StarIcon} disabled={child.isPrimary || pending} onClick={makePrimary}>
              {child.isPrimary ? 'Đang là liên hệ chính' : 'Đặt làm liên hệ chính'}
            </Btn>
            <Btn block variant="danger" leadingVisual={UnlinkIcon} disabled={pending} onClick={() => setConfirmUnlink(true)}>
              Gỡ liên kết
            </Btn>
          </div>
        )}

        {error && (
          <Alert inline>
            {error}
          </Alert>
        )}
      </div>

      <ConfirmDialog
        open={confirmUnlink}
        title="Gỡ liên kết này?"
        text={`${parentName} sẽ không còn là phụ huynh của ${child.studentName}. Học sinh và phụ huynh vẫn được giữ lại.`}
        confirmLabel="Gỡ liên kết"
        pending={pending}
        onConfirm={unlink}
        onCancel={() => setConfirmUnlink(false)}
      />
    </div>,
    document.body,
  );
}
