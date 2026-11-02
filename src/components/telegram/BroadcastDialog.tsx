'use client';

import { PaperAirplaneIcon } from '@primer/octicons-react';
import { useState, useTransition } from 'react';
import { broadcastTelegramAction } from '@/app/(app)/tin-nhan/actions';
import { ComboBox, SelectBox, TextAreaAutoHeight } from '@/components-ui';
import { Btn } from '@/components/ui/Btn';
import { Field, FormFooter } from '@/components/ui/Field';
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
          <SelectBox
            label="Phạm vi gửi thông báo"
            value={scope}
            onChange={(v) => setScope(v as 'all' | 'campus' | 'class')}
            options={[
              ...(canBroadcastAll ? [{ value: 'all', label: 'Toàn bộ trung tâm (Tất cả phụ huynh)' }] : []),
              ...(campuses.length > 0 ? [{ value: 'campus', label: 'Theo cơ sở cụ thể' }] : []),
              ...(classes.length > 0 ? [{ value: 'class', label: 'Theo lớp học cụ thể' }] : []),
            ]}
            block
          />
        </Field>

        {scope === 'campus' && campuses.length > 0 && (
          <Field label="Chọn cơ sở">
            <ComboBox
              label="Chọn cơ sở"
              value={String(campusId)}
              onChange={(v) => {
                if (v) setCampusId(Number(v));
              }}
              options={campuses.map((c) => ({ value: String(c.id), label: c.name }))}
              block
            />
          </Field>
        )}

        {scope === 'class' && classes.length > 0 && (
          <Field label="Chọn lớp học">
            <ComboBox
              label="Chọn lớp học"
              value={String(classId)}
              onChange={(v) => {
                if (v) setClassId(Number(v));
              }}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              block
            />
          </Field>
        )}

        <Field label="Nội dung thông báo (tối đa 3000 ký tự)" error={error ?? undefined}>
          <TextAreaAutoHeight
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={3000}
            placeholder="Ví dụ: Kính gửi quý phụ huynh, trung tâm xin thông báo lịch nghỉ lễ..."
            error={Boolean(error)}
          />
        </Field>

        <FormFooter>
          <Btn onClick={reset} disabled={pending}>Hủy</Btn>
          <Btn
            variant="primary"
            leadingVisual={pending ? undefined : PaperAirplaneIcon}
            loading={pending}
            onClick={handleSend}
            disabled={pending || !text.trim()}
          >
            {pending ? 'Đang gửi…' : 'Gửi thông báo'}
          </Btn>
        </FormFooter>
      </div>
    </Modal>
  );
}
