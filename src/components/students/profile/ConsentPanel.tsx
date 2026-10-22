'use client';

// Đồng ý của phụ huynh trong hồ sơ học sinh (P35.12). Mỗi mục đích một dòng: trạng thái, ai đồng ý, qua kênh nào, lúc nào.
// Máy tính: nút ⋯ mở menu có icon. Điện thoại: hàng nút có chữ. Rút lại luôn qua hộp xác nhận.
import { FileCheck, Send, Undo2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { loadConsentsAction, recordConsentAction, requestConsentAction, withdrawConsentAction, type ConsentLoad } from '@/app/(app)/hoc-sinh/consent-actions';
import { CONSENT_LABELS, CONSENT_PURPOSES, CONSENT_STATUS_LABELS, CONSENT_TERMS, consentStatus, type ConsentPurpose, type ConsentStatus } from '@/lib/consent';
import { vnDateTimeLabel } from '@/lib/datetime';
import { Btn } from '@/components/ui/Btn';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Chip, ChipGroup } from '@/components/ui/controls';
import { Field, FormFooter, textareaClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert, Pill, type Tone } from '@/components/ui/primitives';
import { RowMenu, type RowMenuItem } from '@/components/ui/RowMenu';
import { SelectPanel } from '@/components/ui/SelectPanel';
import { Notice, Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';

const TONE: Record<ConsentStatus, Tone> = { granted: 'mint', refused: 'blush', withdrawn: 'butter', none: 'stone' };
const CHANNEL: Record<string, string> = { telegram: 'qua Telegram', staff: 'nhân viên ghi nhận', demo: 'tài khoản học thử' };

export function ConsentPanel({ studentId }: { studentId: number }) {
  const { message, notify } = useToast();
  const [data, setData] = useState<ConsentLoad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [pending, start] = useTransition();
  const [recording, setRecording] = useState<ConsentPurpose | null>(null);
  const [withdrawing, setWithdrawing] = useState<ConsentPurpose | null>(null);

  useEffect(() => {
    let alive = true;
    loadConsentsAction(studentId).then((r) => {
      if (!alive) return;
      if (!r.ok) setError(r.message);
      else setData(r);
    });
    return () => {
      alive = false;
    };
  }, [studentId, reload]);

  function run(task: () => Promise<{ ok: boolean; message: string }>) {
    start(async () => {
      const r = await task();
      notify(r.message);
      if (r.ok) setReload((n) => n + 1);
    });
  }

  const linkedCount = data?.parents.filter((p) => p.linked).length ?? 0;

  return (
    <Panel title="Đồng ý của phụ huynh" className="flex flex-col gap-3">
      <p className="text-base text-ink-2">Học sinh chỉ ghi âm được khi phụ huynh đã đồng ý. Trẻ từ 7 tuổi sẽ được hỏi thêm trong khu học sinh.</p>
      {error && <Alert inline>{error}</Alert>}
      {!data && !error && <div className="h-16 animate-pulse rounded-[var(--radius-ctl)] bg-stone" aria-busy="true" aria-label="Đang tải" />}
      {data && (
        <ul className="flex flex-col">
          {CONSENT_PURPOSES.map((purpose) => {
            const { status, row } = consentStatus(data.entries, purpose);
            const entry = row ? data.entries.find((e) => e === row) : undefined;
            const menu: RowMenuItem[] = [
              { kind: 'action', label: 'Gửi yêu cầu qua Telegram', icon: Send, onSelect: () => run(() => requestConsentAction(studentId, purpose)), disabled: linkedCount === 0, disabledHint: 'Chưa có phụ huynh kết nối Telegram' },
              { kind: 'action', label: 'Ghi nhận đồng ý', icon: FileCheck, onSelect: () => setRecording(purpose) },
              ...(status === 'granted' ? [{ kind: 'action' as const, label: 'Rút lại đồng ý', icon: Undo2, danger: true, onSelect: () => setWithdrawing(purpose) }] : []),
            ];
            return (
              <li key={purpose} aria-label={CONSENT_LABELS[purpose]} className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="text-base font-semibold text-ink">{CONSENT_LABELS[purpose]}</b>
                    <Pill tone={TONE[status]}>{CONSENT_STATUS_LABELS[status]}</Pill>
                  </span>
                  {entry ? (
                    <span className="text-sm text-muted">
                      {entry.parentName ? `${entry.parentName} · ` : ''}
                      {CHANNEL[entry.channel] ?? entry.channel} · {vnDateTimeLabel(entry.decidedAt)}
                      {entry.withdrawnAt ? ` · rút lại ${vnDateTimeLabel(entry.withdrawnAt)}` : ''}
                      {purpose === 'voice_teacher_review' && status === 'granted' ? (entry.childAgreedAt ? ' · con đã đồng ý' : '') : ''}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </span>
                  ) : (
                    <span className="text-sm text-muted">Chưa hỏi phụ huynh.</span>
                  )}
                </div>
                {data.canEdit && (
                  <>
                    <div className="max-[767px]:hidden">
                      <RowMenu label={`Thao tác: ${CONSENT_LABELS[purpose]}`} items={menu} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 min-[768px]:hidden">
                      <Btn onClick={() => run(() => requestConsentAction(studentId, purpose))} disabled={pending || linkedCount === 0}>
                        <Send className="size-4" aria-hidden />
                        Gửi Telegram
                      </Btn>
                      {status === 'granted' ? (
                        <Btn variant="danger" onClick={() => setWithdrawing(purpose)} disabled={pending}>
                          <Undo2 className="size-4" aria-hidden />
                          Rút lại
                        </Btn>
                      ) : (
                        <Btn onClick={() => setRecording(purpose)} disabled={pending}>
                          <FileCheck className="size-4" aria-hidden />
                          Ghi nhận
                        </Btn>
                      )}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data && data.canEdit && linkedCount === 0 && (
        <Notice>Chưa có phụ huynh nào kết nối Telegram nên chưa gửi yêu cầu qua bot được. Có thể ghi nhận đồng ý bằng giấy hoặc qua điện thoại.</Notice>
      )}

      {data && recording && (
        <RecordDialog
          purpose={recording}
          parents={data.parents}
          onClose={() => setRecording(null)}
          onSave={(v) =>
            run(async () => {
              const r = await recordConsentAction({ studentId, purpose: recording, ...v });
              if (r.ok) setRecording(null);
              return r;
            })
          }
          pending={pending}
        />
      )}

      <ConfirmDialog
        open={!!withdrawing}
        title="Rút lại đồng ý?"
        text={withdrawing ? `${CONSENT_LABELS[withdrawing]}: học sinh sẽ không ghi âm được nữa. Bản ghi đã có giữ nguyên cho tới khi phụ huynh yêu cầu xoá.` : ''}
        confirmLabel="Rút lại"
        pending={pending}
        onCancel={() => setWithdrawing(null)}
        onConfirm={() => {
          const p = withdrawing;
          if (!p) return;
          run(async () => {
            const r = await withdrawConsentAction(studentId, p);
            setWithdrawing(null);
            return r;
          });
        }}
      />
      <Toast message={message} />
    </Panel>
  );
}

function RecordDialog({
  purpose,
  parents,
  onClose,
  onSave,
  pending,
}: {
  purpose: ConsentPurpose;
  parents: { id: number; name: string }[];
  onClose: () => void;
  onSave: (v: { parentId: number; granted: boolean; note: string }) => void;
  pending: boolean;
}) {
  const [parentId, setParentId] = useState(parents[0] ? String(parents[0].id) : '');
  const [granted, setGranted] = useState(true);
  const [note, setNote] = useState('');
  return (
    <Modal open title="Ghi nhận ý kiến phụ huynh" subtitle={CONSENT_LABELS[purpose]} onClose={onClose} labelledBy="consent-record-title">
      <div className="flex flex-col gap-4">
        <Notice>{CONSENT_TERMS[purpose]}</Notice>
        {parents.length === 0 ? (
          <Alert inline>Học sinh chưa có phụ huynh. Thêm phụ huynh ở tab Phụ huynh trước.</Alert>
        ) : (
          <>
            <Field label="Phụ huynh">
              <SelectPanel label="Phụ huynh đồng ý" block value={parentId} onChange={setParentId} options={parents.map((p) => ({ value: String(p.id), label: p.name }))} />
            </Field>
            <Field label="Ý kiến">
              <ChipGroup label="Ý kiến của phụ huynh">
                <Chip selected={granted} onClick={() => setGranted(true)}>
                  Đồng ý
                </Chip>
                <Chip selected={!granted} onClick={() => setGranted(false)}>
                  Không đồng ý
                </Chip>
              </ChipGroup>
            </Field>
            <Field label="Bằng chứng" hint="Ví dụ: Đã ký giấy đồng ý ngày 22/10, lưu ở hồ sơ giấy">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} aria-label="Bằng chứng đồng ý" className={textareaClass()} />
            </Field>
          </>
        )}
        <FormFooter>
          <Btn onClick={onClose}>Huỷ</Btn>
          <Btn variant="primary" disabled={pending || parents.length === 0} onClick={() => onSave({ parentId: Number(parentId), granted, note })}>
            {pending ? 'Đang lưu…' : 'Lưu'}
          </Btn>
        </FormFooter>
      </div>
    </Modal>
  );
}
