'use client';

// Thẻ sửa một học sinh của phụ huynh, mở khi bấm vào ô học sinh trên bảng: đổi quan hệ, đặt liên hệ chính, gỡ liên kết.
// Hiện bằng portal ra thân trang để không bị cắt khi bảng cuộn.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { setLinkRelationAction, setPrimaryParentAction, unlinkParentAction } from '@/app/(app)/phu-huynh/actions';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { PARENT_RELATION_LABELS } from '@/lib/parent-labels';
import type { ParentRow } from '@/lib/queries/parents';
import { PARENT_RELATIONS } from '@/lib/validation/student';
import { Alert } from '@/components/ui/primitives';

type ChildLink = ParentRow['children'][number];

const RELATION_OPTIONS = PARENT_RELATIONS.map((r) => ({ value: r, label: PARENT_RELATION_LABELS[r] }));
const WIDTH = 288;

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
  const top = anchor.bottom + 6;

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
      className="fixed z-[60] flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line bg-surface p-4 shadow-lift"
    >
      <div className="min-w-0">
        <Link href={`/hoc-sinh/${child.studentId}`} className="block truncate text-base font-bold text-ink hover:underline">
          {child.studentName}
        </Link>
        <small className="block truncate text-sm text-muted">Phụ huynh: {parentName}</small>
      </div>

      <SelectPanel
        label="Quan hệ với học sinh"
        value={relation}
        onChange={chooseRelation}
        options={RELATION_OPTIONS}
        disabled={!canManage || pending}
        block
      />

      {canManage && (
        <div className="flex flex-col gap-2">
          <Btn block disabled={child.isPrimary || pending} onClick={makePrimary}>
            {child.isPrimary ? 'Đang là liên hệ chính' : 'Đặt làm liên hệ chính'}
          </Btn>
          <Btn block variant="danger" disabled={pending} onClick={() => setConfirmUnlink(true)}>
            Gỡ liên kết
          </Btn>
        </div>
      )}

      {error && (
        <Alert inline>
          {error}
        </Alert>
      )}

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
