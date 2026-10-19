'use client';

import { Send } from 'lucide-react';
import { useState, useTransition } from 'react';
import { broadcastTelegramAction } from '@/app/(app)/tin-nhan/actions';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter, inputClass, textareaClass } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/primitives';

type Option = { id: number; name: string };

export function BroadcastDialog({
  open,
  canBroadcastAll,
  campuses,
  classes,
  onClose,
  onSuccess,
}: {
  open: boolean;
  canBroadcastAll: boolean;
  campuses: Option[];
  classes: Option[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [scope, setScope] = useState<'all' | 'campus' | 'class'>(canBroadcastAll ? 'all' : campuses.length > 0 ? 'campus' : 'class');
  const [campusId, setCampusId] = useState<number>(campuses[0]?.id ?? 0);
  const [classId, setClassId] = useState<number>(classes[0]?.id ?? 0);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setText('');
    setError(null);
    onClose();
  }

  function handleSend() {
    if (!text.trim()) {
      setError('Vui lòng nhập nội dung thông báo.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const scopeId = scope === 'campus' ? campusId : scope === 'class' ? classId : undefined;
      const res = await broadcastTelegramAction({ scope, scopeId, text });
      if (!res.ok) {
        setError(res.message ?? 'Không gửi được thông báo.');
      } else {
        onSuccess(res.message ?? 'Đã gửi thông báo.');
        reset();
      }
    });
  }

  return (
    <Modal open={open} title="Gửi thông báo chung qua Telegram" subtitle="Gửi tin nhắn đồng loạt tới phụ huynh đã kết nối bot Telegram." onClose={reset} labelledBy="broadcast-title">
      <div className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}

        <Field label="Phạm vi gửi thông báo">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as 'all' | 'campus' | 'class')}
            className={inputClass()}
          >
            {canBroadcastAll && <option value="all">Toàn bộ trung tâm (Tất cả phụ huynh)</option>}
            {campuses.length > 0 && <option value="campus">Theo cơ sở cụ thể</option>}
            {classes.length > 0 && <option value="class">Theo lớp học cụ thể</option>}
          </select>
        </Field>

        {scope === 'campus' && campuses.length > 0 && (
          <Field label="Chọn cơ sở">
            <select
              value={campusId}
              onChange={(e) => setCampusId(Number(e.target.value))}
              className={inputClass()}
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        {scope === 'class' && classes.length > 0 && (
          <Field label="Chọn lớp học">
            <select
              value={classId}
              onChange={(e) => setClassId(Number(e.target.value))}
              className={inputClass()}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Nội dung thông báo (tối đa 3000 ký tự)" error={error ?? undefined}>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={3000}
            placeholder="Ví dụ: Kính gửi quý phụ huynh, trung tâm xin thông báo lịch nghỉ lễ..."
            className={textareaClass(error ?? undefined)}
          />
        </Field>

        <FormFooter>
          <Btn onClick={reset} disabled={pending}>Hủy</Btn>
          <Btn variant="primary" onClick={handleSend} disabled={pending || !text.trim()}>
            {pending ? (
              'Đang gửi…'
            ) : (
              <>
                <Send className="size-4" aria-hidden />
                Gửi thông báo
              </>
            )}
          </Btn>
        </FormFooter>
      </div>
    </Modal>
  );
}
