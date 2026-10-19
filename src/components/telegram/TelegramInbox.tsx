'use client';

import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { createMyLinkAction, replyToParentAction } from '@/app/(app)/tin-nhan/actions';
import type { Conversation, ThreadMessage } from '@/lib/telegram/service';
import { Btn } from '@/components/ui/Btn';
import { Field, textareaClass } from '@/components/ui/Field';
import { Pill } from '@/components/ui/primitives';
import { EmptyPanel, Notice, Panel } from '@/components/ui/surfaces';
import { Toast, useToast } from '@/components/ui/Toast';
import { TelegramLinkDialog } from './TelegramLinkDialog';

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Kết nối Telegram của chính nhân viên, để nhận thông báo (bài nộp mới...)
export function MyTelegramPanel({ linked }: { linked: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel title="Telegram của bạn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-ink-2">
          {linked ? 'Đã kết nối. Bạn nhận thông báo của hệ thống qua bot Telegram.' : 'Kết nối Telegram để nhận thông báo, ví dụ khi học sinh nộp bài.'}
        </p>
        <Btn onClick={() => setOpen(true)}>{linked ? 'Kết nối thêm máy' : 'Kết nối Telegram'}</Btn>
      </div>
      <TelegramLinkDialog
        open={open}
        title="Kết nối Telegram của bạn"
        subtitle="Mở link trên điện thoại có Telegram rồi bấm Start."
        linked={linked}
        create={createMyLinkAction}
        onClose={() => setOpen(false)}
      />
    </Panel>
  );
}

// Hộp tin với phụ huynh: danh sách cuộc trò chuyện và khung tin của phụ huynh đang chọn (?p=).
// Máy tính: hai cột. Điện thoại: chọn cuộc trò chuyện thì chỉ hiện khung tin, có nút quay lại.
export function TelegramInbox({
  conversations,
  selected,
  thread,
}: {
  conversations: Conversation[];
  selected: Conversation | null;
  thread: ThreadMessage[];
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { message, notify } = useToast();

  function send() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const r = await replyToParentAction(selected.parentId, text);
      if (!r.ok) {
        setError(r.message ?? 'Không gửi được');
        return;
      }
      setText('');
      notify(r.message ?? 'Đã gửi');
      router.refresh();
    });
  }

  if (conversations.length === 0) {
    return <EmptyPanel title="Chưa có tin nhắn nào" hint="Tạo link kết nối Telegram cho phụ huynh ở màn Phụ huynh (nút ⋯ → Kết nối Telegram). Phụ huynh nhắn bot thì tin hiện ở đây." />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 min-[1024px]:grid-cols-[minmax(260px,340px)_1fr]">
      <Panel title="Cuộc trò chuyện" className={selected ? 'max-[1023px]:hidden' : ''}>
        <ul aria-label="Cuộc trò chuyện" className="-mx-2 flex flex-col">
          {conversations.map((c) => (
            <li key={c.parentId}>
              <Link
                href={`/tin-nhan?p=${c.parentId}`}
                aria-current={selected?.parentId === c.parentId ? 'true' : undefined}
                className={`flex min-w-0 flex-col gap-0.5 rounded-xl px-2 py-2.5 hover:bg-stone ${selected?.parentId === c.parentId ? 'bg-stone' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <b className="min-w-0 truncate text-base font-normal text-ink">{c.parentName}</b>
                  <span className="shrink-0 text-xs text-muted">{timeLabel(c.lastAt)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-ink-2">
                    {c.lastDirection === 'out' ? 'Trung tâm: ' : ''}
                    {c.lastText}
                  </span>
                  {c.unread > 0 && <Pill tone="blush">{c.unread} mới</Pill>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>

      {selected ? (
        <Panel
          title={selected.parentName}
          action={
            <Link href="/tin-nhan" className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink min-[1024px]:hidden">
              <ArrowLeft className="size-4" aria-hidden />
              Tất cả
            </Link>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {selected.phone} · {selected.linked ? 'Đang kết nối Telegram' : 'Đã ngừng nhận tin hoặc chưa kết nối'}
            </p>
            <ol aria-label="Tin nhắn" className="flex max-h-[56dvh] flex-col gap-2 overflow-y-auto rounded-[var(--radius-ctl)] bg-bg p-3">
              {thread.map((m) => (
                <li key={m.id} className={`flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-3 py-2 ${m.direction === 'out' ? 'self-end bg-mint text-mint-ink' : 'self-start bg-surface text-ink shadow-card'}`}>
                  <span className="whitespace-pre-wrap text-base [overflow-wrap:anywhere]">{m.text}</span>
                  <span className="text-xs opacity-75">
                    {timeLabel(m.createdAt)}
                    {m.direction === 'out' && m.senderName ? ` · ${m.senderName}` : ''}
                    {m.direction === 'out' && !m.delivered ? ' · chưa gửi được' : ''}
                  </span>
                </li>
              ))}
            </ol>
            {selected.linked ? (
              <div className="flex flex-col gap-2">
                <Field label="Trả lời" error={error ?? undefined}>
                  <textarea name="text" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className={textareaClass(error ?? undefined)} />
                </Field>
                <div className="flex justify-end">
                  <Btn variant="primary" onClick={send} disabled={pending || text.trim() === ''} className="max-[767px]:w-full">
                    <Send className="size-4" aria-hidden />
                    {pending ? 'Đang gửi…' : 'Gửi qua Telegram'}
                  </Btn>
                </div>
              </div>
            ) : (
              <Notice>Phụ huynh chưa kết nối hoặc đã gõ /huy. Tạo link kết nối mới ở màn Phụ huynh để nhắn lại.</Notice>
            )}
          </div>
        </Panel>
      ) : (
        <div className="max-[1023px]:hidden">
          <EmptyPanel title="Chọn một cuộc trò chuyện" hint="Tin mới của phụ huynh có nhãn đỏ." />
        </div>
      )}
      <Toast message={message} />
    </div>
  );
}
